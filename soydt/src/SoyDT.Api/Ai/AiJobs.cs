using SoyDT.Domain;

namespace SoyDT.Api.Ai;

/// Mutable server-side state of a single agent run.
internal sealed class JobState
{
    public string Status = "running";
    public readonly List<ToolTrace> ToolCalls = [];
    public string Text = "";
    public string Detail = "";
}

/// Process-wide registry of in-flight AI agent runs — ported from the
/// original app's `web/src/ai/jobs.rs::AiJobs`. A run reports progress
/// through an `AiJobHandle`; the report dialog long-polls `Wait` to render
/// tool calls in real time instead of the client re-fetching on a timer.
/// Registered as a singleton.
public sealed class AiJobs
{
    private readonly Lock _lock = new();
    private readonly Dictionary<ulong, JobState> _jobs = [];
    private ulong _counter;

    /// Register a fresh running job and return the handle the agent updates.
    public AiJobHandle Create()
    {
        ulong id;
        lock (_lock)
        {
            id = ++_counter;
            // Bound memory: drop finished jobs once the map grows.
            if (_jobs.Count > 32)
            {
                foreach (var key in _jobs.Where(kv => kv.Value.Status != "running").Select(kv => kv.Key).ToList())
                {
                    _jobs.Remove(key);
                }
            }
            _jobs[id] = new JobState();
        }
        return new AiJobHandle(this, id);
    }

    internal void Mutate(ulong id, Action<JobState> mutation)
    {
        lock (_lock)
        {
            if (_jobs.TryGetValue(id, out var job))
            {
                mutation(job);
            }
        }
    }

    private JobSnapshot? Snapshot(ulong id, int cursor)
    {
        lock (_lock)
        {
            if (!_jobs.TryGetValue(id, out var job)) return null;
            var newCalls = job.ToolCalls.Skip(cursor).ToList();
            return new JobSnapshot(job.Status, job.ToolCalls.Count, newCalls, job.Text, job.Detail);
        }
    }

    /// Long-poll: resolves as soon as the job has progressed past `cursor`
    /// (more tool calls) or finished; otherwise holds for up to ~20s,
    /// checking every 500ms, then returns the current snapshot so the
    /// client re-polls. `null` if the job is unknown. A plain poll loop
    /// (rather than the original's `Notify`-based wake) — at our scale
    /// (a handful of concurrent report runs) the 500ms latency this adds
    /// to "tool call just landed" is immaterial for an LLM round-trip.
    public async Task<JobSnapshot?> Wait(ulong id, int cursor)
    {
        for (var i = 0; i < 40; i++)
        {
            var snap = Snapshot(id, cursor);
            if (snap is null) return null;
            if (snap.Status != "running" || snap.Cursor > cursor) return snap;
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }
        return Snapshot(id, cursor);
    }
}

/// Writer handle for one job, held by the spawned agent task.
public sealed class AiJobHandle(AiJobs jobs, ulong id)
{
    public ulong Id => id;

    public void PushTool(string name, string arguments) =>
        jobs.Mutate(id, job => job.ToolCalls.Add(new ToolTrace(name, arguments)));

    public void Finish(string text) =>
        jobs.Mutate(id, job => { job.Status = "done"; job.Text = text; });

    public void Fail(string detail) =>
        jobs.Mutate(id, job => { job.Status = "error"; job.Detail = detail; });
}

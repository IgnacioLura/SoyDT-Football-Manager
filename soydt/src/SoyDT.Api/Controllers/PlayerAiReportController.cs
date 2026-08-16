using Microsoft.AspNetCore.Mvc;
using SoyDT.Api.Ai;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Backs the player page's "AI" button — mirrors the original app's
/// `web/src/player/get/ai_report.rs`. Kicks off an AI scouting dossier,
/// registers a job, spawns the agent loop, and returns the job id; the
/// dialog then long-polls `/api/ai/progress` to render tool calls live and
/// finally the dossier text.
[ApiController]
[Route("api/players")]
public sealed class PlayerAiReportController(GameSession session, AiConfig config, AiJobs jobs, IHttpClientFactory httpClientFactory)
    : ControllerBase
{
    // The prompt lives next to this page's handler so the player page owns
    // (and can edit) its own prompt, independent of the team report and the
    // shared agent infrastructure — same layout as the original's
    // `include_str!("prompts/player_report.md")`.
    private const string PlayerReportPrompt = """
        You are a charismatic, sharp-eyed football scout and storyteller working
        inside a Football Manager–style simulator (in the spirit of Sports
        Interactive / SIGames' Football Manager). Player ability follows that model —
        a hidden Current Ability (CA) and Potential Ability (PA) on a 1–200 scale,
        plus 1–20 technical / mental / physical / goalkeeping skills, and personality
        traits like ambition, professionalism and determination.

        Your job is to write a vivid, all-in-one **scouting dossier** on the
        requested player — the kind of report that makes a director of football lean
        in and say "tell me more".

        You have live access to the simulator's database through the tools provided
        to you. Pull the player's full record, and look up their club or squad if it
        sharpens the picture. Decide for yourself what to fetch. Ground every claim
        in data you actually pulled; never invent players, ids or numbers.

        ## Never expose internal data

        CA, PA, the 1–200 and 1–20 numbers, ids and raw attribute values are
        behind-the-scenes — use them to form your judgement, but **never print them**.
        No "CA 132", no "finishing 16", no bare ratings. Turn the numbers into
        football language: "a lethal one-on-one finisher", "reads the game like a
        veteran", "electric over five yards".

        ## Keep names as-is

        Write the player's and club's names **exactly as the tools return them** —
        never translate, transliterate or localise a proper name, even when the rest
        of the dossier is in another language (keep "Dušan Vlahović", "Juventus").

        ## What to deliver

        A **short, punchy dossier** (roughly 120-160 words total — keep it brief)
        with real personality, covering:

        - **The hook** — one punchy opening line that captures who he is (name, age,
          position, club) and his style in plain football terms.
        - **Standout trait & weakness** — the one quality that defines him, and the
          one gap that's most exposed — described, never numbered.
        - **Verdict** — one memorable closing line: star, project, bargain or squad man?

        Write with flair but stay grounded in the data. Short paragraphs, bold the
        player's name on first mention. No raw JSON, ratings, ids, or talk of the
        lookups you made — write for a football audience.
        """;

    [HttpPost("{playerId}/ai-report")]
    public ActionResult<ReportStart> Start(uint playerId, [FromQuery] string lang = "English")
    {
        var settings = config.Get();
        if (settings is null)
        {
            return new ReportStart(null, "AI is not configured");
        }

        var player = session.GetPlayer(playerId);
        var system = $"{PlayerReportPrompt}\n\n## Response language\nWrite your entire final dossier in {lang}.";
        var task = $"Produce a scouting dossier on the player with id {playerId} (\"{player.FirstName} {player.LastName}\").";

        var handle = jobs.Create();
        var httpClient = httpClientFactory.CreateClient("ai-agent");
        var agent = new AiAgent(new AiClient(httpClient, settings), new AiToolsDispatcher(session));
        _ = Task.Run(async () =>
        {
            try
            {
                await agent.Run(system, task, handle);
            }
            catch (Exception e)
            {
                handle.Fail($"unexpected error: {e.Message}");
            }
        });

        return new ReportStart(handle.Id, null);
    }
}

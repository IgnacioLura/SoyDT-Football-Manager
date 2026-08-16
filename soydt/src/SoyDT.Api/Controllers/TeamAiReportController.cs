using Microsoft.AspNetCore.Mvc;
using SoyDT.Api.Ai;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Backs the squad page's "AI" button — mirrors the original app's
/// `web/src/teams/get/ai_report.rs`. The original keys this report by
/// `club_id` (the AI tools operate on clubs, which field Main/B/youth
/// teams); this route stays consistent with the rest of the API's
/// `{teamId}`-keyed routes and resolves to the owning club internally via
/// `TeamDetail.ClubId`.
[ApiController]
[Route("api/teams")]
public sealed class TeamAiReportController(GameSession session, AiConfig config, AiJobs jobs, IHttpClientFactory httpClientFactory)
    : ControllerBase
{
    private const string TeamReportPrompt = """
        You are a sharp, experienced football analyst working inside a Football
        Manager–style simulator (in the spirit of Sports Interactive / SIGames'
        Football Manager). Clubs, squads, player abilities and attributes all follow
        that model — a hidden Current Ability (CA) and Potential Ability (PA) on a
        1–200 scale, plus 1–20 technical / mental / physical / goalkeeping skills.

        Your job is to produce a scouting-style **report about the requested team**.

        You have live access to the simulator's database through the tools provided
        to you. Decide for yourself which tools to call, how many times, and in what
        order — whatever it takes to build a well-grounded picture. Ground every
        claim in data you actually fetched; never invent players, ids or numbers. If
        a lookup returns nothing, say so rather than guessing.

        ## Keep names as-is

        Write player and club names **exactly as the tools return them**. Never
        translate, transliterate or localise a proper name — even when the rest of
        the report is written in another language, the names stay in their original
        form (e.g. keep "Dušan Vlahović" and "Juventus" verbatim).

        ## Never expose internal data

        CA, PA, the 1–200 and 1–20 numbers, player/club ids and raw attribute values
        are behind-the-scenes data — use them to form your judgement, but **never
        print them in the report**. Do not write things like "CA 136 / PA 146",
        "finishing 17", or any bare rating. Translate the numbers into plain football
        language instead: "a clinical finisher", "raw but with a very high ceiling",
        "among the best passers in the squad".

        ## What to deliver

        Write a tight report on the team (roughly 250-400 words) covering:

        - **Squad overview** — the club's standing and the shape of its senior team.
        - **Key players** — 3-5 names that define the side, with a one-line reason
          each, described in words rather than numbers.
        - **Prospects** — young players with clear room to grow into much better
          players than they are today.
        - **Weaknesses** — the thinnest positions or clearest quality gaps.
        - **Verdict** — one short paragraph: where this squad can realistically go.

        Use short paragraphs and bold player names. Do not dump raw JSON, ratings or
        ids, and do not describe the lookups you made — write for a football audience.
        """;

    [HttpPost("{teamId}/ai-report")]
    public ActionResult<ReportStart> Start(uint teamId, [FromQuery] string lang = "English")
    {
        var settings = config.Get();
        if (settings is null)
        {
            return new ReportStart(null, "AI is not configured");
        }

        var team = session.GetTeam(teamId);
        var system = $"{TeamReportPrompt}\n\n## Response language\nWrite your entire final report in {lang}.";
        var task = $"Produce a scouting report on the team with id {teamId} (\"{team.Name}\"), club id {team.ClubId}.";

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

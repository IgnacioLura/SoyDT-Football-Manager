using System.Text.Json;
using System.Text.Json.Nodes;
using SoyDT.Domain;

namespace SoyDT.Api.Ai;

public sealed record DailyEventResult(string Text, int MoraleDelta);

/// Generates one short random "unexpected event" story + small morale delta
/// (-2..2) for a single player via the same OpenAI-compatible endpoint as the
/// AI report features — see `soydt/prompts/daily_event.md` for the prompt
/// source of truth (keep both in sync) and this feature's addendum to
/// `docs/superpowers/specs/2026-08-16-dt-random-events-design.md`. Retries
/// once on a request failure or unparseable reply; gives up silently after
/// that — a missing daily event is never worth blocking or failing
/// day-processing over.
public sealed class DailyAiEventGenerator(HttpClient http, LlmSettings settings)
{
    private const string PromptTemplate = """
        Sos un periodista deportivo escribiendo una breve nota de color sobre un jugador, para un simulador de fútbol. Basate en el contexto reciente de abajo para que la nota sea creíble y específica — no genérica ni desconectada de los datos.

        Jugador: {nombre} ({posicion}) — {equipo}
        Temporada: {temporada}
        Últimos partidos del equipo: {ultimos_partidos}

        Escribí UN evento inesperado en 2 o 3 oraciones completas y bien escritas (entre 35 y 55 palabras en total), con gramática correcta y algo de color periodístico — no una frase suelta ni un fragmento. Que sea coherente con el contexto (racha positiva, mal momento, lesión, rumor de fichaje, gesto con un compañero o el cuerpo técnico, anécdota fuera de la cancha, etc). Puede ser positivo, negativo o neutro. Asigná un "delta" de moral entre -2 y 2 según el tono.

        Ejemplos de tono y extensión esperados (no copies el contenido, son solo referencia de estilo):
        - "Tras dos derrotas seguidas, {nombre} se quedó después del entrenamiento para trabajar solo en definición. El cuerpo técnico destacó su actitud frente al resto del plantel, y el vestuario lo recibió con aplausos."
        - "Un rumor de la prensa española vincula a {nombre} con un club de la Liga, algo que ya generó comentarios entre sus compañeros. Todavía no hay nada oficial, pero la novela recién empieza."

        Respondé SOLO con JSON válido, sin texto adicional ni markdown, con este formato exacto:
        {"text": "<evento en español, 2-3 oraciones>", "delta": <entero entre -2 y 2>}
        """;

    public async Task<DailyEventResult?> Generate(
        string playerName, string position, string teamName, string seasonSummary, string recentMatchesSummary)
    {
        var prompt = PromptTemplate
            .Replace("{nombre}", playerName)
            .Replace("{posicion}", position)
            .Replace("{equipo}", teamName)
            .Replace("{temporada}", seasonSummary)
            .Replace("{ultimos_partidos}", recentMatchesSummary);

        for (var attempt = 0; attempt < 2; attempt++)
        {
            var result = await TryOnce(prompt);
            if (result is not null) return result;
        }
        return null;
    }

    private async Task<DailyEventResult?> TryOnce(string prompt)
    {
        var client = new AiClient(http, settings);
        ChatTurn turn;
        try
        {
            turn = await client.Chat([new JsonObject { ["role"] = "user", ["content"] = prompt }], []);
        }
        catch (AiClientException)
        {
            return null;
        }

        if (turn.Content is not { } content) return null;

        try
        {
            using var doc = JsonDocument.Parse(ExtractJsonObject(content));
            var text = doc.RootElement.GetProperty("text").GetString();
            var delta = doc.RootElement.GetProperty("delta").GetInt32();
            return string.IsNullOrWhiteSpace(text) ? null : new DailyEventResult(text, Math.Clamp(delta, -2, 2));
        }
        catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException)
        {
            return null;
        }
    }

    // Small local models sometimes wrap the JSON in a code fence or add a
    // stray sentence around it despite the instruction — take the outermost
    // {...} span instead of failing on anything that isn't a bare object.
    private static string ExtractJsonObject(string content)
    {
        var start = content.IndexOf('{');
        var end = content.LastIndexOf('}');
        return start >= 0 && end > start ? content[start..(end + 1)] : content;
    }
}

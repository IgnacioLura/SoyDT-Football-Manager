using Microsoft.Data.Sqlite;

namespace SoyDT.Engine;

/// SQLite-backed storage for a single <see cref="GameSession.SaveSnapshot"/>
/// — this app has no multi-tenancy, so there is exactly one save slot
/// (`id = 1`), upserted on every autosave. Owns all disk I/O; `GameSession`
/// itself has no idea SQLite exists (see its `Mutated` event, which
/// `SoyDT.Api`'s startup wiring subscribes to `Save` with).
public sealed class SaveGameStore
{
    private readonly string _connectionString;

    public SaveGameStore(string dbPath)
    {
        var dir = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        _connectionString = $"Data Source={dbPath}";

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS save_slots (
                id INTEGER PRIMARY KEY,
                data BLOB NOT NULL,
                my_club_id INTEGER NULL,
                saved_at TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();
    }

    public void Save(GameSession.SaveSnapshot snapshot)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO save_slots (id, data, my_club_id, saved_at)
            VALUES (1, $data, $myClubId, $savedAt)
            ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                my_club_id = excluded.my_club_id,
                saved_at = excluded.saved_at;
            """;
        command.Parameters.AddWithValue("$data", Convert.FromBase64String(snapshot.DataBase64));
        command.Parameters.AddWithValue("$myClubId", (object?)snapshot.MyClubId ?? DBNull.Value);
        command.Parameters.AddWithValue("$savedAt", DateTimeOffset.UtcNow.ToString("O"));
        command.ExecuteNonQuery();
    }

    /// Returns null if no save exists yet — a fresh volume/first run.
    public GameSession.SaveSnapshot? TryLoad()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT data, my_club_id FROM save_slots WHERE id = 1;";
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        var data = (byte[])reader["data"];
        var myClubIdValue = reader["my_club_id"];
        uint? myClubId = myClubIdValue is DBNull ? null : (uint)(long)myClubIdValue;
        return new GameSession.SaveSnapshot(Convert.ToBase64String(data), myClubId);
    }
}

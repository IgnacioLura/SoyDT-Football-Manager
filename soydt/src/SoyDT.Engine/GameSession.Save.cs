namespace SoyDT.Engine;

public sealed partial class GameSession
{
    /// Snapshot of everything a save needs to reconstruct this session:
    /// the serialized world plus the one piece of .NET-side session state
    /// (`MyClubId`) that doesn't live inside `SimulatorData` at all.
    public sealed record SaveSnapshot(string DataBase64, uint? MyClubId);

    /// Serializes the currently published world. Throws the same
    /// "no_active_game" error as any other read if nothing has been
    /// created yet — callers (the autosave trigger) only call this after a
    /// mutation that requires a game to already exist.
    public SaveSnapshot Save() => WithGame((e, h) => new SaveSnapshot(e.SaveGame(h), MyClubId));

    /// Replaces the current world (if any) with one rebuilt from a
    /// previously persisted <see cref="SaveSnapshot"/> — same
    /// create-then-publish shape as <see cref="CreateNewGame"/>, so a load
    /// can't race a concurrent mutation.
    public void LoadFromSnapshot(SaveSnapshot snapshot)
    {
        lock (_writeGate)
        {
            var next = engine.LoadGame(snapshot.DataBase64);
            _myClubId = snapshot.MyClubId;
            Publish(next)?.Dispose();
        }
    }
}

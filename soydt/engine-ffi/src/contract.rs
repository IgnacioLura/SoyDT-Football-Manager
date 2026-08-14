//! Shared envelope + panic-safety helpers. Every JSON-returning export in
//! this crate goes through [`run_guarded`] so a Rust panic inside the engine
//! (e.g. an unexpected data shape from a future `open-football` upstream
//! change) turns into an `{"ok":false,"error":...}` response instead of
//! unwinding across the `extern "C"` boundary, which is undefined behavior.

use serde::Serialize;
use std::panic::{self, AssertUnwindSafe};

/// Bump whenever a JSON shape returned by any `engine_*` export changes in a
/// way that isn't purely additive (field removed/renamed/retyped). `SoyDT.Engine`
/// checks this against its own compiled-in expectation at startup.
pub const CONTRACT_VERSION: u32 = 1;

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
}

#[derive(Serialize)]
struct Envelope<T: Serialize> {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<ErrorBody>,
}

/// Runs `f`, catching both ordinary `Err(...)` returns and Rust panics, and
/// always produces a well-formed envelope JSON string. `code` identifies the
/// failure kind machine-side (`"panic"` vs whatever `f` returns via `Err`).
pub fn run_guarded<T, E>(op_name: &'static str, f: impl FnOnce() -> Result<T, E>) -> String
where
    T: Serialize,
    E: std::fmt::Display,
{
    let result = panic::catch_unwind(AssertUnwindSafe(f));

    let envelope = match result {
        Ok(Ok(data)) => Envelope {
            ok: true,
            data: Some(data),
            error: None,
        },
        Ok(Err(e)) => Envelope {
            ok: false,
            data: None,
            error: Some(ErrorBody {
                code: "engine_error",
                message: e.to_string(),
            }),
        },
        Err(panic) => {
            let message = panic
                .downcast_ref::<&str>()
                .map(|s| s.to_string())
                .or_else(|| panic.downcast_ref::<String>().cloned())
                .unwrap_or_else(|| format!("{op_name} panicked with a non-string payload"));
            Envelope {
                ok: false,
                data: None,
                error: Some(ErrorBody {
                    code: "panic",
                    message,
                }),
            }
        }
    };

    // Serialization of our own envelope must not fail; if it somehow does,
    // fall back to a minimal hand-written JSON string rather than unwinding.
    serde_json::to_string(&envelope).unwrap_or_else(|e| {
        format!(r#"{{"ok":false,"error":{{"code":"serialize_failed","message":"{e}"}}}}"#)
    })
}

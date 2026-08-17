//! Save/load: serializes the whole `SimulatorData` game-world graph to bytes
//! and back, so `SoyDT.Engine` can persist the in-memory game across process
//! restarts (see `soydt/engine-ffi/CONTRACT.md`). Rust is the only side that
//! ever holds a live `SimulatorData`, so it's also the only side that can
//! serialize/deserialize it — .NET only ever handles the opaque base64
//! blob and decides *when* to call these two exports (autosave/autoload
//! orchestration, SQLite storage) is out of scope here.
//!
//! Wire format: `bincode` (compact, no schema drift tolerance — matches
//! `CONTRACT_VERSION` semantics: a save taken under one contract version
//! isn't guaranteed to load under another) over the raw `SimulatorData`
//! bytes, then base64-encoded so it can travel through this crate's
//! existing string-envelope protocol instead of adding a second binary-
//! buffer FFI mechanism.
//!
//! `SimulatorData.indexes` is `#[serde(skip)]` (a rebuildable cache, see
//! `open-football`'s `data.rs`), so every load must rebuild it the same way
//! `SimulatorData::new` does before the handle is usable.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::{read, to_owned_ptr};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use core::SimulatorData;
use core::shared::SimulatorDataIndexes;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct SaveResult {
    data_base64: String,
}

/// Serializes `handle`'s current `SimulatorData` to bincode bytes, base64-
/// encodes them, and returns them as the `data` field of the standard JSON
/// envelope (a plain string). Free the returned pointer with `free_string`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game`,
/// `engine_create_scoped_game`, or `engine_load_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_save_game(handle: *mut GameHandle) -> *mut c_char {
    let json = run_guarded("engine_save_game", || -> Result<SaveResult, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let bytes = bincode::serialize(game.data())
            .map_err(|e| format!("bincode serialize failed: {e}"))?;

        Ok(SaveResult {
            data_base64: BASE64.encode(bytes),
        })
    });

    to_owned_ptr(json)
}

/// Base64-decodes `bytes_base64`, bincode-deserializes it into a
/// `SimulatorData`, rebuilds the `indexes` cache (skipped by serde, see
/// module docs), and wraps the result in a fresh `GameHandle` — same
/// construction as `engine_create_game`.
///
/// Returns null if decoding/deserializing fails or panics; matches
/// `engine_create_game`'s null-on-panic convention since there's no live
/// handle yet to attach an error envelope to.
///
/// # Safety
/// `bytes_base64` must be a valid NUL-terminated C string. The returned
/// pointer, if non-null, must eventually be passed to `engine_free_game`
/// exactly once, and to no other function after that.
#[unsafe(no_mangle)]
pub extern "C" fn engine_load_game(bytes_base64: *const c_char) -> *mut GameHandle {
    if bytes_base64.is_null() {
        return std::ptr::null_mut();
    }
    let b64 = unsafe { read(bytes_base64) };

    let result = std::panic::catch_unwind(|| -> Result<SimulatorData, String> {
        let bytes = BASE64
            .decode(b64.as_bytes())
            .map_err(|e| format!("base64 decode failed: {e}"))?;
        let mut data: SimulatorData = bincode::deserialize(&bytes)
            .map_err(|e| format!("bincode deserialize failed: {e}"))?;

        // `indexes` is skipped by serde — rebuild it exactly like
        // `SimulatorData::new` does before the handle is handed back.
        let mut indexes = SimulatorDataIndexes::new();
        indexes.refresh(&data);
        data.indexes = Some(indexes);

        Ok(data)
    });

    match result {
        Ok(Ok(data)) => Box::into_raw(Box::new(GameHandle::from_data(data))),
        _ => std::ptr::null_mut(),
    }
}

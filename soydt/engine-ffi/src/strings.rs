//! C-string marshalling helpers shared by every export.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;

/// Reads a caller-owned, NUL-terminated UTF-8 string. Lossy on invalid UTF-8
/// rather than erroring — matches `ffi-spike`'s original behavior and keeps
/// this a pure read (the pointer's lifetime/ownership stays with the caller).
///
/// # Safety
/// `ptr` must be a valid pointer to a NUL-terminated C string for the
/// duration of this call, or null (in which case an empty string is used).
pub unsafe fn read(ptr: *const c_char) -> String {
    if ptr.is_null() {
        return String::new();
    }
    unsafe { CStr::from_ptr(ptr) }.to_string_lossy().into_owned()
}

/// Hands a freshly-allocated string to the caller as an owned `*mut c_char`.
/// Every pointer returned by any `engine_*`/`simulate_*` export must be
/// released via [`free`] (exported as `free_string`) — never by the caller's
/// own allocator.
pub fn to_owned_ptr(s: String) -> *mut c_char {
    // A NUL byte can't appear in valid JSON output, so this only fails on
    // malformed input; falling back to an escaped placeholder keeps the
    // contract "always returns a valid string" rather than propagating a
    // second failure mode through a raw pointer.
    CString::new(s)
        .unwrap_or_else(|_| CString::new("{\"ok\":false,\"error\":{\"code\":\"nul_in_output\",\"message\":\"internal string contained an embedded NUL\"}}").unwrap())
        .into_raw()
}

/// Frees a pointer previously returned by this crate.
///
/// # Safety
/// `ptr` must have been returned by one of this crate's exports and not
/// already freed.
pub fn free(ptr: *mut c_char) {
    if ptr.is_null() {
        return;
    }
    unsafe {
        drop(CString::from_raw(ptr));
    }
}

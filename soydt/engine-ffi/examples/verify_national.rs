//! Ad-hoc verification for the countries/squad + countries/schedule
//! "empty array" investigation. Not part of the shipped crate — run with
//! `cargo run --release --example verify_national`.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;

unsafe extern "C" {
    fn engine_create_scoped_game(country_codes_json: *const c_char) -> *mut std::ffi::c_void;
    fn engine_process_days(handle: *mut std::ffi::c_void, days: u32) -> *mut c_char;
    fn engine_get_countries(handle: *mut std::ffi::c_void) -> *mut c_char;
    fn engine_get_national_squad(handle: *mut std::ffi::c_void, country_id: u32, u21: bool) -> *mut c_char;
    fn engine_get_national_schedule(handle: *mut std::ffi::c_void, country_id: u32, u21: bool) -> *mut c_char;
    fn free_string(s: *mut c_char);
}

fn to_string(ptr: *mut c_char) -> String {
    if ptr.is_null() {
        return "<null>".to_string();
    }
    let s = unsafe { CStr::from_ptr(ptr) }.to_string_lossy().to_string();
    unsafe { free_string(ptr) };
    s
}

fn main() {
    let codes = CString::new(r#"["UY"]"#).unwrap();
    let handle = unsafe { engine_create_scoped_game(codes.as_ptr()) };
    assert!(!handle.is_null(), "game creation failed");

    let countries_json = to_string(unsafe { engine_get_countries(handle) });
    println!("countries: {countries_json}");
    let countries: serde_json::Value = serde_json::from_str(&countries_json).unwrap();
    let uy_id = countries
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["code"] == "UY")
        .map(|c| c["id"].as_u64().unwrap())
        .expect("UY not found") as u32;
    println!("Uruguay country_id = {uy_id}");

    // Checkpoints: 7 days (as in the bug report), then enough days to
    // cross the Sep 4 international-break start (from an Aug 1 game
    // start).
    let checkpoints = [7u32, 23, 5, 5]; // cumulative: 7, 30, 35, 40 days
    let mut total_days = 0u32;
    for &days in &checkpoints {
        let process_json = to_string(unsafe { engine_process_days(handle, days) });
        total_days += days;
        println!("\n=== after {total_days} total days: {process_json} ===");

        let squad_json = to_string(unsafe { engine_get_national_squad(handle, uy_id, false) });
        let schedule_json = to_string(unsafe { engine_get_national_schedule(handle, uy_id, false) });

        let squad: serde_json::Value = serde_json::from_str(&squad_json).unwrap();
        let schedule: serde_json::Value = serde_json::from_str(&schedule_json).unwrap();

        println!(
            "squad len = {}, schedule len = {}",
            squad.as_array().map(|a| a.len()).unwrap_or(0),
            schedule.as_array().map(|a| a.len()).unwrap_or(0)
        );
        if squad.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            println!("first squad row: {}", squad[0]);
        }
        if schedule.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            println!("first schedule row: {}", schedule[0]);
        }
    }
}

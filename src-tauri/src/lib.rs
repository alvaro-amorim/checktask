use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use tauri::Manager;

#[tauri::command]
fn log_frontend_error(app: tauri::AppHandle, payload: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;

    let logs_dir = app_data_dir.join("logs");
    create_dir_all(&logs_dir).map_err(|error| format!("failed to create logs dir: {error}"))?;

    let log_path = logs_dir.join("frontend-errors.log");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|error| format!("failed to open log file: {error}"))?;

    // Keep each line bounded in case an error object is too large.
    let trimmed = payload.chars().take(12000).collect::<String>();
    writeln!(file, "{trimmed}").map_err(|error| format!("failed to write log file: {error}"))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![log_frontend_error])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

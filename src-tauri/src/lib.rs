mod audio;
mod file;
mod window;

use crate::audio::fetch_meta;
use crate::file::calculate_hash;
use log::{error};
use crate::window::wait_saving;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            window::show_window(app);
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_window_event(wait_saving)
        .invoke_handler(tauri::generate_handler![
            calculate_hash,
            fetch_meta,
            confirm_save_done
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn confirm_save_done(window: tauri::Window) {
    window
        .close()
        .map_err(|e| error!("Error while shutdown app {}", e))
        .unwrap();
}

use crate::window::show_window;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_window = MenuItem::with_id(app, "forward", "上一曲", true, None::<&str>)?;
    let sync_data = MenuItem::with_id(app, "pause-play", "播放/暂停", true, None::<&str>)?;
    let show_settings = MenuItem::with_id(app, "backward", "下一曲", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_window, &sync_data, &show_settings, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Lumen Audio Player")
        .show_menu_on_left_click(false)
        .menu(&menu)
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::DoubleClick { .. } => show_window(tray.app_handle()),
            _ => {}
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.close();
                }
            }
            other => {
                app.emit("tray://action", other).ok();
            }
        })
        .build(app)?;

    Ok(())
}

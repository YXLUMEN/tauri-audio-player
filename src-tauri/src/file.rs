use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Error, Read};
use std::path::Path;

#[tauri::command]
pub async fn calculate_hash(file_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || inner_hash(Path::new(&file_path)))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

fn inner_hash(path: &Path) -> Result<String, Error> {
    let file = File::open(path)?;
    let mut reader = BufReader::with_capacity(8 * 1024, file);
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 8 * 1024];

    loop {
        let n = reader.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

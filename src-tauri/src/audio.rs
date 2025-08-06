use serde::Serialize;
use std::fs::File;
use std::path::{Path, PathBuf};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::StandardTagKey;
use symphonia::core::probe::Hint;
use symphonia::default;

#[derive(Debug, Serialize, Default)]
pub struct AudioMetadata {
    title: Option<String>,
    album: Option<String>,
    artist: Option<String>,
    cover: Option<Vec<u8>>,
    cover_mime_type: Option<String>,
}

#[tauri::command]
pub async fn fetch_meta(path: PathBuf) -> Result<AudioMetadata, String> {
    tauri::async_runtime::spawn_blocking(move || read_basic_metadata(&path))
        .await
        .map_err(|e| e.to_string())?
}

fn read_basic_metadata(path: &Path) -> Result<AudioMetadata, String> {
    let src = File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mss = MediaSourceStream::new(Box::new(src), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
        hint.with_extension(ext);
    }

    // 探测容器,仅加载 metadata
    let probe = default::get_probe()
        .format(&hint, mss, &Default::default(), &Default::default())
        .map_err(|e| format!("不支持的音频格式: {}", e))?;

    let mut format = probe.format;

    let mut metadata = AudioMetadata::default();

    // 读取元数据以及第一张封面
    if let Some(meta) = format.metadata().current() {
        for tag in meta.tags() {
            match tag.std_key {
                Some(StandardTagKey::TrackTitle) => metadata.title = Some(tag.value.to_string()),
                Some(StandardTagKey::Album) => metadata.album = Some(tag.value.to_string()),
                Some(StandardTagKey::Artist) => metadata.artist = Some(tag.value.to_string()),
                _ => {}
            }
        }

        if let Some(visual) = meta.visuals().iter().next() {
            metadata.cover = Some(visual.data.to_vec());
            metadata.cover_mime_type = Some(detect_image_mime_type(&visual.data));
        }
    }

    // 回退为文件名
    if metadata.title.is_none() {
        if let Some(file_name) = path.file_stem().and_then(|s| s.to_str()) {
            metadata.title = Some(file_name.to_string());
        }
    }

    Ok(metadata)
}

fn detect_image_mime_type(data: &[u8]) -> String {
    match data {
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..] => "image/png",
        [0xFF, 0xD8, 0xFF, ..] => "image/jpeg",
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ..] | [0x47, 0x49, 0x46, 0x38, 0x37, 0x61, ..] => {
            "image/gif"
        }
        [0x42, 0x4D, ..] => "image/bmp",
        _ => "application/octet-stream",
    }
    .to_string()
}

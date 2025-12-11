use id3::{frame::PictureType, Tag, TagLike};
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
    lyrics: Option<String>,
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
    let mut metadata = AudioMetadata::default();
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    if ext == "mp3" {
        match Tag::read_from_path(path) {
            Ok(tag) => {
                metadata.title = tag.title().map(|t| t.to_string()).or_else(|| {
                    path.file_stem()
                        .and_then(|s| s.to_str())
                        .map(|s| s.to_string())
                });

                metadata.album = Some(tag.album().unwrap_or("No album").to_string());
                metadata.artist = Some(tag.artist().unwrap_or("No artist").to_string());
                metadata.lyrics = tag.lyrics().next().map(|l| l.text.to_string());

                if let Some(picture) = tag
                    .pictures()
                    .find(|p| p.picture_type == PictureType::CoverFront)
                    .or_else(|| tag.pictures().next())
                {
                    metadata.cover = Some(picture.data.clone());
                    metadata.cover_mime_type = Some(picture.mime_type.clone());
                }
            }
            Err(e) => {
                return Err(format!("无法读取 ID3 标签: {}", e));
            }
        }
        return Ok(metadata);
    }

    let src = File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mss = MediaSourceStream::new(Box::new(src), Default::default());

    let mut hint = Hint::new();
    hint.with_extension(&ext);

    // 探测容器,仅加载 metadata
    let probe = default::get_probe()
        .format(&hint, mss, &Default::default(), &Default::default())
        .map_err(|e| format!("不支持的音频格式: {}", e))?;

    let mut format = probe.format;

    // 读取元数据以及第一张封面
    if let Some(meta) = format.metadata().current() {
        for tag in meta.tags() {
            match tag.std_key {
                Some(StandardTagKey::TrackTitle) => metadata.title = Some(tag.value.to_string()),
                Some(StandardTagKey::Album) => metadata.album = Some(tag.value.to_string()),
                Some(StandardTagKey::Artist) => metadata.artist = Some(tag.value.to_string()),
                Some(StandardTagKey::Lyrics) => metadata.lyrics = Some(tag.value.to_string()),
                _ => {}
            }
        }

        if let Some(visual) = meta.visuals().iter().next() {
            metadata.cover = Some(visual.data.to_vec());
            metadata.cover_mime_type = Some(detect_image_mime_type(&visual.data).to_string());
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

fn detect_image_mime_type(data: &[u8]) -> &'static str {
    if data.starts_with(b"\x89PNG\r\n\x1a\n") {
        "image/png"
    } else if data.starts_with(b"\xFF\xD8\xFF") {
        "image/jpeg"
    } else if data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a") {
        "image/gif"
    } else if data.starts_with(b"BM") {
        "image/bmp"
    } else {
        "application/octet-stream"
    }
}

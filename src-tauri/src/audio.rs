use serde::Serialize;
use std::fs::File;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::StandardTagKey;
use symphonia::core::probe::Hint;
use symphonia::default;

#[derive(Debug, Serialize)]
pub struct AudioMetadata {
    title: Option<String>,
    album: Option<String>,
    artist: Option<String>,
    cover: Option<Vec<u8>>,
    cover_mime_type: Option<String>,
}

#[tauri::command]
pub fn get_audio_metadata(path: String, extension: String) -> Result<AudioMetadata, String> {
    let src = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mss = MediaSourceStream::new(Box::new(src), Default::default());

    let mut hint = Hint::new();
    hint.with_extension(&extension);

    let probe = default::get_probe()
        .format(&hint, mss, &Default::default(), &Default::default())
        .map_err(|e| format!("Unsupported format: {}", e))?;

    let mut format = probe.format;

    let mut metadata = AudioMetadata {
        title: None,
        album: None,
        artist: None,
        cover: None,
        cover_mime_type: None,
    };

    if let Some(meta) = format.metadata().current() {
        for tag in meta.tags() {
            match tag.std_key {
                Some(StandardTagKey::TrackTitle) => {
                    metadata.title = Some(tag.value.to_string());
                }
                Some(StandardTagKey::Album) => {
                    metadata.album = Some(tag.value.to_string());
                }
                Some(StandardTagKey::Artist) => {
                    metadata.artist = Some(tag.value.to_string());
                }
                _ => {}
            }
        }

        // 提取封面图片
        for visual in meta.visuals() {
            metadata.cover = Some(visual.data.to_vec());
            metadata.cover_mime_type = Some(detect_image_mime_type(&visual.data));
            break;
        }
    }

    Ok(metadata)
}

fn detect_image_mime_type(data: &[u8]) -> String {
    if data.len() > 8 {
        match &data[0..8] {
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] => "image/png".to_string(),
            [0xFF, 0xD8, 0xFF] => "image/jpeg".to_string(),
            [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] | [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] => {
                "image/gif".to_string()
            }
            [0x42, 0x4D] => "image/bmp".to_string(),
            _ => "application/octet-stream".to_string(),
        }
    } else {
        "application/octet-stream".to_string()
    }
}

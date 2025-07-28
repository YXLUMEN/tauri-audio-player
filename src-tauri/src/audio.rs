use lofty::file::TaggedFileExt;
use lofty::picture::PictureType;
use lofty::probe::Probe;
use lofty::tag::ItemKey;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AudioMetadata {
    title: Option<String>,
    album: Option<String>,
    artist: Option<String>,
    cover: Option<Vec<u8>>,
    cover_mime_type: Option<String>,
}

#[tauri::command]
pub async fn fetch_meta(path: String) -> Result<AudioMetadata, String> {
    tauri::async_runtime::spawn_blocking(move || get_audio_metadata(&path))
        .await
        .map_err(|e| e.to_string())?
}

pub fn get_audio_metadata(path: &str) -> Result<AudioMetadata, String> {
    let tagged_file = Probe::open(path)
        .map_err(|e| format!("Fail on open file: {}", e))?
        .read()
        .map_err(|e| format!("Fail on parse tags: {}", e))?;

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag())
        .ok_or("未发现任何标签")?;

    let title = tag.get_string(&ItemKey::TrackTitle).map(str::to_string);
    let artist = tag.get_string(&ItemKey::AlbumArtist).map(str::to_string);
    let album = tag.get_string(&ItemKey::AlbumTitle).map(str::to_string);

    let (cover, cover_mime_type) = tag
        .pictures()
        .iter()
        .find(|p| p.pic_type() == PictureType::CoverFront)
        .map(|pic| {
            (
                Some(pic.data().to_vec()),
                Some(pic.mime_type().unwrap().to_string()),
            )
        })
        .unwrap_or((None, None));

    Ok(AudioMetadata {
        title,
        artist,
        album,
        cover,
        cover_mime_type,
    })
}

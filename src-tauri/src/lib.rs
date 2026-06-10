use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppFile {
    id: String,
    name: String,
    path: Option<String>,
    content: String,
    language: String,
    dirty: bool,
    last_saved_content: String,
}

fn detect_language_mode(file_path: &Path) -> &'static str {
    match file_path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("sql") | Some("mysql") => "mysql",
        Some("java") => "java",
        Some("php") => "php",
        Some("json") => "json",
        Some("js") | Some("jsx") | Some("mjs") | Some("cjs") => "javascript",
        Some("ts") | Some("tsx") => "typescript",
        Some("html") | Some("htm") => "html",
        Some("css") | Some("scss") | Some("less") => "css",
        Some("md") | Some("markdown") => "markdown",
        Some("py") => "python",
        Some("go") => "go",
        Some("rs") => "rust",
        Some("c") | Some("h") | Some("cpp") | Some("hpp") | Some("cc") | Some("cxx") => "cpp",
        Some("xml") => "xml",
        Some("yml") | Some("yaml") => "yaml",
        Some("sh") | Some("zsh") | Some("bash") => "shell",
        _ => "plaintext",
    }
}

fn read_app_file(file_path: PathBuf) -> Result<AppFile, String> {
    let content = fs::read_to_string(&file_path).map_err(|error| error.to_string())?;
    let name = file_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("未命名.txt")
        .to_string();
    let path = file_path.to_string_lossy().to_string();

    Ok(AppFile {
        id: format!("{}:{}", path, chrono_like_timestamp()),
        name,
        path: Some(path),
        language: detect_language_mode(&file_path).to_string(),
        dirty: false,
        last_saved_content: content.clone(),
        content,
    })
}

fn chrono_like_timestamp() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

#[tauri::command]
fn open_files() -> Result<Vec<AppFile>, String> {
    let Some(file_paths) = rfd::FileDialog::new()
        .set_title("打开文件")
        .add_filter(
            "文本和代码",
            &[
                "txt", "log", "sql", "mysql", "java", "php", "json", "js", "jsx", "mjs", "cjs", "ts",
                "tsx", "html", "htm", "css", "scss", "less", "md", "markdown", "py", "go", "rs", "c",
                "h", "cpp", "hpp", "cc", "cxx", "xml", "yml", "yaml", "sh", "zsh", "bash",
            ],
        )
        .pick_files()
    else {
        return Ok(Vec::new());
    };

    file_paths.into_iter().map(read_app_file).collect()
}

#[tauri::command]
fn read_dropped_files(file_paths: Vec<String>) -> Result<Vec<AppFile>, String> {
    file_paths.into_iter().map(PathBuf::from).map(read_app_file).collect()
}

#[tauri::command]
fn save_file(file_path: String, content: String) -> Result<(), String> {
    fs::write(file_path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_file_as(default_name: String, content: String) -> Result<Option<AppFile>, String> {
    let Some(file_path) = rfd::FileDialog::new()
        .set_title("另存为")
        .set_file_name(&default_name)
        .save_file()
    else {
        return Ok(None);
    };

    fs::write(&file_path, content).map_err(|error| error.to_string())?;
    read_app_file(file_path).map(Some)
}

#[tauri::command]
fn show_in_folder(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(file_path);

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(format!("/select,{}", path.to_string_lossy()))
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let parent = path.parent().unwrap_or_else(|| Path::new("."));
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_files,
            read_dropped_files,
            save_file,
            save_file_as,
            show_in_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

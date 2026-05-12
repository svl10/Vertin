use std::process::Command;
use tauri::command;

#[derive(serde::Serialize)]
pub struct GitCommit {
    hash: String,
    author: String,
    date: String,
    message: String,
}

#[command]
fn get_git_log(path: String) -> Result<Vec<GitCommit>, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["log", "--pretty=format:%H%x1f%an%x1f%ad%x1f%s", "--date=short"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split('\x1f').collect();
        if parts.len() >= 4 {
            commits.push(GitCommit {
                hash: parts[0].to_string(),
                author: parts[1].to_string(),
                date: parts[2].to_string(),
                message: parts[3..].join("\x1f"),
            });
        }
    }
    
    Ok(commits)
}

#[command]
fn get_commit_diff(path: String, hash: String) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["show", &hash, "--format="])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_git_log, get_commit_diff])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

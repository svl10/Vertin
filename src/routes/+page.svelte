<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";
  import { parseDiff } from "$lib/diff_parser";
  import type { DiffFile } from "$lib/diff_parser";
  import { FolderOpen, Palette, GitCommit, FileCode2 } from "lucide-svelte";
  import { fade, slide } from "svelte/transition";

  let repoPath = $state("");
  let commits = $state<any[]>([]);
  let selectedCommit = $state<any>(null);
  let parsedDiffFiles = $state<DiffFile[]>([]);
  let errorMsg = $state("");

  let _theme = $state("slate");
  let themes = ["slate", "emerald", "rose", "violet", "amber"];

  function setTheme(theme: string) {
    _theme = theme;
    if (theme === "slate") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  async function openRepo() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected) {
        repoPath = selected as string;
        commits = await invoke("get_git_log", { path: repoPath });
        selectedCommit = null;
        parsedDiffFiles = [];
        errorMsg = "";
      }
    } catch (e: any) {
      errorMsg = e.toString();
    }
  }

  async function selectCommit(commit: any) {
    selectedCommit = commit;
    parsedDiffFiles = [];
    try {
      const diffText: string = await invoke("get_commit_diff", {
        path: repoPath,
        hash: commit.hash,
      });
      parsedDiffFiles = parseDiff(diffText);
      errorMsg = "";
    } catch (e: any) {
      errorMsg = e.toString();
    }
  }
</script>

<div class="app-layout" in:fade={{ duration: 300 }}>
  <aside class="sidebar glass">
    <div class="sidebar-header">
      <div class="brand">
        <GitCommit size={24} style="color: var(--primary)" />
        <h2>Vertin</h2>
      </div>
      <div class="actions">
        <button class="btn glass-btn" onclick={openRepo}>
          <FolderOpen size={16} /> Open Repository
        </button>
      </div>
      <div class="theme-picker">
        <div class="theme-label"><Palette size={14} /> Theme</div>
        <div class="theme-dots">
          {#each themes as t}
            <button
              class="theme-dot {t === _theme ? 'active' : ''}"
              style="--dot-color: {t === 'slate'
                ? '#3b82f6'
                : `var(--primary)`};"
              onclick={() => setTheme(t)}
              aria-label={t}
            ></button>
          {/each}
        </div>
      </div>
    </div>

    <div class="commit-list">
      {#if repoPath && commits.length === 0}
        <div class="empty">No commits found.</div>
      {/if}
      <div class="commit-timeline-container">
        {#each commits as commit, i (commit.hash)}
          <div
            class="timeline-wrapper"
            in:fade={{ delay: Math.min(i * 20, 500), duration: 200 }}
          >
            <button
              class="commit-item {selectedCommit?.hash === commit.hash
                ? 'active'
                : ''}"
              onclick={() => selectCommit(commit)}
            >
              <div class="commit-node"></div>
              <div class="commit-content">
                <div class="commit-msg">{commit.message}</div>
                <div class="commit-meta">
                  <span class="commit-hash">{commit.hash.substring(0, 7)}</span>
                  <span class="commit-date">{commit.date}</span>
                </div>
              </div>
            </button>
          </div>
        {/each}
      </div>
    </div>
  </aside>

  <main class="main-viewer">
    {#if errorMsg}
      <div class="error-box glass" transition:slide>
        <span class="error-title">Error:</span>
        {errorMsg}
      </div>
    {/if}

    {#if selectedCommit}
      <div class="diff-header glass" in:slide={{ duration: 200 }}>
        <div class="diff-header-content">
          <h3>{selectedCommit.message}</h3>
          <div class="commit-details">
            <div class="detail-badge">
              <span class="label">Author:</span>
              <span class="val">{selectedCommit.author}</span>
            </div>
            <div class="detail-badge">
              <span class="label">Date:</span>
              <span class="val">{selectedCommit.date}</span>
            </div>
            <div class="detail-badge">
              <span class="label">Hash:</span>
              <span class="val code-font">{selectedCommit.hash}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="diff-content">
        {#each parsedDiffFiles as file, index (file.filename)}
          <div
            class="file-card glass"
            in:slide={{ delay: Math.min(index * 30, 400), duration: 300 }}
          >
            <div class="file-card-header">
              <div class="file-name-wrap">
                <FileCode2 size={16} style="color: var(--text-muted)" />
                <span class="file-name">{file.filename}</span>
              </div>
              <span class="file-status {file.status}">{file.status}</span>
            </div>

            <div class="code-viewer code-font">
              {#each file.hunks as hunk}
                <div class="hunk-header">{hunk.header}</div>
                {#each hunk.lines as line}
                  <div class="diff-line {line.type}">
                    <span class="line-content">{line.content}</span>
                  </div>
                {/each}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state" in:fade={{ duration: 400 }}>
        <div class="empty-icon-glow">
          <GitCommit size={64} style="color: var(--primary)" />
        </div>
        <h3>No Commit Selected</h3>
        <p>Open a repository and select a commit to view the stunning diff.</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .app-layout {
    display: flex;
    width: 100%;
    height: 100vh;
    animation: fadeIn 0.4s ease-out;
  }

  .sidebar {
    width: 320px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  .sidebar-header {
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03) 0%,
      transparent 100%
    );
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .brand h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(90deg, #fff 0%, var(--text-muted) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .actions .btn {
    width: 100%;
    font-size: 0.9rem;
    padding: 0.75rem 1rem;
  }

  .theme-picker {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .theme-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .theme-dots {
    display: flex;
    gap: 0.4rem;
  }

  .theme-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    background: var(--dot-color, var(--primary));
  }

  .theme-dot:hover {
    transform: scale(1.2);
    box-shadow: 0 0 8px var(--dot-color);
  }

  .theme-dot.active {
    transform: scale(1.3);
    box-shadow:
      0 0 8px var(--dot-color),
      0 0 0 2px var(--bg-panel),
      0 0 0 4px var(--text-main);
  }

  .theme-dot[aria-label="slate"] {
    --dot-color: #3b82f6;
  }
  .theme-dot[aria-label="emerald"] {
    --dot-color: #10b981;
  }
  .theme-dot[aria-label="rose"] {
    --dot-color: #f43f5e;
  }
  .theme-dot[aria-label="violet"] {
    --dot-color: #8b5cf6;
  }
  .theme-dot[aria-label="amber"] {
    --dot-color: #f59e0b;
  }

  .commit-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
  }

  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .commit-timeline-container {
    padding: 0 1rem;
    position: relative;
  }

  /* Create an absolute line for the timeline */
  .commit-timeline-container::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 1.7rem;
    width: 2px;
    background: linear-gradient(
      180deg,
      var(--border-color) 0%,
      transparent 100%
    );
    z-index: 1;
  }

  .timeline-wrapper {
    position: relative;
    z-index: 2;
    margin-bottom: 0.25rem;
  }

  .commit-item {
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-main);
    text-align: left;
    padding: 0.85rem 1rem 0.85rem 2.8rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    display: flex;
    align-items: center;
  }

  .commit-node {
    position: absolute;
    left: 0.53rem;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--bg-panel);
    border: 2px solid var(--border-highlight);
    transition: all 0.2s;
    z-index: 3;
  }

  .commit-item:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .commit-item:hover .commit-node {
    border-color: var(--primary);
    box-shadow: 0 0 8px var(--primary-glow);
  }

  .commit-item.active {
    background: linear-gradient(
      90deg,
      var(--primary-glow) 0%,
      transparent 100%
    );
    border-left: 2px solid var(--primary);
    border-radius: 0 8px 8px 0;
  }

  .commit-item.active .commit-node {
    background: var(--primary);
    border-color: var(--text-main);
    box-shadow: 0 0 12px var(--primary-glow-strong);
    transform: scale(1.2);
  }

  .commit-content {
    flex: 1;
    min-width: 0;
  }

  .commit-msg {
    font-weight: 500;
    font-size: 0.95rem;
    margin-bottom: 0.35rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .commit-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .commit-hash {
    font-family: "Fira Code", monospace;
    opacity: 0.8;
  }

  .main-viewer {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    position: relative;
    background: transparent;
  }

  .error-box {
    margin: 1.5rem;
    padding: 1rem 1.5rem;
    background: rgba(248, 81, 73, 0.1);
    border-left: 4px solid #f85149;
    color: #ffdce0;
    border-radius: 4px 8px 8px 4px;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(248, 81, 73, 0.15);
  }

  .error-title {
    font-weight: 600;
    color: #ff7b72;
    margin-right: 0.5rem;
  }

  .diff-header {
    margin: 1.5rem 1.5rem 0 1.5rem;
    padding: 1.5rem;
    border-radius: 12px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03) 0%,
      transparent 100%
    );
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .diff-header h3 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .commit-details {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .detail-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--border-color);
  }

  .detail-badge .label {
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }
  .detail-badge .val {
    color: var(--text-main);
  }

  .diff-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    scroll-behavior: smooth;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    text-align: center;
  }

  .empty-icon-glow {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .empty-icon-glow::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--primary-glow);
    filter: blur(40px);
    border-radius: 50%;
    z-index: -1;
    animation: pulseGlow 4s infinite alternate ease-in-out;
  }

  .empty-state h3 {
    color: var(--text-main);
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  .file-card {
    border-radius: 12px;
    margin-bottom: 2rem;
    overflow: hidden;
    position: relative;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .file-card-header {
    padding: 0.8rem 1.2rem;
    border-bottom: 1px solid var(--border-color);
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .file-name-wrap {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .file-name {
    font-weight: 600;
    font-size: 0.9rem;
    letter-spacing: 0.01em;
  }

  .file-status {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid transparent;
  }
  .file-status.added {
    color: var(--diff-add-text);
    border-color: rgba(63, 185, 80, 0.2);
    background: rgba(63, 185, 80, 0.05);
  }
  .file-status.deleted {
    color: var(--diff-del-text);
    border-color: rgba(255, 123, 114, 0.2);
    background: rgba(255, 123, 114, 0.05);
  }
  .file-status.modified {
    color: var(--primary-hover);
    border-color: rgba(96, 165, 250, 0.2);
    background: rgba(96, 165, 250, 0.05);
  }

  .code-viewer {
    padding: 1rem 0;
    font-size: 0.85rem;
    line-height: 1.5;
    overflow-x: auto;
  }

  .hunk-header {
    background: var(--diff-hunk-bg);
    color: var(--diff-hunk-text);
    padding: 0.3rem 1.2rem;
    font-size: 0.8rem;
    margin: 0.5rem 0;
    border-top: 1px solid rgba(121, 192, 255, 0.1);
    border-bottom: 1px solid rgba(121, 192, 255, 0.1);
    display: inline-block;
    border-radius: 0 4px 4px 0;
  }

  .diff-line {
    padding: 0 1.2rem;
    white-space: pre;
    position: relative;
    display: flex;
  }

  .diff-line:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .line-content {
    flex: 1;
  }

  .diff-line.addition {
    background-color: var(--diff-add-bg);
    color: var(--diff-add-text);
  }
  .diff-line.addition::before {
    content: "+";
    width: 1.5rem;
    display: inline-block;
    opacity: 0.6;
    user-select: none;
  }

  .diff-line.deletion {
    background-color: var(--diff-del-bg);
    color: var(--diff-del-text);
  }
  .diff-line.deletion::before {
    content: "-";
    width: 1.5rem;
    display: inline-block;
    opacity: 0.6;
    user-select: none;
  }

  .diff-line.context {
    opacity: 0.8;
  }
  .diff-line.context::before {
    content: " ";
    width: 1.5rem;
    display: inline-block;
    user-select: none;
  }
</style>

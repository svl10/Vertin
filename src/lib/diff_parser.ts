export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'addition' | 'deletion' | 'context' | 'hunk';
  content: string;
}

export interface DiffFile {
  filename: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'unknown';
  hunks: DiffHunk[];
}

export function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;

  const lines = diffText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      if (currentFile) files.push(currentFile);
      
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      const filename = match ? match[2] : 'Unknown File';

      currentFile = {
        filename,
        status: 'modified', 
        hunks: [],
      };
      currentHunk = null;
    } else if (line.startsWith('new file mode')) {
      if (currentFile) currentFile.status = 'added';
    } else if (line.startsWith('deleted file mode')) {
      if (currentFile) currentFile.status = 'deleted';
    } else if (line.startsWith('@@ ')) {
      currentHunk = {
        header: line,
        lines: [],
      };
      if (currentFile) {
        currentFile.hunks.push(currentHunk);
      }
    } else if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({ type: 'addition', content: line.substring(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({ type: 'deletion', content: line.substring(1) });
      } else if (!line.startsWith('---') && !line.startsWith('+++') && !line.startsWith('\\ No newline')) {
        currentHunk.lines.push({ type: 'context', content: line.startsWith(' ') ? line.substring(1) : line });
      }
    }
  }

  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}

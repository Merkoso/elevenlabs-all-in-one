import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.join(process.cwd(), 'data', 'audio');

// Ensure the directory exists on module load (safe wrapper)
try {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Audio directory creation failed (likely read-only cloud filesystem):', e);
}

export function getAudioDirAbsolute(): string {
  try {
    return path.resolve(AUDIO_DIR);
  } catch {
    return AUDIO_DIR;
  }
}

export function saveAudioFile(id: string, ext: string, buffer: Buffer): { absolutePath: string; filename: string } {
  const filename = `${id}.${ext}`;
  const absolutePath = path.join(AUDIO_DIR, filename);
  
  try {
    // Write the file
    fs.writeFileSync(absolutePath, buffer);
    
    // Run automatic cleanup (max 80 files)
    try {
      pruneOldFiles();
    } catch (error) {
      console.error('Failed to prune old audio files:', error);
    }
  } catch (error) {
    console.warn(`Could not save audio file to server storage (${filename}):`, error);
  }
  
  return { absolutePath, filename };
}

export function getAudioFile(filename: string): Buffer | null {
  const filePath = path.join(AUDIO_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (e) {
    console.warn(`Could not read audio file ${filename} from disk:`, e);
  }
  return null;
}

export function saveJsonFile(id: string, obj: unknown): string {
  const filename = `${id}.alignment.json`;
  const absolutePath = path.join(AUDIO_DIR, filename);
  try {
    fs.writeFileSync(absolutePath, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.warn(`Could not save alignment file to server storage (${filename}):`, error);
  }
  return filename;
}

export function deleteJsonFile(filename: string): void {
  const filePath = path.join(AUDIO_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.warn(`Could not delete json file ${filename}:`, e);
  }
}

export function deleteAudioFile(filename: string): void {
  const filePath = path.join(AUDIO_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.warn(`Could not delete audio file ${filename}:`, e);
  }
  
  // Also delete corresponding json
  const jsonName = filename.replace(/\.[^/.]+$/, '.alignment.json');
  const jsonPath = path.join(AUDIO_DIR, jsonName);
  try {
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }
  } catch (e) {
    console.warn(`Could not delete alignment file ${jsonName}:`, e);
  }
}

export function clearAudioCache(): number {
  try {
    if (!fs.existsSync(AUDIO_DIR)) return 0;
    const files = fs.readdirSync(AUDIO_DIR);
    let deletedCount = 0;
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(AUDIO_DIR, file));
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete file ${file}:`, e);
      }
    }
    return deletedCount;
  } catch (e) {
    console.warn('Failed to clear server audio cache (read-only filesystem):', e);
    return 0;
  }
}

function pruneOldFiles(): void {
  try {
    if (!fs.existsSync(AUDIO_DIR)) return;
    
    const files = fs.readdirSync(AUDIO_DIR);
    // We only care about audio files (e.g. mp3, wav, pcm, opus)
    const audioFiles = files.filter(file => 
      ['.mp3', '.wav', '.pcm', '.opus'].includes(path.extname(file).toLowerCase())
    );
    
    if (audioFiles.length <= 80) return;
    
    // Get full stats for sorting
    const filesWithStats = audioFiles.map(file => {
      const filePath = path.join(AUDIO_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        mtimeMs: stats.mtimeMs
      };
    });
    
    // Sort oldest first (ascending)
    filesWithStats.sort((a, b) => a.mtimeMs - b.mtimeMs);
    
    // Delete until we have <= 80 files
    const toDeleteCount = filesWithStats.length - 80;
    for (let i = 0; i < toDeleteCount; i++) {
      const fileToDelete = filesWithStats[i].name;
      try {
        fs.unlinkSync(path.join(AUDIO_DIR, fileToDelete));
        console.log(`Auto-pruned oldest audio file: ${fileToDelete}`);
        
        // Clean up corresponding JSON
        const jsonToDelete = fileToDelete.replace(/\.[^/.]+$/, '.alignment.json');
        const jsonPath = path.join(AUDIO_DIR, jsonToDelete);
        if (fs.existsSync(jsonPath)) {
          fs.unlinkSync(jsonPath);
          console.log(`Auto-pruned alignment file: ${jsonToDelete}`);
        }
      } catch (err) {
        console.error(`Failed to auto-prune file ${fileToDelete}:`, err);
      }
    }
  } catch (e) {
    console.warn('Failed to prune old audio files (read-only filesystem):', e);
  }
}

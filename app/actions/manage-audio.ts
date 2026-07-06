'use server';

import { getAudioDirAbsolute, clearAudioCache } from '@/lib/server/audio-storage';
import { Ok, Result } from '@/types';
import fs from 'fs';
import path from 'path';

export async function getStoragePath(): Promise<Result<{ path: string }>> {
  try {
    const absolutePath = getAudioDirAbsolute();
    return Ok({ path: absolutePath });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Failed to retrieve path: ${msg}` };
  }
}

export async function clearCache(): Promise<Result<{ deletedCount: number }>> {
  try {
    const deletedCount = clearAudioCache();
    return Ok({ deletedCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Failed to clear cache: ${msg}` };
  }
}

export async function checkFileExists(filename: string): Promise<Result<{ exists: boolean }>> {
  try {
    const dir = getAudioDirAbsolute();
    const filePath = path.join(dir, filename);
    const exists = fs.existsSync(filePath);
    return Ok({ exists });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Failed to check file existence: ${msg}` };
  }
}

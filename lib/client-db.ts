export type ClientHistoryItem = {
  id: string;
  type: 'tts' | 'dialogue' | 'chunked' | 'sts';
  text: string;
  voiceId: string;
  voiceName: string;
  modelId: string;
  seed: number | null;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
  outputFormat: string;
  applyTextNormalization: string;
  requestId: string | null;
  characterCost: number | null;
  filename: string;
  audioUrl?: string; // Client-generated URL
  alignmentFilename?: string | null;
  processingTimeMs: number;
  sizeBytes: number;
  createdAt: string;
  dialogueLines?: { text: string; voiceId: string }[];
  chunkText?: string;
  chunks?: string[];
  projectId?: string | null; // Associated workspace project
  isBestTake?: boolean; // Protect from pruning
  groupId?: string | null;
  takeNumber?: number;
};

const DB_NAME = 'ElevenLabsTTSWorkbenchDB';
const DB_VERSION = 3;
const STORE_NAME = 'generations';
const VOICES_STORE_NAME = 'customVoices';
const PROJECTS_STORE_NAME = 'projects';

export type ClientCustomVoice = {
  voiceId: string;
  name: string;
  previewUrl?: string;
  isCustom?: boolean;
  labels?: Record<string, string>;
  createdAt?: string;
};

export type ClientProject = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(VOICES_STORE_NAME)) {
        db.createObjectStore(VOICES_STORE_NAME, { keyPath: 'voiceId' });
      }
      if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
        db.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

interface StoredRecord extends ClientHistoryItem {
  audioBlob: Blob;
}

export async function saveGenerationLocal(
  metadata: Omit<ClientHistoryItem, 'createdAt'>,
  audioBlob: Blob
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record = {
      ...metadata,
      audioBlob,
      createdAt: new Date().toISOString()
    };

    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Post-save: Prune to max 500 items with smart logic
      pruneGenerationsLocal(500).then(resolve).catch(reject);
    };
  });
}

export async function updateGenerationLocal(
  id: string,
  updates: Partial<ClientHistoryItem>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        reject(new Error(`Generation with ID ${id} not found`));
        return;
      }

      const updatedRecord = {
        ...record,
        ...updates
      };

      const putRequest = store.put(updatedRecord);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

export async function getGenerationsLocal(): Promise<{ metadata: ClientHistoryItem; audioBlob: Blob }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = (request.result || []) as StoredRecord[];
      // Sort newest first
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      resolve(results.map((r) => {
        const { audioBlob, ...metadata } = r;
        return { metadata, audioBlob };
      }));
    };
  });
}

export async function deleteGenerationLocal(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearGenerationsLocal(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function pruneGenerationsLocal(maxItems: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = (request.result || []) as StoredRecord[];
      if (results.length === 0) {
        resolve();
        return;
      }

      // TTL: 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const limitTime = thirtyDaysAgo.getTime();

      // 1. Delete items older than 30 days that are NOT starred (isBestTake) and NOT associated with a project
      const toDeleteByTTL = results.filter(item => {
        const itemTime = new Date(item.createdAt).getTime();
        const isOld = itemTime < limitTime;
        const isProtected = item.isBestTake || item.projectId;
        return isOld && !isProtected;
      });

      for (const item of toDeleteByTTL) {
        store.delete(item.id);
      }

      // Filter remaining locally
      const remaining = results.filter(r => !toDeleteByTTL.some(d => d.id === r.id));

      // 2. Hardcap: If still over maxItems, delete oldest items (protecting starred takes where possible)
      if (remaining.length > maxItems) {
        // Sort oldest first (ascending order)
        remaining.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const unstarred = remaining.filter(r => !r.isBestTake);
        const starred = remaining.filter(r => r.isBestTake);

        const neededDeletions = remaining.length - maxItems;
        const toDeleteIds: string[] = [];

        // Prune unstarred first
        for (const item of unstarred) {
          if (toDeleteIds.length < neededDeletions) {
            toDeleteIds.push(item.id);
          }
        }

        // If still over hardcap, prune oldest starred ones
        if (toDeleteIds.length < neededDeletions) {
          const remainingNeeded = neededDeletions - toDeleteIds.length;
          for (let i = 0; i < remainingNeeded; i++) {
            toDeleteIds.push(starred[i].id);
          }
        }

        for (const id of toDeleteIds) {
          store.delete(id);
        }
      }

      resolve();
    };
  });
}

export async function saveCustomVoiceLocal(voice: ClientCustomVoice): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VOICES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VOICES_STORE_NAME);
    const record = {
      ...voice,
      createdAt: voice.createdAt || new Date().toISOString()
    };
    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function saveCustomVoicesBulkLocal(voices: ClientCustomVoice[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (voices.length === 0) {
      resolve();
      return;
    }
    const transaction = db.transaction(VOICES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VOICES_STORE_NAME);
    
    let errorOccurred = false;
    let completedCount = 0;

    for (const voice of voices) {
      const record = {
        ...voice,
        createdAt: voice.createdAt || new Date().toISOString()
      };
      const request = store.put(record);
      request.onerror = () => {
        if (!errorOccurred) {
          errorOccurred = true;
          reject(request.error);
        }
      };
      request.onsuccess = () => {
        completedCount++;
        if (completedCount === voices.length && !errorOccurred) {
          resolve();
        }
      };
    }
  });
}

export async function getCustomVoicesLocal(): Promise<ClientCustomVoice[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VOICES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VOICES_STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = (request.result || []) as ClientCustomVoice[];
      results.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      resolve(results);
    };
  });
}

export async function deleteCustomVoiceLocal(voiceId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VOICES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VOICES_STORE_NAME);
    const request = store.delete(voiceId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearCustomVoicesLocal(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VOICES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VOICES_STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getProjectsLocal(): Promise<ClientProject[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = (request.result || []) as ClientProject[];
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(results);
    };
  });
}

export async function saveProjectLocal(project: Omit<ClientProject, 'createdAt' | 'updatedAt'> & { createdAt?: string }): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE_NAME);

    const now = new Date().toISOString();
    const record = {
      ...project,
      createdAt: project.createdAt || now,
      updatedAt: now
    };

    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteProjectLocal(projectId: string): Promise<void> {
  const db = await openDB();
  
  // 1. Delete associated generations
  const gens = await getGenerationsLocal();
  const transactionGens = db.transaction(STORE_NAME, 'readwrite');
  const storeGens = transactionGens.objectStore(STORE_NAME);
  for (const g of gens) {
    if (g.metadata.projectId === projectId) {
      storeGens.delete(g.metadata.id);
    }
  }

  // 2. Delete the project itself
  return new Promise((resolve, reject) => {
    const transactionProj = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
    const storeProj = transactionProj.objectStore(PROJECTS_STORE_NAME);
    const request = storeProj.delete(projectId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  Volume2, 
  VolumeX,
  RefreshCw, 
  Sliders, 
  Download, 
  Sparkles, 
  Plus, 
  Trash, 
  Info, 
  Lock, 
  Unlock, 
  FileAudio, 
  FolderOpen, 
  Settings, 
  Layers, 
  MessageSquare,
  X, 
  Search, 
  Star,
  Activity,
  History,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Mic,
  GripVertical,
  Radio,
  ChevronDown,
  Smile,
  BookOpen,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { getVoices, getVoice } from '@/app/actions/manage-voices';
import { getModels, ElevenLabsModel } from '@/app/actions/manage-models';
import { generateSpeechWorkbench, TtsWorkbenchRequest } from '@/app/actions/create-speech-workbench';
import { generateSpeechToSpeech } from '@/app/actions/create-speech-to-speech';
import { createDialogueWorkbench, DialogueLineInput } from '@/app/actions/create-dialogue-workbench';
import { getStoragePath, clearCache } from '@/app/actions/manage-audio';
import { useKey } from '@/components/key-provider';
import { 
  getGenerationsLocal, 
  saveGenerationLocal, 
  clearGenerationsLocal,
  deleteGenerationLocal,
  getCustomVoicesLocal,
  saveCustomVoiceLocal,
  deleteCustomVoiceLocal,
  saveCustomVoicesBulkLocal,
  clearCustomVoicesLocal,
  getProjectsLocal,
  saveProjectLocal,
  deleteProjectLocal,
  updateGenerationLocal,
  type ClientProject
} from '@/lib/client-db';
import { Skeleton } from '@/components/ui/skeleton';
import { getSubscriptionInfo } from '@/app/actions/manage-api-key';
import JSZip from 'jszip';

type HistoryItem = {
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
  audioUrl: string;
  alignmentFilename?: string | null;
  processingTimeMs: number;
  sizeBytes: number;
  createdAt: string;
  existsOnServer?: boolean;
  dialogueLines?: { text: string; voiceId: string }[];
  chunkText?: string;
  chunks?: string[];
  projectId?: string | null;
  groupId?: string | null;
  takeNumber?: number;
};

interface CustomVoice {
  voiceId: string;
  name: string;
  previewUrl?: string;
  isCustom?: boolean;
  labels?: Record<string, string>;
  [key: string]: unknown;
}

const DEFAULT_STATIC_VOICES: CustomVoice[] = [
  { voiceId: 'pNInz6obpgfrhhF21wbu', name: 'Adam', labels: { gender: 'male', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/pNInz6obpgfrhhF21wbu/previews' },
  { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', labels: { gender: 'female', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM/previews' },
  { voiceId: 'AZnzlk1XvdvUeBnXmlld', name: 'Dom', labels: { gender: 'male', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/AZnzlk1XvdvUeBnXmlld/previews' },
  { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', labels: { gender: 'female', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/EXAVITQu4vr4xnSDxMaL/previews' },
  { voiceId: 'ErXwobaYiN019PkySvjV', name: 'Antoni', labels: { gender: 'male', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/ErXwobaYiN019PkySvjV/previews' },
  { voiceId: 'IKne3meq5aKb9J77u7Od', name: 'Charlie', labels: { gender: 'male', accent: 'australian' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/IKne3meq5aKb9J77u7Od/previews' },
  { voiceId: 'LcfcDJNQAoq5tPVgBhxt', name: 'Emily', labels: { gender: 'female', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/LcfcDJNQAoq5tPVgBhxt/previews' },
  { voiceId: 'N2lVSClDTbgTEoM7GA8Z', name: 'Callum', labels: { gender: 'male', accent: 'transatlantic' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/N2lVSClDTbgTEoM7GA8Z/previews' },
  { voiceId: 'ThT52A15M5dRv5d5SsfT', name: 'Dorothy', labels: { gender: 'female', accent: 'british' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/ThT52A15M5dRv5d5SsfT/previews' },
  { voiceId: 'TxGEqn74Ms83DGZEd2sb', name: 'Josh', labels: { gender: 'male', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/TxGEqn74Ms83DGZEd2sb/previews' },
  { voiceId: 'XB0fDUncoZt2wGAee1A9', name: 'Charlotte', labels: { gender: 'female', accent: 'british' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/XB0fDUncoZt2wGAee1A9/previews' },
  { voiceId: 'XrExMAJg3McTxWvwvl4m', name: 'Matilda', labels: { gender: 'female', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/XrExMAJg3McTxWvwvl4m/previews' },
  { voiceId: 'bV5zNSmMjUtnn15C5k1y', name: 'Jeremy', labels: { gender: 'male', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/bV5zNSmMjUtnn15C5k1y/previews' },
  { voiceId: 'flq6f7yk4E4fQWj5Gph1', name: 'Michael', labels: { gender: 'male', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/flq6f7yk4E4fQWj5Gph1/previews' },
  { voiceId: 'g5N2iTrvR5m0ndtfp67X', name: 'Ethan', labels: { gender: 'male', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/g5N2iTrvR5m0ndtfp67X/previews' },
  { voiceId: 'jB5zNSmMjUtnn15C5k1y', name: 'Gigi', labels: { gender: 'female', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/jB5zNSmMjUtnn15C5k1y/previews' },
  { voiceId: 'onwF2XsffZPyUX2535n', name: 'Daniel', labels: { gender: 'male', accent: 'british' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/onwF2XsffZPyUX2535n/previews' },
  { voiceId: 'pFZP5JQG7TpvDq8ikWAM', name: 'Lily', labels: { gender: 'female', accent: 'american' }, previewUrl: 'https://api.elevenlabs.io/v1/voices/pFZP5JQG7TpvDq8ikWAM/previews' }
];

const EMOTION_TAGS = [
  // Basic Emotions & Expressions
  { label: '😊 Happy', tag: '[happy]' },
  { label: '😢 Sad', tag: '[sad]' },
  { label: '🔥 Excited', tag: '[excited]' },
  { label: '🤔 Thoughtful', tag: '[thoughtful]' },
  { label: '😂 Laughs', tag: '[laughs]' },
  { label: '🤫 Whispers', tag: '[whispers]' },
  { label: '😮 Sighs', tag: '[sighs]' },
  { label: '⏱️ Pause', tag: '[short pause]' },
  
  // Educational & Reassurance (For Children & Helpers)
  { label: '⚠️ Gentle Warning', tag: '[gentle warning, cautionary tone]' },
  { label: '🚀 Inspiring', tag: '[inspiring and confident]' },
  { label: '💡 Explaining', tag: '[instructional, clear and detailed, drawing attention]' },
  { label: '🏆 Praising', tag: '[proudly praising, congratulatory]' },
  { label: '🤗 Reassuring', tag: '[reassuring, encouraging, comforting]' },
  { label: '❤️ Warm & Confident', tag: '[warmly reassuring, confident voice]' },
  { label: '🎈 Playful', tag: '[playful, friendly, cheerful]' },
  { label: '🧐 Curious', tag: '[curious, questioning, mysterious]' },
  { label: '📖 Storytelling', tag: '[magical storytelling, engaging narrator]' },
  { label: '🤩 Enthusiastic', tag: '[enthusiastic, amazed]' }
];

const OUTPUT_FORMATS = [
  { value: 'mp3_44100_128', label: 'MP3 128kbps (Default)' },
  { value: 'mp3_44100_192', label: 'MP3 192kbps (Creator+)' },
  { value: 'wav_44100', label: 'WAV 44.1kHz (Pro+)' },
  { value: 'pcm_44100', label: 'PCM 44.1kHz (Pro+)' },
  { value: 'opus_48000_128', label: 'Opus 128kbps' }
];

export default function TextToSpeechPage() {
  const [apiKey, setKey] = useKey();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'expressive' | 'chunking' | 'dialogue' | 'voice2voice' | 'assembly' | 'history'>('expressive');
  
  // Custom UI/UX States
  const [isApiKeyMissing, setIsApiKeyMissing] = useState<boolean>(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice-to-Voice (Speech-to-Speech) State
  const [stsSourceAudioBase64, setStsSourceAudioBase64] = useState<string | null>(null);
  const [stsSourceAudioUrl, setStsSourceAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [removeBackgroundNoise, setRemoveBackgroundNoise] = useState<boolean>(true);
  const [isConvertingSTS, setIsConvertingSTS] = useState<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaRecorderRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioChunksRef = useRef<any>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingTimerRef = useRef<any>(null);
  
  // Core Data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [voices, setVoices] = useState<any[]>([]);
  const [models, setModels] = useState<ElevenLabsModel[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('eleven_v3');
  const [storagePath, setStoragePath] = useState<string>('Loading...');
  
  // Generation Params
  const [text, setText] = useState<string>('');
  const [stability, setStability] = useState<number>(0.55);
  const [similarityBoost, setSimilarityBoost] = useState<number>(0.8);
  const [style, setStyle] = useState<number>(0.2);
  const [speed, setSpeed] = useState<number>(1.0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState<boolean>(true);
  const [seed, setSeed] = useState<string>('');
  const [isSeedLocked, setIsSeedLocked] = useState<boolean>(false);
  const [takesCount, setTakesCount] = useState<number>(1);
  const [outputFormat, setOutputFormat] = useState<string>('mp3_44100_128');
  const [applyTextNormalization, setApplyTextNormalization] = useState<'auto' | 'on' | 'off'>('auto');
  const [withTimestamps, setWithTimestamps] = useState<boolean>(false);
  const generateId = () => Math.random().toString(36).substring(2, 9);
  
  const [dialogueLines, setDialogueLines] = useState<(DialogueLineInput & { id: string })[]>([
    { id: generateId(), text: '', voiceId: '' }
  ]);

  // Drag and Drop State for Dialogue Lines
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    // Optional visual tweak during drag
    requestAnimationFrame(() => {
      e.currentTarget.style.opacity = '0.4';
    });
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _dialogueLines = [...dialogueLines];
      const draggedItemContent = _dialogueLines.splice(dragItem.current, 1)[0];
      _dialogueLines.splice(dragOverItem.current, 0, draggedItemContent);
      setDialogueLines(_dialogueLines);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  // Chunking Tab State
  const [chunkText, setChunkText] = useState<string>('');
  const [chunks, setChunks] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<'paragraphs' | 'lines' | 'sentences' | 'smart'>('paragraphs');
  const [isGeneratingChunks, setIsGeneratingChunks] = useState<boolean>(false);
  
  // Loading & Generation Status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [voicesLoading, setVoicesLoading] = useState<boolean>(true);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentResult, setCurrentResult] = useState<any | null>(null);

  // Rate Limit & Auth Errors
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalKey, setAuthModalKey] = useState<string>('');
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);

  useEffect(() => {
    if (rateLimitSeconds > 0) {
      const timer = setInterval(() => setRateLimitSeconds(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitSeconds]);

  const handleApiError = (errStr: string) => {
    if (errStr.includes('(401)')) {
      setShowAuthModal(true);
      return true;
    }
    if (errStr.includes('(429)')) {
      setRateLimitSeconds(3);
      return true;
    }
    return false;
  };

  // UI Helpers
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState<string>('');
  const [voiceListLimit, setVoiceListLimit] = useState<number>(80);
  const [favoriteVoices, setFavoriteVoices] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreateProjOpen, setIsCreateProjOpen] = useState<boolean>(false);
  const [newProjName, setNewProjName] = useState<string>('');
  const [newProjDesc, setNewProjDesc] = useState<string>('');
  const [bestTakes, setBestTakes] = useState<Record<string, string>>({});
  const [assemblyQueue, setAssemblyQueue] = useState<HistoryItem[]>([]);
  const [assemblyPauseMs, setAssemblyPauseMs] = useState<number>(500);
  const [isMergingAudio, setIsMergingAudio] = useState<boolean>(false);
  const [starredTakeIds, setStarredTakeIds] = useState<string[]>([]);
  const [showStarredClipsOnly, setShowStarredClipsOnly] = useState<boolean>(false);
  const [subInfo, setSubInfo] = useState<{ tier: string; characterCount: number; characterLimit: number; resetDate: string; } | null>(null);
  const [sessionStats, setSessionStats] = useState<{ charactersUsed: number; generationsCount: number; }>({ charactersUsed: 0, generationsCount: 0 });
  const [snippets, setSnippets] = useState<{ id: string; title: string; text: string; }[]>([]);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [showTags, setShowTags] = useState<boolean>(false);
  const [showSnippets, setShowSnippets] = useState<boolean>(false);
  const [customTags, setCustomTags] = useState<{ label: string; tag: string; }[]>([]);
  const [newTagLabel, setNewTagLabel] = useState<string>('');
  const [newTagPrompt, setNewTagPrompt] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [themeColor, setThemeColor] = useState<'zinc' | 'purple' | 'green' | 'blue' | 'amber'>('zinc');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      (window as unknown as { __isLoaded?: boolean }).__isLoaded = true;
    }
  }, [isLoaded]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __testHelpers?: Record<string, unknown> }).__testHelpers = {
        setStability,
        setSimilarityBoost,
        setText,
        setSeed,
        setIsSeedLocked,
        setTakesCount
      };
    }
  }, [stability, similarityBoost, text, seed, isSeedLocked, takesCount]);
  const [globalVolume, setGlobalVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('elevenlabs-global-volume');
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });
  const [previousVolume, setPreviousVolume] = useState<number>(1.0);

  // Refs to store latest states for synchronous save on beforeunload
  const textRef = useRef(text);
  const selectedVoiceIdRef = useRef(selectedVoiceId);
  const stabilityRef = useRef(stability);
  const similarityBoostRef = useRef(similarityBoost);
  const seedRef = useRef(seed);
  const isSeedLockedRef = useRef(isSeedLocked);
  const takesCountRef = useRef(takesCount);

  // Sync refs when states change
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { selectedVoiceIdRef.current = selectedVoiceId; }, [selectedVoiceId]);
  useEffect(() => { stabilityRef.current = stability; }, [stability]);
  useEffect(() => { similarityBoostRef.current = similarityBoost; }, [similarityBoost]);
  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { isSeedLockedRef.current = isSeedLocked; }, [isSeedLocked]);
  useEffect(() => { takesCountRef.current = takesCount; }, [takesCount]);

  // Safe storage helper with QuotaExceededError protection
  const safeSetLocalStorage = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.error('Storage quota exceeded!', e);
        if (typeof window !== 'undefined') {
          const now = Date.now();
          const win = window as unknown as { __lastQuotaToastTime?: number };
          if (!win.__lastQuotaToastTime || now - win.__lastQuotaToastTime > 5000) {
            win.__lastQuotaToastTime = now;
            toast.error('Browser storage limit exceeded. Please delete some old audio files to free space.');
          }
        }
      } else {
        console.error('LocalStorage write failed:', e);
      }
    }
  }, []);

  // Immediate saves
  useEffect(() => {
    if (!isLoaded) return;
    if (selectedVoiceId) safeSetLocalStorage('tts-workbench-selected-voice-id', selectedVoiceId);
  }, [selectedVoiceId, safeSetLocalStorage, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    safeSetLocalStorage('tts-workbench-seed-locked', JSON.stringify(isSeedLocked));
  }, [isSeedLocked, safeSetLocalStorage, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    safeSetLocalStorage('tts-workbench-takes-count', takesCount.toString());
  }, [takesCount, safeSetLocalStorage, isLoaded]);

  // Debounced saves to prevent blocking main thread
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      safeSetLocalStorage('tts-workbench-text', text);
    }, 500);
    return () => clearTimeout(timer);
  }, [text, safeSetLocalStorage, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      safeSetLocalStorage('tts-workbench-stability', stability.toString());
    }, 300);
    return () => clearTimeout(timer);
  }, [stability, safeSetLocalStorage, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      safeSetLocalStorage('tts-workbench-similarity', similarityBoost.toString());
    }, 300);
    return () => clearTimeout(timer);
  }, [similarityBoost, safeSetLocalStorage, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      safeSetLocalStorage('tts-workbench-seed', seed);
    }, 300);
    return () => clearTimeout(timer);
  }, [seed, safeSetLocalStorage, isLoaded]);

  // BeforeUnload synchronous flush
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isLoaded) return;
      try {
        localStorage.setItem('tts-workbench-text', textRef.current);
        localStorage.setItem('tts-workbench-selected-voice-id', selectedVoiceIdRef.current);
        localStorage.setItem('tts-workbench-stability', stabilityRef.current.toString());
        localStorage.setItem('tts-workbench-similarity', similarityBoostRef.current.toString());
        localStorage.setItem('tts-workbench-seed', seedRef.current);
        localStorage.setItem('tts-workbench-seed-locked', JSON.stringify(isSeedLockedRef.current));
        localStorage.setItem('tts-workbench-takes-count', takesCountRef.current.toString());
      } catch (e) {
        console.warn('Failed to save settings synchronously on close:', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoaded]);

  // Multi-tab synchronization (via 'storage' event listener)
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        switch (e.key) {
          case 'tts-workbench-text':
            if (e.newValue !== textRef.current) setText(e.newValue);
            break;
          case 'tts-workbench-selected-voice-id':
            if (e.newValue !== selectedVoiceIdRef.current) setSelectedVoiceId(e.newValue);
            break;
          case 'tts-workbench-stability':
            const valStability = parseFloat(e.newValue);
            if (!isNaN(valStability) && valStability !== stabilityRef.current) setStability(valStability);
            break;
          case 'tts-workbench-similarity':
            const valSimilarity = parseFloat(e.newValue);
            if (!isNaN(valSimilarity) && valSimilarity !== similarityBoostRef.current) setSimilarityBoost(valSimilarity);
            break;
          case 'tts-workbench-seed':
            if (e.newValue !== seedRef.current) setSeed(e.newValue);
            break;
          case 'tts-workbench-seed-locked':
            const valLocked = JSON.parse(e.newValue);
            if (valLocked !== isSeedLockedRef.current) setIsSeedLocked(valLocked);
            break;
          case 'tts-workbench-takes-count':
            const valTakes = parseInt(e.newValue, 10);
            if (!isNaN(valTakes) && valTakes !== takesCountRef.current) {
              setTakesCount(Math.max(1, Math.min(10, valTakes)));
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Failed to handle multi-tab storage sync:', err);
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  useEffect(() => {
    localStorage.setItem('elevenlabs-global-volume', globalVolume.toString());
    const audios = document.querySelectorAll('audio');
    audios.forEach((audio) => {
      audio.volume = globalVolume;
    });
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = globalVolume;
    }
  }, [globalVolume]);

  useEffect(() => {
    const handleAudioPlay = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      if (target && target.tagName === 'AUDIO') {
        target.volume = globalVolume;
      }
    };
    document.addEventListener('play', handleAudioPlay, true);
    return () => {
      document.removeEventListener('play', handleAudioPlay, true);
    };
  }, [globalVolume]);

  // Automatically select a default voice for dialogue lines if none is selected
  useEffect(() => {
    if (selectedVoiceId) {
      setDialogueLines(prev => {
        if (prev.some(l => !l.voiceId)) {
          return prev.map(l => l.voiceId ? l : { ...l, voiceId: selectedVoiceId });
        }
        return prev;
      });
    }
  }, [selectedVoiceId]);

  const [isExportingWorkspace, setIsExportingWorkspace] = useState<boolean>(false);
  const [isHosted, setIsHosted] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [bulkImportText, setBulkImportText] = useState<string>('');
  
  useEffect(() => {
    setVoiceListLimit(80);
  }, [voiceSearch]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const workspaceFileInputRef = useRef<HTMLInputElement>(null);

  // Load Voices, Models, Path and History
  useEffect(() => {
    async function loadData() {
      setIsApiKeyMissing(false);
      setVoicesLoading(true);
      setModelsLoading(true);

      // --- SYNCHRONOUS LOCAL STORAGE LOAD ---
      // Load Favorites
      const savedFavs = localStorage.getItem('tts-workbench-favorites');
      if (savedFavs) {
        setFavoriteVoices(JSON.parse(savedFavs));
      }

      // Load Snippets
      const savedSnippets = localStorage.getItem('tts-workbench-snippets');
      if (savedSnippets) {
        setSnippets(JSON.parse(savedSnippets));
      } else {
        const defaultSnippets = [
          { id: '1', title: 'Expressive Tag', text: 'This is a [happy, laughing] amazing day!' },
          { id: '2', title: 'IPA Phonetics', text: 'My name is George /dʒɔːdʒ/.' },
          { id: '3', title: 'Whisper Tag', text: 'Wait... [whispering] did you hear that?' }
        ];
        setSnippets(defaultSnippets);
        localStorage.setItem('tts-workbench-snippets', JSON.stringify(defaultSnippets));
      }

      // Load Custom Steering Tags
      const savedCustomTags = localStorage.getItem('tts-workbench-custom-tags');
      if (savedCustomTags) {
        setCustomTags(JSON.parse(savedCustomTags));
      }

      // Load Zen Mode
      const savedZen = localStorage.getItem('tts-workbench-zen-mode');
      if (savedZen) {
        setZenMode(JSON.parse(savedZen));
      }

      // Load Starred takes
      const savedStarred = localStorage.getItem('tts-workbench-starred-takes');
      if (savedStarred) {
        try {
          setStarredTakeIds(JSON.parse(savedStarred));
        } catch (e) {
          console.error(e);
        }
      }

      // Load Zoom Level
      const savedZoom = localStorage.getItem('tts-workbench-zoom-level');
      if (savedZoom) {
        const parsed = parseInt(savedZoom, 10);
        if (!isNaN(parsed)) {
          setZoomLevel(parsed);
          document.documentElement.style.fontSize = `${(parsed / 100) * 16}px`;
        }
      }

      // Load Theme Color & Mode
      const savedThemeColor = localStorage.getItem('tts-workbench-theme-color');
      const savedThemeMode = localStorage.getItem('tts-workbench-theme-mode');
      
      const activeColor = (savedThemeColor as 'zinc' | 'purple' | 'green' | 'blue' | 'amber') || 'zinc';
      const activeMode = (savedThemeMode as 'light' | 'dark') || 'dark';
      
      setThemeColor(activeColor);
      setThemeMode(activeMode);
      
      const html = document.documentElement;
      html.classList.remove('theme-purple', 'theme-green', 'theme-blue', 'theme-amber');
      if (activeColor !== 'zinc') {
        html.classList.add(`theme-${activeColor}`);
      }
      
      if (activeMode === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }

      // Load Generative and Voice Settings
      try {
        const savedText = localStorage.getItem('tts-workbench-text');
        if (savedText) setText(savedText);

        const savedVoiceId = localStorage.getItem('tts-workbench-selected-voice-id');
        if (savedVoiceId) setSelectedVoiceId(savedVoiceId);

        const savedStability = localStorage.getItem('tts-workbench-stability');
        if (savedStability !== null) setStability(parseFloat(savedStability));

        const savedSimilarity = localStorage.getItem('tts-workbench-similarity');
        if (savedSimilarity !== null) setSimilarityBoost(parseFloat(savedSimilarity));

        const savedSeed = localStorage.getItem('tts-workbench-seed');
        if (savedSeed) setSeed(savedSeed);

        const savedSeedLocked = localStorage.getItem('tts-workbench-seed-locked');
        if (savedSeedLocked) setIsSeedLocked(JSON.parse(savedSeedLocked));

        const savedTakesCount = localStorage.getItem('tts-workbench-takes-count');
        if (savedTakesCount) {
          const parsedCount = parseInt(savedTakesCount, 10);
          if (!isNaN(parsedCount)) {
            setTakesCount(Math.max(1, Math.min(10, parsedCount)));
          }
        }
      } catch (e) {
        console.warn('Could not load generative parameters:', e);
      }
      // --- END SYNCHRONOUS LOCAL STORAGE LOAD ---

      // 1. Fetch voices
      try {
        const vResult = await getVoices();
        if (vResult.ok) {
          let customVoices: CustomVoice[] = [];
          try {
            const storedVoices = await getCustomVoicesLocal();
            customVoices = storedVoices.map((cv) => ({
              ...cv,
              isCustom: true
            })) as CustomVoice[];
          } catch (err) {
            console.error('Failed to parse custom voices from IndexedDB:', err);
          }

          const apiVoices = vResult.value.voices || [];
          const merged: (CustomVoice | typeof apiVoices[number])[] = [...apiVoices];
          for (const cv of customVoices) {
            if (!merged.some(v => v.voiceId === cv.voiceId)) {
              merged.push(cv);
            }
          }

          setVoices(merged);
          if (merged.length > 0) {
            setSelectedVoiceId(prev => {
              const stillExists = prev && merged.some(v => v.voiceId === prev);
              return stillExists ? prev : merged[0].voiceId;
            });
          }
        } else {
          const errStr = vResult.error || '';
          const lowerErr = errStr.toLowerCase();
          if (
            lowerErr.includes('api key is missing') || 
            lowerErr.includes('initialization failed') || 
            lowerErr.includes('unauthorized') || 
            lowerErr.includes('401') || 
            lowerErr.includes('invalid')
          ) {
            setIsApiKeyMissing(true);
            
            let customVoices: CustomVoice[] = [];
            try {
              const storedVoices = await getCustomVoicesLocal();
              customVoices = storedVoices.map((cv) => ({
                ...cv,
                isCustom: true
              })) as CustomVoice[];
            } catch (err) {
              console.error('Failed to parse custom voices from IndexedDB:', err);
            }
            
            const merged = [...DEFAULT_STATIC_VOICES];
            for (const cv of customVoices) {
              if (!merged.some(v => v.voiceId === cv.voiceId)) {
                merged.push(cv);
              }
            }
            setVoices(merged);
            if (merged.length > 0) {
              setSelectedVoiceId(prev => {
                const stillExists = prev && merged.some(v => v.voiceId === prev);
                return stillExists ? prev : merged[0].voiceId;
              });
            }
          } else {
            toast.error(`Voices Error: ${vResult.error}`);
          }
        }
      } catch (err) {
        console.error('Failed to load voices:', err);
        toast.error('Network or server error loading voices');
      } finally {
        setVoicesLoading(false);
      }

      // 2. Fetch models
      try {
        const mResult = await getModels();
        if (mResult.ok) {
          const ttsCapableModels = mResult.value.filter(m => m.can_do_text_to_speech);
          setModels(ttsCapableModels);
          // Set default model v3 if available, otherwise fallback
          const hasV3 = ttsCapableModels.some(m => m.model_id === 'eleven_v3');
          setSelectedModelId(prev => {
            const stillExists = prev && ttsCapableModels.some(m => m.model_id === prev);
            if (stillExists) return prev;
            return hasV3 ? 'eleven_v3' : (ttsCapableModels[0]?.model_id || 'eleven_v3');
          });
        } else {
          const errStr = mResult.error || '';
          const lowerErr = errStr.toLowerCase();
          if (
            lowerErr.includes('api key is missing') || 
            lowerErr.includes('initialization failed') || 
            lowerErr.includes('unauthorized') || 
            lowerErr.includes('401') || 
            lowerErr.includes('invalid')
          ) {
            setIsApiKeyMissing(true);
            const fallbackModels: ElevenLabsModel[] = [
              { model_id: 'eleven_v3', name: 'Eleven v3 🔥', can_do_text_to_speech: true } as ElevenLabsModel,
              { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', can_do_text_to_speech: true } as ElevenLabsModel,
              { model_id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5', can_do_text_to_speech: true } as ElevenLabsModel,
              { model_id: 'eleven_multilingual_sts_v2', name: 'Eleven Multilingual STS v2', can_do_text_to_speech: true } as ElevenLabsModel
            ];
            setModels(fallbackModels);
            setSelectedModelId(prev => {
              const stillExists = prev && fallbackModels.some(m => m.model_id === prev);
              return stillExists ? prev : 'eleven_v3';
            });
          } else {
            toast.error(`Models Error: ${mResult.error}`);
          }
        }
      } catch (err) {
        console.error('Failed to load models:', err);
        toast.error('Network or server error loading models');
      } finally {
        setModelsLoading(false);
      }

      // 3. Storage path
      try {
        const pResult = await getStoragePath();
        if (pResult.ok) {
          setStoragePath(pResult.value.path);
        } else {
          setStoragePath('Unavailable (Cloud Mode)');
        }
      } catch (err) {
        console.error('Failed to load storage path:', err);
        setStoragePath('Unavailable (Cloud Mode)');
      }

      // 4. IndexedDB history
      try {
        const localItems = await getGenerationsLocal();
        const initialBestTakes: Record<string, string> = {};
        const formattedItems = localItems.map(item => {
          const url = URL.createObjectURL(item.audioBlob);
          if (item.metadata.isBestTake && item.metadata.groupId) {
            initialBestTakes[item.metadata.groupId] = item.metadata.id;
          }
          return {
            ...item.metadata,
            audioUrl: url,
            existsOnServer: true
          } as HistoryItem;
        });
        setHistoryItems(formattedItems);
        setBestTakes(initialBestTakes);
      } catch (e) {
        console.error('Failed to load history from IndexedDB:', e);
      }

      // 4.5. Load Projects
      try {
        const localProjects = await getProjectsLocal();
        setProjects(localProjects);
        const lastActiveProjId = localStorage.getItem('tts-workbench-active-project-id');
        if (lastActiveProjId) {
          if (lastActiveProjId === 'all') {
            setActiveProjectId(null);
          } else if (localProjects.some(p => p.id === lastActiveProjId)) {
            setActiveProjectId(lastActiveProjId);
          }
        }
      } catch (e) {
        console.error('Failed to load projects from IndexedDB:', e);
      }

      // 5. Detect hosting
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        setIsHosted(host !== 'localhost' && host !== '127.0.0.1');
      }
      
      // (Synchronous local storage settings were moved to the top of loadData for instant paint)

      // 7. Load Subscription Info
      try {
        const subResult = await getSubscriptionInfo();
        if (subResult.ok) {
          setSubInfo(subResult.value);
        }
      } catch (e) {
        console.warn('Could not load subscription details:', e);
      }

      // 10. Request Persistent Storage
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persisted => {
          if (persisted) {
            console.log("Storage is persisted and protected from eviction.");
          } else {
            console.warn("Storage persistence denied by browser.");
          }
        }).catch(err => {
          console.warn("Failed to request persistent storage:", err);
        });
      }
      setIsLoaded(true);
    }

    loadData();
  }, [apiKey]);

  // Handle auto-model selection when switching tabs (e.g. STS models for Voice-to-Voice)
  useEffect(() => {
    if (activeTab === 'voice2voice') {
      const hasSts = models.some(m => m.model_id === 'eleven_multilingual_sts_v2');
      if (hasSts) {
        setSelectedModelId('eleven_multilingual_sts_v2');
      } else {
        const firstSts = models.find(m => m.model_id.includes('sts'));
        if (firstSts) {
          setSelectedModelId(firstSts.model_id);
        }
      }
    } else {
      const hasV3 = models.some(m => m.model_id === 'eleven_v3');
      if (hasV3) {
        setSelectedModelId('eleven_v3');
      }
    }
  }, [activeTab, models]);

  // Global Keyboard Hotkeys Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter -> Trigger generation
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (activeTab === 'expressive') {
          if (!isGenerating && text.trim() && selectedVoiceId) {
            handleGenerate();
          }
        } else if (activeTab === 'chunking') {
          if (!isGeneratingChunks && chunkText.trim() && selectedVoiceId) {
            handleGenerateChunks();
          }
        } else if (activeTab === 'dialogue') {
          const runDialogueBtn = document.getElementById('dialogue-generate-btn') as HTMLButtonElement | null;
          runDialogueBtn?.click();
        } else if (activeTab === 'voice2voice') {
          if (!isConvertingSTS && stsSourceAudioBase64 && selectedVoiceId) {
            handleGenerateSTS();
          }
        }
      }

      // Space -> Toggle play/pause of the active preview audio
      if (e.key === ' ' || e.code === 'Space') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable || 
                        target.tagName === 'SELECT';
        if (!isInput) {
          e.preventDefault();
          const mainAudio = document.querySelector('audio') as HTMLAudioElement | null;
          if (mainAudio) {
            if (mainAudio.paused) {
              mainAudio.play().catch(() => {});
            } else {
              mainAudio.pause();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, text, chunkText, selectedVoiceId, isGenerating, isGeneratingChunks, isConvertingSTS, stsSourceAudioBase64]);

  // Helper to convert base64 to Blob and local Object URL
  const base64ToBlob = (base64: string, filename: string): { blob: Blob; url: string } => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    let contentType = 'audio/mpeg';
    if (filename.endsWith('.wav')) {
      contentType = 'audio/wav';
    } else if (filename.endsWith('.pcm')) {
      contentType = 'audio/pcm';
    } else if (filename.endsWith('.opus')) {
      contentType = 'audio/opus';
    }
    
    const blob = new Blob([byteArray], { type: contentType });
    const url = URL.createObjectURL(blob);
    return { blob, url };
  };

  // Save history helper
  const saveToHistory = async (
    item: Omit<HistoryItem, 'createdAt' | 'existsOnServer' | 'audioUrl' | 'projectId'>,
    audioBase64: string
  ) => {
    try {
      const { blob, url } = base64ToBlob(audioBase64, item.filename);
      await saveGenerationLocal({ ...item, projectId: activeProjectId }, blob);
      
      const newItem: HistoryItem = {
        ...item,
        projectId: activeProjectId,
        audioUrl: url,
        createdAt: new Date().toISOString(),
        existsOnServer: true
      };
      
      const updated = [newItem, ...historyItems].slice(0, 300);
      setHistoryItems(updated);
    } catch (e) {
      console.error('Failed to save to IndexedDB:', e);
      toast.error('Failed to save audio to browser database');
    }
  };

  // Preset loading helpers
  const applyPreset = (presetName: 'creative' | 'balanced' | 'robust') => {
    if (presetName === 'creative') {
      setStability(0.35);
      setSimilarityBoost(0.75);
      setStyle(0.35);
      setUseSpeakerBoost(true);
      setSpeed(1.0);
    } else if (presetName === 'balanced') {
      setStability(0.55);
      setSimilarityBoost(0.80);
      setStyle(0.20);
      setUseSpeakerBoost(true);
      setSpeed(1.0);
    } else if (presetName === 'robust') {
      setStability(0.80);
      setSimilarityBoost(0.90);
      setStyle(0.05);
      setUseSpeakerBoost(true);
      setSpeed(1.0);
    }
    toast.success(`Preset '${presetName}' applied`);
  };

  const replicateSettings = (item: HistoryItem) => {
    setSelectedModelId(item.modelId);
    setStability(item.stability);
    setSimilarityBoost(item.similarityBoost);
    setStyle(item.style);
    setSpeed(item.speed);
    setUseSpeakerBoost(item.useSpeakerBoost);
    setOutputFormat(item.outputFormat);
    setApplyTextNormalization(item.applyTextNormalization as 'auto' | 'on' | 'off');
    if (item.seed !== null) {
      setSeed(item.seed.toString());
      setIsSeedLocked(true);
    } else {
      setSeed('');
      setIsSeedLocked(false);
    }

    if (item.type === 'dialogue') {
      if (item.dialogueLines) {
        setDialogueLines(item.dialogueLines.map(line => ({ ...line, id: generateId() })));
      }
      setActiveTab('dialogue');
      toast.success('Dialogue settings and rows replicated from history!');
    } else if (item.type === 'chunked') {
      setSelectedVoiceId(item.voiceId);
      const cleanText = item.text.replace(/^\[Chunk \d+\/\d+\] /, '');
      setText(cleanText);
      if (item.chunkText) {
        setChunkText(item.chunkText);
      }
      if (item.chunks) {
        setChunks(item.chunks);
      }
      setActiveTab('chunking');
      toast.success('Chunk Narration settings and script replicated from history!');
    } else if (item.type === 'sts') {
      setSelectedVoiceId(item.voiceId);
      setActiveTab('voice2voice');
      toast.success('Voice-to-Voice settings replicated from history!');
    } else {
      setSelectedVoiceId(item.voiceId);
      setText(item.text);
      setActiveTab('expressive');
      toast.success('TTS settings and script replicated from history!');
    }
  };

  // Cursor-aware insertion of emotional tags
  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = text;
    const newText = currentText.substring(0, start) + ' ' + tag + ' ' + currentText.substring(end);
    
    setText(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 10);
  };

  // Star/Favorite toggle
  const toggleFavorite = (id: string) => {
    let nextFavs = [...favoriteVoices];
    if (nextFavs.includes(id)) {
      nextFavs = nextFavs.filter(f => f !== id);
    } else {
      nextFavs.push(id);
    }
    setFavoriteVoices(nextFavs);
    localStorage.setItem('tts-workbench-favorites', JSON.stringify(nextFavs));
  };

  // Preview Voice Sample
  const handleVoicePreview = (previewUrl: string | undefined, id: string) => {
    if (!previewUrl) {
      toast.error('Voice preview not available');
      return;
    }

    if (previewingVoiceId === id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingVoiceId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    const audio = new Audio(previewUrl);
    audio.volume = globalVolume;
    previewAudioRef.current = audio;
    audio.play();
    setPreviewingVoiceId(id);

    audio.onended = () => {
      setPreviewingVoiceId(null);
    };
  };

  // Generate main TTS
  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text');
      return;
    }
    if (!selectedVoiceId) {
      toast.error('Please select a voice');
      return;
    }

    setIsGenerating(true);
    setCurrentResult(null);

    const isMultiple = takesCount > 1;
    const groupId = isMultiple ? 'group_' + Math.random().toString(36).substring(2, 11) : null;
    const vName = voices.find(v => v.voiceId === selectedVoiceId)?.name || 'Unknown';

    // Prepare requests array
    const requests = [];
    const seedNum = seed.trim() !== '' ? Number(seed) : null;

    for (let t = 0; t < takesCount; t++) {
      const takeSeed = (seedNum !== null)
        ? (isMultiple && !isSeedLocked ? Math.floor(Math.random() * 4294967295) : seedNum)
        : Math.floor(Math.random() * 4294967295);

      const reqPayload: TtsWorkbenchRequest = {
        text,
        voiceId: selectedVoiceId,
        modelId: selectedModelId,
        stability,
        similarityBoost,
        style,
        speed,
        useSpeakerBoost,
        seed: takeSeed,
        outputFormat,
        applyTextNormalization,
        withTimestamps
      };
      
      requests.push({ payload: reqPayload, seed: takeSeed });
    }

    try {
      const results = await Promise.all(
        requests.map(async (req, idx) => {
          try {
            const res = await generateSpeechWorkbench(req.payload);
            return { ok: true as const, value: res, seed: req.seed, idx };
          } catch (err) {
            return { ok: false as const, error: err, idx, value: undefined, seed: undefined };
          }
        })
      );

      let successCount = 0;
      let lastSuccessResult = null;

      for (const r of results) {
        if (r.ok && r.value && r.value.ok) {
          const data = r.value.value;
          const { url } = base64ToBlob(data.audioBase64, data.filename);

          lastSuccessResult = {
            ...data,
            seed: r.seed,
            voiceName: vName,
            text,
            audioUrl: url
          };

          await saveToHistory({
            id: data.id,
            type: 'tts',
            text,
            voiceId: selectedVoiceId,
            voiceName: vName,
            modelId: selectedModelId,
            seed: r.seed,
            stability,
            similarityBoost,
            style,
            speed,
            useSpeakerBoost,
            outputFormat,
            applyTextNormalization,
            requestId: data.requestId,
            characterCost: data.characterCost,
            filename: data.filename,
            alignmentFilename: data.alignmentFilename,
            processingTimeMs: data.processingTimeMs,
            sizeBytes: data.sizeBytes,
            groupId,
            takeNumber: isMultiple ? r.idx + 1 : undefined
          }, data.audioBase64);

          // Update local session stats and subscription info locally
          setSessionStats(prev => ({
            charactersUsed: prev.charactersUsed + (data.characterCost || 0),
            generationsCount: prev.generationsCount + 1
          }));
          setSubInfo(prev => prev ? {
            ...prev,
            characterCount: Math.min(prev.characterLimit, prev.characterCount + (data.characterCost || 0))
          } : null);

          successCount++;
        } else {
          let errStr = 'API Error';
          if (!r.ok) {
            errStr = String(r.error);
          } else if (r.value && !r.value.ok) {
            errStr = r.value.error;
          }
          console.error(`Failed to generate take ${r.idx + 1}:`, errStr);
          handleApiError(errStr);
        }
      }

      if (successCount === 0) {
        toast.error('Failed to generate speech. Please check API Key or parameters.');
      } else {
        toast.success(`Successfully generated ${successCount} take(s)!`);
        if (lastSuccessResult) {
          setCurrentResult(lastSuccessResult);
        }
        
        if (!isMultiple && isSeedLocked && lastSuccessResult) {
          setSeed(lastSuccessResult.seed.toString());
        }
      }
    } catch (e) {
      console.error('Parallel generations failed:', e);
      toast.error('Failed to execute batch generation');
    } finally {
      setIsGenerating(false);
    }
  };

  // Dialogue Line management
  const addDialogueLine = () => {
    setDialogueLines([...dialogueLines, { id: generateId(), text: '', voiceId: selectedVoiceId }]);
  };

  const removeDialogueLine = (index: number) => {
    if (dialogueLines.length <= 1) return;
    const lines = [...dialogueLines];
    lines.splice(index, 1);
    setDialogueLines(lines);
  };

  const duplicateDialogueLine = (index: number) => {
    const lines = [...dialogueLines];
    const duplicatedLine = { ...lines[index], id: generateId() };
    lines.splice(index + 1, 0, duplicatedLine);
    setDialogueLines(lines);
  };

  const updateDialogueLine = (index: number, key: keyof DialogueLineInput, val: string) => {
    const lines = [...dialogueLines];
    lines[index] = { ...lines[index], [key]: val };
    setDialogueLines(lines);
  };

  // Generate Dialogue
  const handleGenerateDialogue = async () => {
    const invalid = dialogueLines.some(l => !l.text.trim() || !l.voiceId);
    if (invalid) {
      toast.error('Please complete all dialogue rows (voice selection and text)');
      return;
    }

    setIsGenerating(true);
    setCurrentResult(null);

    const generatedSeed = seed.trim() !== '' ? Number(seed) : Math.floor(Math.random() * 4294967295);

    const res = await createDialogueWorkbench({
      inputs: dialogueLines,
      modelId: selectedModelId,
      seed: generatedSeed
    });

    setIsGenerating(false);

    if (res.ok) {
      const data = res.value;
      const combinedText = dialogueLines.map(l => {
        const vName = voices.find(v => v.voiceId === l.voiceId)?.name || 'Voice';
        return `[${vName}]: ${l.text}`;
      }).join('\n');

      const { url } = base64ToBlob(data.audioBase64, data.filename);
      
      setCurrentResult({
        ...data,
        seed: generatedSeed,
        voiceName: 'Dialogue Session',
        text: combinedText,
        audioUrl: url
      });

      saveToHistory({
        id: data.id,
        type: 'dialogue',
        text: combinedText,
        voiceId: 'dialogue',
        voiceName: 'Dialogue (Multi-voice)',
        modelId: selectedModelId,
        seed: generatedSeed,
        stability: 0,
        similarityBoost: 0,
        style: 0,
        speed: 1,
        useSpeakerBoost: true,
        outputFormat: 'mp3_44100_128',
        applyTextNormalization: 'auto',
        requestId: data.requestId,
        characterCost: data.characterCost,
        filename: data.filename,
        processingTimeMs: data.processingTimeMs,
        sizeBytes: data.sizeBytes,
        dialogueLines: [...dialogueLines]
      }, data.audioBase64);

      toast.success('Dialogue session mixed successfully!');
    } else {
      if (!handleApiError(res.error)) {
        toast.error(res.error);
      }
    }
  };

  // Voice-to-Voice (Speech-to-Speech) Audio Recording & Processing
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setStsSourceAudioUrl(url);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64Raw = base64data.split(',')[1];
          setStsSourceAudioBase64(base64Raw);
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.info('Recording started...');
    } catch (err) {
      console.error('Microphone access failed:', err);
      toast.error('Failed to access microphone. Please check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      toast.success('Recording stopped. Audio captured.');
    }
  };

  const handleStsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Audio file is too large. Maximum size is 10MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    setStsSourceAudioUrl(url);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64Raw = base64data.split(',')[1];
      setStsSourceAudioBase64(base64Raw);
      toast.success(`Audio file "${file.name}" loaded successfully.`);
    };
  };

  const handleGenerateSTS = async () => {
    if (!stsSourceAudioBase64) {
      toast.error('Please record audio or upload an audio file first.');
      return;
    }
    if (!selectedVoiceId) {
      toast.error('Please select a target voice.');
      return;
    }

    setIsConvertingSTS(true);
    setCurrentResult(null);

    const res = await generateSpeechToSpeech({
      audioBase64: stsSourceAudioBase64,
      voiceId: selectedVoiceId,
      modelId: selectedModelId || 'eleven_multilingual_sts_v2',
      stability,
      similarityBoost,
      style,
      useSpeakerBoost,
      outputFormat,
      removeBackgroundNoise
    });

    setIsConvertingSTS(false);

    if (res.ok) {
      const data = res.value;
      const vName = voices.find(v => v.voiceId === selectedVoiceId)?.name || 'Unknown';
      const { url } = base64ToBlob(data.audioBase64, data.filename);

      const combinedText = `[Voice-to-Voice conversion to ${vName}]`;

      setCurrentResult({
        ...data,
        seed: null,
        voiceName: vName,
        text: combinedText,
        audioUrl: url
      });

      saveToHistory({
        id: data.id,
        type: 'sts',
        text: combinedText,
        voiceId: selectedVoiceId,
        voiceName: vName,
        modelId: selectedModelId || 'eleven_multilingual_sts_v2',
        seed: null,
        stability,
        similarityBoost,
        style,
        speed: 1.0,
        useSpeakerBoost,
        outputFormat,
        applyTextNormalization: 'auto',
        requestId: data.requestId,
        characterCost: data.characterCost,
        filename: data.filename,
        processingTimeMs: data.processingTimeMs,
        sizeBytes: data.sizeBytes
      }, data.audioBase64);

      toast.success('Speech-to-Speech converted successfully!');
    } else {
      if (!handleApiError(res.error)) {
        toast.error(res.error);
      }
    }
  };

  // Chunking splits helper
  const handleSplitChunks = () => {
    if (!chunkText.trim()) return;
    
    let result: string[] = [];
    
    if (splitMethod === 'paragraphs') {
      result = chunkText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    } else if (splitMethod === 'lines') {
      result = chunkText.split(/\n/).map(p => p.trim()).filter(Boolean);
    } else if (splitMethod === 'sentences') {
      const sentences = chunkText.match(/[^.!?]+[.!?]+(\s|$)/g) || [chunkText];
      result = sentences.map(s => s.trim()).filter(Boolean);
    } else if (splitMethod === 'smart') {
      // Group sentences to match ~1000 characters limit for smooth narration
      const maxLen = 1000;
      const sentences = chunkText.match(/[^.!?]+[.!?]+(\s|$)/g) || [chunkText];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        
        if ((currentChunk + ' ' + trimmed).length > maxLen) {
          if (currentChunk) {
            result.push(currentChunk.trim());
            currentChunk = trimmed;
          } else {
            const words = trimmed.split(/\s+/);
            let wordChunk = '';
            for (const word of words) {
              if ((wordChunk + ' ' + word).length > maxLen) {
                result.push(wordChunk.trim());
                wordChunk = word;
              } else {
                wordChunk = wordChunk ? wordChunk + ' ' + word : word;
              }
            }
            if (wordChunk) {
              currentChunk = wordChunk;
            }
          }
        } else {
          currentChunk = currentChunk ? currentChunk + ' ' + trimmed : trimmed;
        }
      }
      if (currentChunk) {
        result.push(currentChunk.trim());
      }
    }
    
    setChunks(result);
    toast.success(`Text split into ${result.length} chunks using '${splitMethod}' method.`);
  };

  // Sequential chunk generate (with stitching for v2, context for v3)
  const handleGenerateChunks = async () => {
    if (chunks.length === 0) return;
    setIsGeneratingChunks(true);
    const reqIds: string[] = [];
    
    const isV3 = selectedModelId === 'eleven_v3';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const previousStitchIds = isV3 ? [] : reqIds.slice(-3); // max 3 previous
      const currentSeed = seed.trim() !== '' ? Number(seed) : Math.floor(Math.random() * 4294967295);

      toast.info(`Generating chunk ${i + 1}/${chunks.length}...`);

      const reqPayload: TtsWorkbenchRequest = {
        text: chunk,
        voiceId: selectedVoiceId,
        modelId: selectedModelId,
        stability,
        similarityBoost,
        style,
        speed,
        useSpeakerBoost,
        seed: currentSeed,
        outputFormat,
        applyTextNormalization,
        previousText: i > 0 ? chunks[i - 1] : undefined,
        nextText: i < chunks.length - 1 ? chunks[i + 1] : undefined,
        previousRequestIds: previousStitchIds.length > 0 ? previousStitchIds : undefined
      };

      const res = await generateSpeechWorkbench(reqPayload);
      if (res.ok) {
        const data = res.value;
        if (data.requestId) {
          reqIds.push(data.requestId);
        }
        
        const vName = voices.find(v => v.voiceId === selectedVoiceId)?.name || 'Unknown';
        
        saveToHistory({
          id: data.id,
          type: 'chunked',
          text: `[Chunk ${i+1}/${chunks.length}] ${chunk}`,
          voiceId: selectedVoiceId,
          voiceName: vName,
          modelId: selectedModelId,
          seed: currentSeed,
          stability,
          similarityBoost,
          style,
          speed,
          useSpeakerBoost,
          outputFormat,
          applyTextNormalization,
          requestId: data.requestId,
          characterCost: data.characterCost,
          filename: data.filename,
          processingTimeMs: data.processingTimeMs,
          sizeBytes: data.sizeBytes,
          chunkText: chunkText,
          chunks: chunks
        }, data.audioBase64);
      } else {
        if (handleApiError(res.error)) {
          break;
        }
        toast.error(`Failed on chunk ${i + 1}: ${res.error}`);
        break;
      }
    }
    
    setIsGeneratingChunks(false);
    toast.success('Chunk generation sequence completed!');
  };

  // Clear Server Files & Local history
  const handleClearServerCache = async () => {
    if (confirm('Are you sure you want to clear all audio files on disk and browser history?')) {
      try {
        await clearCache();
      } catch (e) {
        console.warn('Failed to clear server filesystem cache:', e);
      }
      try {
        await clearGenerationsLocal();
        setHistoryItems([]);
        toast.success('Local browser history and server cache cleared.');
      } catch (err) {
        console.error('Failed to clear IndexedDB:', err);
        toast.error('Failed to clear browser database.');
      }
    }
  };

  // Group history items by session/batch groupId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupHistoryItems = (items: HistoryItem[]): any[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped: any[] = [];
    const groupMap = new Map<string, HistoryItem[]>();

    for (const item of items) {
      if (item.groupId) {
        if (!groupMap.has(item.groupId)) {
          groupMap.set(item.groupId, []);
        }
        groupMap.get(item.groupId)!.push(item);
      } else {
        grouped.push({
          id: item.id,
          isGroup: false,
          groupId: null,
          items: [item],
          type: item.type,
          text: item.text,
          voiceName: item.voiceName,
          createdAt: item.createdAt
        });
      }
    }

    groupMap.forEach((groupItems, gId) => {
      // Sort oldest take first (Take 1, Take 2, etc)
      groupItems.sort((a, b) => (a.takeNumber || 0) - (b.takeNumber || 0));
      
      const newest = [...groupItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      grouped.push({
        id: gId,
        isGroup: true,
        groupId: gId,
        items: groupItems,
        type: newest.type,
        text: newest.text,
        voiceName: newest.voiceName,
        createdAt: newest.createdAt
      });
    });

    grouped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return grouped;
  };

  // Select best take in group, saving choice to IndexedDB
  const handleSelectBestTake = async (groupId: string, takeId: string, groupItems: HistoryItem[]) => {
    setBestTakes(prev => ({ ...prev, [groupId]: takeId }));
    setHistoryItems(prev => prev.map(item => {
      if (item.groupId === groupId) {
        return { ...item, isBestTake: item.id === takeId };
      }
      return item;
    }));
    try {
      for (const item of groupItems) {
        await updateGenerationLocal(item.id, { isBestTake: item.id === takeId });
      }
      toast.success('Favorite take updated in database');
    } catch (e) {
      console.error('Failed to save best take selection to DB:', e);
    }
  };

  // Delete all takes in group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeleteHistoryGroup = async (group: any) => {
    if (confirm('Delete all takes in this group from browser storage?')) {
      try {
        for (const item of group.items) {
          await deleteGenerationLocal(item.id);
        }
        setHistoryItems(prev => prev.filter(item => item.groupId !== group.groupId));
        toast.success('Group deleted from storage');
      } catch (e) {
        console.error(e);
        toast.error('Failed to delete group');
      }
    }
  };

  // Clear rejects in take group, keeping only the best/selected take
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClearRejects = async (group: any) => {
    const keepId = bestTakes[group.groupId || ''] || group.items[0]?.id;
    if (!keepId) return;

    const matchedItem = group.items.find((i: HistoryItem) => i.id === keepId);
    const keepName = matchedItem?.takeNumber 
      ? `Take ${matchedItem.takeNumber}` 
      : 'selected take';

    if (confirm(`Keep only ${keepName} and delete all other takes in this group?`)) {
      try {
        const toDelete = group.items.filter((item: HistoryItem) => item.id !== keepId);
        for (const item of toDelete) {
          await deleteGenerationLocal(item.id);
        }
        setHistoryItems(prev => prev.filter(item => item.groupId !== group.groupId || item.id === keepId));
        toast.success(`Cleaned up group! Kept ${keepName}.`);
      } catch (e) {
        console.error(e);
        toast.error('Failed to clean up group');
      }
    }
  };

  // Download logic to force direct download in browser
  const triggerBrowserDownload = async (filename: string, localBlobUrl?: string) => {
    try {
      let downloadUrl = localBlobUrl;
      if (!downloadUrl) {
        const res = await fetch(`/api/audio/${filename}`);
        if (!res.ok) throw new Error('File not available on server anymore');
        const blob = await res.blob();
        downloadUrl = window.URL.createObjectURL(blob);
      }
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('File has been pruned from the local folder cache (exceeded 80 files limit).');
    }
  };

  // Delete individual history item
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await deleteGenerationLocal(id);
      const updated = historyItems.filter(item => item.id !== id);
      setHistoryItems(updated);
      
      // Garbage collection for starred takes
      setStarredTakeIds(prev => {
        if (prev.includes(id)) {
          const next = prev.filter(x => x !== id);
          localStorage.setItem('tts-workbench-starred-takes', JSON.stringify(next));
          return next;
        }
        return prev;
      });
      
      toast.success('Take deleted from browser storage');
    } catch (e) {
      console.error('Failed to delete history item:', e);
      toast.error('Failed to delete item');
    }
  };

  // Create workspace project
  const handleCreateProject = async (name: string, description?: string) => {
    if (!name.trim()) return;
    const newProj: ClientProject = {
      id: 'proj_' + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      description: description?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await saveProjectLocal(newProj);
      setProjects(prev => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
      localStorage.setItem('tts-workbench-active-project-id', newProj.id);
      toast.success(`Project "${name}" created!`);
    } catch (e) {
      console.error('Failed to create project:', e);
      toast.error('Failed to create project');
    }
  };

  // Delete workspace project
  const handleDeleteProject = async (projectId: string) => {
    const projName = projects.find(p => p.id === projectId)?.name || 'Project';
    if (confirm(`Are you sure you want to delete project "${projName}"? All audio recordings in this project will be deleted from browser storage!`)) {
      try {
        const projectItems = historyItems.filter(item => item.projectId === projectId);
        const projectItemIds = projectItems.map(item => item.id);
        
        await deleteProjectLocal(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setHistoryItems(prev => prev.filter(item => item.projectId !== projectId));
        
        // Garbage collection for starred takes belonging to the deleted project
        setStarredTakeIds(prev => {
          const next = prev.filter(id => !projectItemIds.includes(id));
          localStorage.setItem('tts-workbench-starred-takes', JSON.stringify(next));
          return next;
        });
        
        if (activeProjectId === projectId) {
          setActiveProjectId(null);
          localStorage.setItem('tts-workbench-active-project-id', 'all');
        }
        toast.success(`Project "${projName}" deleted.`);
      } catch (e) {
        console.error('Failed to delete project:', e);
        toast.error('Failed to delete project');
      }
    }
  };



  // Export full Workspace backup (ZIP format - memory safe)
  const handleExportWorkspace = async () => {
    setIsExportingWorkspace(true);
    toast.info('Preparing memory-safe ZIP workspace backup... Please wait.');
    try {
      const localProjects = await getProjectsLocal();
      const localVoices = await getCustomVoicesLocal();
      const localGens = await getGenerationsLocal();

      const zip = new JSZip();

      const backupMetadata = {
        version: 2, // ZIP archive format
        exportedAt: new Date().toISOString(),
        projects: localProjects,
        customVoices: localVoices,
        customTags: customTags,
        generations: localGens.map(g => ({
          metadata: g.metadata
        }))
      };

      zip.file("workspace-metadata.json", JSON.stringify(backupMetadata, null, 2));

      const audioFolder = zip.folder("audio");
      if (audioFolder) {
        for (const item of localGens) {
          const extension = item.metadata.filename.split('.').pop() || 'wav';
          audioFolder.file(`${item.metadata.id}.${extension}`, item.audioBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(zipBlob);
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", url);
      dlAnchorElem.setAttribute("download", `elevenlabs-workbench-backup-${new Date().toISOString().split('T')[0]}.zip`);
      dlAnchorElem.click();
      URL.revokeObjectURL(url);
      
      toast.success('Workspace ZIP exported successfully!');
    } catch (e) {
      console.error('Failed to export workspace:', e);
      toast.error('Failed to export workspace ZIP');
    } finally {
      setIsExportingWorkspace(false);
    }
  };

  // Import Workspace backup (Supports new ZIP format and legacy JSON fallback)
  const handleImportWorkspace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info('Reading backup file...');

    if (file.name.endsWith('.json')) {
      toast.info('Legacy JSON backup detected. Processing fallback import...');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.version !== 1 || !json.generations) {
            toast.error('Invalid backup file version or format');
            return;
          }

          if (confirm('Importing this legacy JSON workspace will merge projects, voices, and audio history. Continue?')) {
            if (json.projects && Array.isArray(json.projects)) {
              for (const p of json.projects) {
                await saveProjectLocal(p);
              }
            }

            if (json.customVoices && Array.isArray(json.customVoices)) {
              await saveCustomVoicesBulkLocal(json.customVoices);
            }

            if (json.customTags && Array.isArray(json.customTags)) {
              const currentSaved = localStorage.getItem('tts-workbench-custom-tags');
              let existingList = [];
              if (currentSaved) {
                try { existingList = JSON.parse(currentSaved); } catch (e) { console.warn(e); }
              }
              const mergedTags = [...existingList];
              for (const tag of json.customTags) {
                if (tag && tag.tag && !mergedTags.some(t => t.tag.toLowerCase() === tag.tag.toLowerCase())) {
                  mergedTags.push(tag);
                }
              }
              localStorage.setItem('tts-workbench-custom-tags', JSON.stringify(mergedTags));
            }

            toast.info(`Importing ${json.generations.length} speech recordings...`);
            for (const gen of json.generations) {
              const byteCharacters = atob(gen.audioBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              
              let contentType = 'audio/mpeg';
              if (gen.metadata.filename.endsWith('.wav')) contentType = 'audio/wav';
              else if (gen.metadata.filename.endsWith('.pcm')) contentType = 'audio/pcm';
              else if (gen.metadata.filename.endsWith('.opus')) contentType = 'audio/opus';

              const audioBlob = new Blob([byteArray], { type: contentType });
              await saveGenerationLocal(gen.metadata, audioBlob);
            }

            toast.success('Workspace imported successfully! Reloading...');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to parse legacy JSON backup file.');
        }
      };
      reader.readAsText(file);
      return;
    }

    if (!file.name.endsWith('.zip')) {
      toast.error('Unsupported file format. Please upload a .zip or legacy .json backup.');
      return;
    }

    try {
      const zip = await JSZip.loadAsync(file);
      const metadataFile = zip.file("workspace-metadata.json");
      if (!metadataFile) {
        toast.error('Invalid workspace archive: workspace-metadata.json missing');
        return;
      }

      const metadataText = await metadataFile.async("text");
      const json = JSON.parse(metadataText);

      if (json.version !== 2 || !json.generations) {
        toast.error('Invalid workspace backup version or format');
        return;
      }

      if (confirm(`Importing this workspace will merge ${json.projects?.length || 0} projects, ${json.customVoices?.length || 0} voices, and ${json.generations?.length || 0} audio clips. Continue?`)) {
        if (json.projects && Array.isArray(json.projects)) {
          for (const p of json.projects) {
            await saveProjectLocal(p);
          }
        }

        if (json.customVoices && Array.isArray(json.customVoices)) {
          await saveCustomVoicesBulkLocal(json.customVoices);
        }

        if (json.customTags && Array.isArray(json.customTags)) {
          const currentSaved = localStorage.getItem('tts-workbench-custom-tags');
          let existingList = [];
          if (currentSaved) {
            try { existingList = JSON.parse(currentSaved); } catch (e) { console.warn(e); }
          }
          const mergedTags = [...existingList];
          for (const tag of json.customTags) {
            if (tag && tag.tag && !mergedTags.some(t => t.tag.toLowerCase() === tag.tag.toLowerCase())) {
              mergedTags.push(tag);
            }
          }
          localStorage.setItem('tts-workbench-custom-tags', JSON.stringify(mergedTags));
        }

        toast.info(`Importing ${json.generations.length} speech recordings from archive...`);
        for (const gen of json.generations) {
          const extension = gen.metadata.filename.split('.').pop() || 'wav';
          const zipAudioFile = zip.file(`audio/${gen.metadata.id}.${extension}`);
          if (!zipAudioFile) {
            console.warn(`Audio file missing in ZIP for generation ${gen.metadata.id}`);
            continue;
          }

          const audioBlob = await zipAudioFile.async("blob");
          await saveGenerationLocal(gen.metadata, audioBlob);
        }

        toast.success('Workspace imported successfully! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to parse ZIP workspace backup:', err);
      toast.error('Failed to parse ZIP workspace backup file.');
    }
  };

  // Convert AudioBuffer to WAV Blob helper
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * 2 * numOfChan + 44;
    const bufferData = new ArrayBuffer(length);
    const view = new DataView(bufferData);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // chunk length
    setUint16(1); // sample format (raw PCM)
    setUint16(numOfChan); // channel count
    setUint32(buffer.sampleRate); // sample rate
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate (sample rate * block align)
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample
    setUint32(0x61746164); // "data" chunk header
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferData], { type: 'audio/wav' });
  };

  // Stitch audio elements together locally using Web Audio API
  const handleMergeAudio = async () => {
    if (assemblyQueue.length === 0) {
      toast.error('Assembly queue is empty');
      return;
    }

    setIsMergingAudio(true);
    toast.info('Starting client-side audio stitching...');
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const decodedBuffers: AudioBuffer[] = [];
      for (const item of assemblyQueue) {
        const matched = historyItems.find(h => h.id === item.id);
        if (!matched) continue;
        
        const response = await fetch(matched.audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        decodedBuffers.push(audioBuffer);
      }

      if (decodedBuffers.length === 0) {
        throw new Error('No audio buffers decoded');
      }

      const sampleRate = decodedBuffers[0].sampleRate;
      const numOfChannels = Math.max(...decodedBuffers.map(b => b.numberOfChannels));
      const pauseSamples = Math.floor((assemblyPauseMs / 1000) * sampleRate);
      
      let totalSamples = 0;
      for (let i = 0; i < decodedBuffers.length; i++) {
        totalSamples += decodedBuffers[i].length;
        if (i < decodedBuffers.length - 1) {
          totalSamples += pauseSamples;
        }
      }

      const mergedBuffer = audioCtx.createBuffer(numOfChannels, totalSamples, sampleRate);

      for (let channel = 0; channel < numOfChannels; channel++) {
        const channelData = mergedBuffer.getChannelData(channel);
        let currentOffset = 0;

        for (let i = 0; i < decodedBuffers.length; i++) {
          const b = decodedBuffers[i];
          if (channel < b.numberOfChannels) {
            const sourceData = b.getChannelData(channel);
            channelData.set(sourceData, currentOffset);
          }
          currentOffset += b.length;
          if (i < decodedBuffers.length - 1) {
            currentOffset += pauseSamples;
          }
        }
      }

      const wavBlob = bufferToWav(mergedBuffer);
      const downloadUrl = URL.createObjectURL(wavBlob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `stitched-audio-${new Date().toISOString().split('T')[0]}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success('Audio stitched and downloaded successfully!');
    } catch (err) {
      console.error('Audio merging failed:', err);
      toast.error('Stitching failed. Make sure your browser supports Web Audio decoding.');
    } finally {
      setIsMergingAudio(false);
    }
  };

  // Delete saved custom voice from memory
  const deleteCustomVoice = async (voiceIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Remove this custom voice from your saved list?')) {
      setVoices(prev => prev.filter(v => v.voiceId !== voiceIdToDelete));
      try {
        await deleteCustomVoiceLocal(voiceIdToDelete);
      } catch (err) {
        console.error('Failed to delete custom voice:', err);
      }
      if (selectedVoiceId === voiceIdToDelete) {
        setSelectedVoiceId('');
      }
      toast.success('Custom voice removed from saved memory.');
    }
  };

  // Execute bulk import of Voice IDs
  const executeBulkImport = async () => {
    const rawIds = bulkImportText.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean);
    const validIds = rawIds.filter(id => /^[a-zA-Z0-9_-]{15,35}$/.test(id));

    if (validIds.length === 0) {
      toast.error('No valid ElevenLabs Voice IDs found. Ensure they are 15-35 characters long.');
      return;
    }

    const voicesToImport: CustomVoice[] = validIds.map(id => ({
      voiceId: id,
      name: `Imported (${id.substring(0, 5)}...)`,
      labels: { gender: 'custom', accent: 'bulk' },
      isCustom: true
    }));

    try {
      await saveCustomVoicesBulkLocal(voicesToImport);
      setVoices(prev => {
        const merged = [...prev];
        for (const nv of voicesToImport) {
          if (!merged.some(v => v.voiceId === nv.voiceId)) {
            merged.push(nv);
          }
        }
        return merged;
      });
      toast.success(`Successfully imported ${voicesToImport.length} custom voices to browser DB!`);
      setBulkImportText('');
      setIsImportOpen(false);
    } catch (err) {
      console.error('Failed to bulk import voices:', err);
      toast.error('Failed to import voices into database.');
    }
  };

  // Export custom voices as JSON file
  const handleExportVoices = async () => {
    try {
      const list = await getCustomVoicesLocal();
      if (list.length === 0) {
        toast.info('No custom voices in memory to export.');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(list, null, 2));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", "elevenlabs-custom-voices.json");
      dlAnchorElem.click();
      toast.success('Successfully exported custom voices list.');
    } catch (err) {
      console.error('Failed to export custom voices:', err);
      toast.error('Failed to compile export file.');
    }
  };

  // Wipe all custom voices from memory
  const handleClearCustomVoices = async () => {
    if (confirm('Are you sure you want to delete ALL custom voices from browser storage? This cannot be undone.')) {
      try {
        await clearCustomVoicesLocal();
        setVoices(prev => prev.filter(v => !v.isCustom));
        setSelectedVoiceId(prev => {
          const stillExists = voices.some(v => v.voiceId === prev && !v.isCustom);
          return stillExists ? prev : '';
        });
        toast.success('All custom voices deleted from browser storage.');
      } catch (err) {
        console.error('Failed to clear custom voices:', err);
        toast.error('Failed to clear voices.');
      }
    }
  };

  // Copy text helper
  const handleCopyText = (id: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save current script text as a snippet template
  const saveSnippet = () => {
    if (!text.trim()) {
      toast.error('Script text is empty');
      return;
    }
    const title = prompt('Enter a short title for this text template:');
    if (!title) return;

    const newSnippet = {
      id: 'snip_' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      text: text.trim()
    };
    const updated = [...snippets, newSnippet];
    setSnippets(updated);
    localStorage.setItem('tts-workbench-snippets', JSON.stringify(updated));
    toast.success(`Snippet "${title}" saved!`);
  };

  // Delete snippet from library
  const deleteSnippet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = snippets.filter(s => s.id !== id);
    setSnippets(updated);
    localStorage.setItem('tts-workbench-snippets', JSON.stringify(updated));
    toast.success('Snippet deleted');
  };

  // Save custom emotional steering tag
  const saveCustomTag = () => {
    if (!newTagLabel.trim() || !newTagPrompt.trim()) {
      toast.error('Please enter both a label and a prompt.');
      return;
    }
    
    // Ensure tag is wrapped in brackets
    let tag = newTagPrompt.trim();
    if (!tag.startsWith('[')) tag = '[' + tag;
    if (!tag.endsWith(']')) tag = tag + ']';
    
    // Check if tag already exists in custom tags
    if (customTags.some(t => t.tag.toLowerCase() === tag.toLowerCase())) {
      toast.error('A custom tag with this steering prompt already exists.');
      return;
    }

    // Check if tag already exists in standard tags
    if (EMOTION_TAGS.some(t => t.tag.toLowerCase() === tag.toLowerCase())) {
      toast.error('A standard tag with this steering prompt already exists.');
      return;
    }
    
    const newTag = {
      label: newTagLabel.trim(),
      tag
    };
    
    const updated = [...customTags, newTag];
    setCustomTags(updated);
    localStorage.setItem('tts-workbench-custom-tags', JSON.stringify(updated));
    setNewTagLabel('');
    setNewTagPrompt('');
    setIsAddingTag(false);
    toast.success('Custom steering tag saved!');
  };

  // Delete custom emotional steering tag
  const deleteCustomTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTags.filter(t => t.tag !== tag);
    setCustomTags(updated);
    localStorage.setItem('tts-workbench-custom-tags', JSON.stringify(updated));
    toast.info('Custom steering tag deleted.');
  };

  // Toggle Zen Mode to hide descriptions
  const toggleZenMode = (checked: boolean) => {
    setZenMode(checked);
    localStorage.setItem('tts-workbench-zen-mode', JSON.stringify(checked));
    toast.info(checked ? 'Zen Mode activated' : 'Zen Mode deactivated');
  };

  const handleZoomChange = (level: number) => {
    const clamped = Math.max(80, Math.min(130, level));
    setZoomLevel(clamped);
    localStorage.setItem('tts-workbench-zoom-level', clamped.toString());
    document.documentElement.style.fontSize = `${(clamped / 100) * 16}px`;
  };

  const applyThemeColor = (color: 'zinc' | 'purple' | 'green' | 'blue' | 'amber') => {
    setThemeColor(color);
    localStorage.setItem('tts-workbench-theme-color', color);
    const html = document.documentElement;
    html.classList.remove('theme-purple', 'theme-green', 'theme-blue', 'theme-amber');
    if (color !== 'zinc') {
      html.classList.add(`theme-${color}`);
    }
    toast.success(`Theme: ${color === 'zinc' ? 'Default' : color}`);
  };

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    localStorage.setItem('tts-workbench-theme-mode', nextMode);
    const html = document.documentElement;
    if (nextMode === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    toast.success(`Mode: ${nextMode === 'dark' ? 'Dark' : 'Light'}`);
  };

  const toggleStarredTake = (id: string) => {
    setStarredTakeIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('tts-workbench-starred-takes', JSON.stringify(next));
      return next;
    });
  };

  // Filter voices by search and favorites
  const filteredVoices = voices.filter(v => {
    const matchesSearch = v.name?.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      v.voiceId.toLowerCase() === voiceSearch.toLowerCase() ||
      v.labels?.accent?.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      v.labels?.gender?.toLowerCase().includes(voiceSearch.toLowerCase());
    const matchesFavorite = !showFavoritesOnly || favoriteVoices.includes(v.voiceId);
    return matchesSearch && matchesFavorite;
  });

  const displayedVoices = filteredVoices.slice(0, voiceListLimit);

  // Filter models based on Speech-to-Speech support if active tab is voice2voice
  const filteredModels = models.filter(m => {
    if (activeTab === 'voice2voice') {
      return m.model_id.includes('sts') || m.model_id === 'eleven_multilingual_sts_v2' || m.model_id === 'eleven_english_sts_v2';
    }
    return true;
  });

  // Get a performance-optimized list of voices for a specific dialogue line to prevent dropdown lags
  const getDialogueLineVoices = (currentVoiceId: string) => {
    const list = voices.filter(v => v.isCustom || favoriteVoices.includes(v.voiceId) || v.voiceId === currentVoiceId);
    
    if (list.length < 30) {
      const standardPad = voices.filter(v => !v.isCustom && !favoriteVoices.includes(v.voiceId)).slice(0, 50);
      const merged = [...list];
      for (const sv of standardPad) {
        if (!merged.some(v => v.voiceId === sv.voiceId)) {
          merged.push(sv);
        }
      }
      return merged;
    }
    return list;
  };

  const displayedHistory = activeProjectId
    ? historyItems.filter(item => item.projectId === activeProjectId)
    : historyItems;

  const availableClips = displayedHistory.filter(h => h.existsOnServer);
  const filteredAvailableClips = showStarredClipsOnly 
    ? availableClips.filter(c => starredTakeIds.includes(c.id))
    : availableClips;

return (
    <div className="flex flex-col gap-6 p-2 sm:p-4 lg:p-8 max-w-[1920px] mx-auto bg-background text-foreground min-h-[100dvh] @container min-w-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes soundwave {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        .animate-soundwave-1 { animation: soundwave 0.6s ease-in-out infinite; }
        .animate-soundwave-2 { animation: soundwave 0.8s ease-in-out infinite; animation-delay: 0.15s; }
        .animate-soundwave-3 { animation: soundwave 0.7s ease-in-out infinite; animation-delay: 0.3s; }
      `}} />
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            ElevenLabs TTS Workbench
          </h1>
          {!zenMode && (
            <p className="text-sm text-zinc-400 mt-1">
              Polished workflow editor focusing on v3 models, seed lock, stitching, and 500-file smart local caching.
            </p>
          )}
        </div>
        {isHosted ? (
          <div className="flex flex-col items-end text-xs text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 shrink-0">
            <div className="flex items-center gap-1.5 font-medium text-purple-400">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Browser Sandbox
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5 hidden sm:inline text-right max-w-[200px] break-words">Files stored locally in browser IndexedDB</span>
          </div>
        ) : (
          <div className="flex flex-col items-end text-xs text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 shrink-0 min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-zinc-400">
              <FolderOpen className="h-3.5 w-3.5 text-zinc-400" />
              Local Directory:
            </div>
            <code className="text-purple-400 mt-0.5 max-w-[160px] xs:max-w-[220px] sm:max-w-[280px] truncate select-all">{storagePath}</code>
          </div>
        )}
      </div>

      {/* Navigation & Volume Row */}
      <div className="flex flex-col @6xl:flex-row justify-between items-stretch @6xl:items-center gap-4 min-w-0">
        {/* Tabs */}
        <div className="flex items-center p-1 bg-zinc-950/80 border border-zinc-850 rounded-lg max-w-3xl w-full @6xl:w-auto overflow-x-auto h-11 scrollbar-thin scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-500 [mask-image:linear-gradient(to_right,white_95%,transparent)] overscroll-contain touch-pan-x">
          <Button 
            variant={activeTab === 'expressive' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('expressive')}
            className="flex-1 rounded-md text-xs font-semibold shrink-0 h-9"
          >
            <Activity className="h-3.5 w-3.5 mr-1" />
            Expressive TTS
          </Button>
          <Button 
            variant={activeTab === 'chunking' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('chunking')}
            className="flex-1 rounded-md text-xs font-semibold shrink-0 h-9"
          >
            <Layers className="h-3.5 w-3.5 mr-1" />
            Chunk Narration
          </Button>
          <Button 
            variant={activeTab === 'dialogue' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('dialogue')}
            className="flex-1 rounded-md text-xs font-semibold shrink-0 h-9"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Dialogue
          </Button>
          <Button 
            variant={activeTab === 'voice2voice' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('voice2voice')}
            className="flex-1 rounded-md text-xs font-semibold shrink-0 h-9"
          >
            <Mic className="h-3.5 w-3.5 mr-1" />
            Voice-to-Voice
          </Button>
          <Button 
            variant={activeTab === 'assembly' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('assembly')}
            className="flex-1 rounded-md text-xs font-semibold shrink-0 h-9"
          >
            <FileAudio className="h-3.5 w-3.5 mr-1" />
            Audio Editor
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('history')}
            className="flex-1 rounded-md text-xs font-semibold shrink-0 h-9"
          >
            <History className="h-3.5 w-3.5 mr-1" />
            History ({displayedHistory.length})
          </Button>
        </div>

        {/* Combined Controls Toolbar (Volume, Zoom, Theme) */}
        <div className="flex flex-wrap sm:flex-row items-center gap-2.5 w-full @6xl:w-auto">
          {/* Theme Mode & Color Switcher */}
          <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-855 rounded-lg px-3 py-1.5 backdrop-blur-sm h-11 shrink-0 shadow-md">
            {/* Theme color circles */}
            <div className="flex items-center gap-1.5">
              {/* Zinc/Default */}
              <button 
                onClick={() => applyThemeColor('zinc')}
                className={`h-4 w-4 rounded-full bg-zinc-500 border border-zinc-400/30 transition-all ${themeColor === 'zinc' ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-950 scale-110' : 'hover:scale-105 cursor-pointer'}`}
                title="Default Theme"
              />
              {/* Midnight Purple */}
              <button 
                onClick={() => applyThemeColor('purple')}
                className={`h-4 w-4 rounded-full bg-purple-600 border border-purple-500/30 transition-all ${themeColor === 'purple' ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-950 scale-110' : 'hover:scale-105 cursor-pointer'}`}
                title="Midnight Purple"
              />
              {/* Forest Sage */}
              <button 
                onClick={() => applyThemeColor('green')}
                className={`h-4 w-4 rounded-full bg-emerald-600 border border-emerald-500/30 transition-all ${themeColor === 'green' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950 scale-110' : 'hover:scale-105 cursor-pointer'}`}
                title="Forest Sage"
              />
              {/* Nordic Blue */}
              <button 
                onClick={() => applyThemeColor('blue')}
                className={`h-4 w-4 rounded-full bg-cyan-600 border border-cyan-500/30 transition-all ${themeColor === 'blue' ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-950 scale-110' : 'hover:scale-105 cursor-pointer'}`}
                title="Nordic Blue"
              />
              {/* Amber Gold */}
              <button 
                onClick={() => applyThemeColor('amber')}
                className={`h-4 w-4 rounded-full bg-amber-500 border border-amber-400/30 transition-all ${themeColor === 'amber' ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950 scale-110' : 'hover:scale-105 cursor-pointer'}`}
                title="Amber Gold"
              />
            </div>
            
            <div className="w-px h-5 bg-zinc-800 shrink-0" />
            
            {/* Mode Toggle Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleThemeMode}
              className="h-7 w-7 text-zinc-400 hover:text-white rounded-md p-0 hover:bg-zinc-800/40"
              title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {themeMode === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-400" />}
            </Button>
          </div>

          {/* Global Zoom Scaler */}
          <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-855 rounded-lg px-3 py-1.5 backdrop-blur-sm text-xs shrink-0 shadow-md h-11 select-none">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleZoomChange(zoomLevel - 10)}
              className="h-7 w-7 text-zinc-400 hover:text-white shrink-0 p-0 hover:bg-zinc-800/40 rounded-md font-bold text-sm"
              title="Zoom Out"
              disabled={zoomLevel <= 80}
            >
              -
            </Button>
            <span 
              onClick={() => handleZoomChange(100)}
              className="text-xs font-semibold text-zinc-300 font-mono w-10 text-center cursor-pointer hover:text-purple-400 transition-colors"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleZoomChange(zoomLevel + 10)}
              className="h-7 w-7 text-zinc-400 hover:text-white shrink-0 p-0 hover:bg-zinc-800/40 rounded-md font-bold text-sm"
              title="Zoom In"
              disabled={zoomLevel >= 130}
            >
              +
            </Button>
          </div>

          {/* Global Volume Slider */}
          <div className="flex items-center gap-2.5 bg-zinc-950/80 border border-zinc-855 rounded-lg px-3.5 py-1.5 backdrop-blur-sm text-xs w-full sm:w-60 shrink-0 shadow-md h-11">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (globalVolume > 0) {
                  setPreviousVolume(globalVolume);
                  setGlobalVolume(0);
                } else {
                  setGlobalVolume(previousVolume > 0 ? previousVolume : 0.8);
                }
              }} 
              className="h-7 w-7 text-zinc-400 hover:text-white shrink-0 p-0 hover:bg-zinc-800/40 rounded-md"
              title={globalVolume > 0 ? "Mute All" : "Unmute"}
            >
              {globalVolume > 0 ? <Volume2 className="h-4 w-4 text-purple-400" /> : <VolumeX className="h-4 w-4 text-zinc-500" />}
            </Button>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0">Vol</span>
            <Slider 
              value={[globalVolume * 100]} 
              onValueChange={(val) => setGlobalVolume(val[0] / 100)} 
              max={100} 
              min={0} 
              step={1}
              className="flex-1 [&>.relative>.bg-primary]:bg-purple-500"
            />
            <span className="text-xs font-mono text-zinc-300 w-10 text-right shrink-0">{Math.round(globalVolume * 100)}%</span>
          </div>
        </div>
      </div>


<div className="grid grid-cols-1 @4xl:grid-cols-12 gap-6 min-w-0">
        
        {/* LEFT COLUMN - Settings controls (Shown for TTS & Chunking & Dialogue) */}
        {activeTab !== 'history' && activeTab !== 'assembly' && (
          <div className="@4xl:col-span-4 space-y-3 min-w-0">
            
            {/* Privacy Manifesto Banner */}
            {!zenMode && (
              <div className="flex flex-col gap-1 bg-purple-950/10 border border-purple-900/30 rounded-lg p-3.5 text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> 100% Local & Private Tool
                </span>
                <p className="text-xs text-zinc-400 leading-normal">
                  This site is merely a local workflow tool. We 100% do NOT store, use, or transmit your voice settings, projects, or audio clips to any server. Everything remains strictly on your device.
                </p>
              </div>
            )}

            {/* Sleek inline Project Toolbar */}
            <div className="flex items-center justify-between gap-2 bg-zinc-950/40 border border-zinc-850 rounded-lg p-2 backdrop-blur-sm text-xs h-11 shrink-0">
              <div className="flex items-center gap-1.5 font-medium text-zinc-300 pl-1 shrink-0">
                <FolderOpen className="h-4 w-4 text-purple-400" />
                <span className="font-semibold text-xs text-zinc-200">Project:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <Select 
                  value={activeProjectId || 'all'} 
                  onValueChange={(val) => {
                    const nextVal = val === 'all' ? null : val;
                    setActiveProjectId(nextVal);
                    localStorage.setItem('tts-workbench-active-project-id', val);
                  }}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-850 text-xs h-7 px-2 py-0 w-36 max-w-[150px] truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="all" className="text-xs">📂 All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        📁 {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setNewProjName('');
                    setNewProjDesc('');
                    setIsCreateProjOpen(true);
                  }}
                  className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md shrink-0"
                  title="Create new project"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md shrink-0"
                      title="Workspace & Project Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-200 w-52 text-xs">
                    <div className="px-2 py-1.5 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Project Settings
                    </div>
                    {activeProjectId && (
                      <DropdownMenuItem 
                        onClick={() => handleDeleteProject(activeProjectId)}
                        className="text-red-400 focus:text-red-400 focus:bg-red-950/20 cursor-pointer flex items-center gap-2"
                      >
                        <Trash className="h-3.5 w-3.5" />
                        Delete Active Project
                      </DropdownMenuItem>
                    )}
                    {!activeProjectId && (
                      <div className="px-2 py-1 text-[10px] text-zinc-500 italic">
                        Select a project to delete it
                      </div>
                    )}
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <div className="px-2 py-1.5 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Workspace Sync
                    </div>
                    <DropdownMenuItem 
                      onClick={() => workspaceFileInputRef.current?.click()}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <Download className="h-3.5 w-3.5 rotate-180 text-purple-400" />
                      Restore Backup
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleExportWorkspace}
                      disabled={isExportingWorkspace}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <Download className="h-3.5 w-3.5 text-purple-400" />
                      Backup Workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Hidden file input for import */}
                <input 
                  type="file" 
                  ref={workspaceFileInputRef} 
                  onChange={handleImportWorkspace} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Voice Settings Sliders */}
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-sm">
              <CardHeader className="p-5 pb-3 flex flex-col space-y-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-purple-400" />
                  Voice Settings
                </CardTitle>
                <div className="grid grid-cols-3 gap-1 bg-zinc-900/60 p-1 rounded-md border border-zinc-850 w-full mt-1.5 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => applyPreset('creative')} 
                    className="text-[11px] h-7 bg-transparent hover:bg-zinc-850 text-zinc-300 hover:text-white px-2 py-0"
                  >
                    Creative
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => applyPreset('balanced')} 
                    className="text-[11px] h-7 bg-transparent hover:bg-zinc-850 text-zinc-300 hover:text-white px-2 py-0"
                  >
                    Balanced
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => applyPreset('robust')} 
                    className="text-[11px] h-7 bg-transparent hover:bg-zinc-850 text-zinc-300 hover:text-white px-2 py-0"
                  >
                    Robust
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-4">
                <TooltipProvider delayDuration={300}>
                  {/* Stability */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-300 font-semibold text-[13px]">Stability</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-900 border border-zinc-800 text-zinc-300 max-w-[280px] p-3 shadow-xl">
                            <p className="font-semibold text-zinc-100 mb-1">Stability</p>
                            <p>Низкая стабильность делает голос более живым и эмоциональным (но иногда с артефактами). Высокая стабильность (свыше 70%) делает речь надежной, но может звучать более монотонно.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="font-mono text-xs text-purple-400 bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-900/30">
                        {Math.round(stability * 100)}%
                      </span>
                    </div>
                    <Slider 
                      value={[stability]} 
                      onValueChange={(val) => setStability(val[0])} 
                      max={1} 
                      min={0} 
                      step={0.01}
                      className="[&>.relative>.bg-primary]:bg-purple-500 mt-1"
                    />
                    {!zenMode && (
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Variable / Expressive</span>
                        <span>Stable Narration</span>
                      </div>
                    )}
                  </div>

                  {/* Similarity Boost */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-300 font-semibold text-[13px]">Clarity / Similarity</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-900 border border-zinc-800 text-zinc-300 max-w-[280px] p-3 shadow-xl">
                            <p className="font-semibold text-zinc-100 mb-1">Similarity Boost</p>
                            <p>Определяет, насколько сильно голос должен быть похож на оригинал при клонировании. Высокие значения требуют идеального качества аудио-исходника без шумов.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="font-mono text-xs text-purple-400 bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-900/30">
                        {Math.round(similarityBoost * 100)}%
                      </span>
                    </div>
                    <Slider 
                      value={[similarityBoost]} 
                      onValueChange={(val) => setSimilarityBoost(val[0])} 
                      max={1} 
                      min={0} 
                      step={0.01}
                      className="[&>.relative>.bg-primary]:bg-purple-500 mt-1"
                    />
                    {!zenMode && (
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Natural Variance</span>
                        <span>High Similarity</span>
                      </div>
                    )}
                  </div>

                  {/* Style Exaggeration */}
                  {selectedModelId !== 'eleven_flash_v2_5' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-300 font-semibold text-[13px]">Style Exaggeration</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-900 border border-zinc-800 text-zinc-300 max-w-[280px] p-3 shadow-xl">
                              <p className="font-semibold text-zinc-100 mb-1">Style Exaggeration</p>
                              <p>Добавляет экспрессии и преувеличивает стиль речи. Если выкрутить слишком сильно, голос может звучать неестественно. Рекомендуется держать на 0%.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="font-mono text-xs text-purple-400 bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-900/30">
                          {Math.round(style * 100)}%
                        </span>
                      </div>
                      <Slider 
                        value={[style]} 
                        onValueChange={(val) => setStyle(val[0])} 
                        max={1} 
                        min={0} 
                        step={0.01}
                        className="[&>.relative>.bg-primary]:bg-purple-500 mt-1"
                      />
                      {!zenMode && (
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>More Neutral</span>
                          <span>Stronger Accent/Intonation</span>
                        </div>
                      )}
                    </div>
                  )}
                </TooltipProvider>

                {/* Speed */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-semibold text-[13px]">Speed</span>
                    <span className="font-mono text-xs text-purple-400 bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-900/30">
                      {speed.toFixed(1)}x
                    </span>
                  </div>
                  <Slider 
                    value={[speed]} 
                    onValueChange={(val) => setSpeed(val[0])} 
                    max={1.5} 
                    min={0.7} 
                    step={0.05}
                    className="[&>.relative>.bg-primary]:bg-purple-500 mt-1"
                  />
                </div>

                {/* Speaker Boost Toggle */}
                <div className="flex items-center justify-between border-t border-zinc-900 pt-3.5 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-300">Speaker Boost</span>
                    {!zenMode && <span className="text-xs text-zinc-500">Boost original clone similarity</span>}
                  </div>
                  <Switch 
                    checked={useSpeakerBoost} 
                    onCheckedChange={setUseSpeakerBoost}
                  />
                </div>
              </CardContent>
            </Card>




            {/* Model & Voice Selectors */}
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-sm">
              <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Settings className="h-4 w-4 text-purple-400" />
                  Voice & Model Discovery
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-4">
                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model-select" className="text-sm font-semibold text-zinc-300">Upstream Model</Label>
                  <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                    <SelectTrigger id="model-select" className="bg-zinc-900 border-zinc-850 text-sm h-10 flex-1 min-w-0">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      {modelsLoading ? (
                        <SelectItem value="loading" disabled>Loading models...</SelectItem>
                      ) : (
                        filteredModels.map(m => (
                          <SelectItem key={m.model_id} value={m.model_id} className="text-sm">
                            {m.name} {m.model_id === 'eleven_v3' && '🔥'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedModelId === 'eleven_v3' && !zenMode && (
                    <div className="text-xs text-zinc-400 bg-purple-950/20 border border-purple-800/30 rounded-lg p-2.5 mt-1 flex items-start gap-1.5 leading-normal">
                      <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <span>v3 has superior expressiveness but does not support request-stitching. For v3, seed lock, stability adjustments, and takes are used.</span>
                    </div>
                  )}
                </div>

                {/* Voice Search & Grid */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-zinc-300">Voice Selector</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input 
                        placeholder="Search voice name, gender, accent..." 
                        className="pl-9 bg-zinc-900 border-zinc-850 text-sm h-10 focus-visible:ring-purple-800"
                        value={voiceSearch}
                        onChange={(e) => setVoiceSearch(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                      className={`h-10 w-10 border-zinc-850 shrink-0 ${showFavoritesOnly ? 'bg-purple-950/40 text-purple-400 border-purple-800/40 hover:bg-purple-950/50 hover:text-purple-300' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                      title={showFavoritesOnly ? "Showing favorites only" : "Filter by favorites"}
                    >
                      <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-purple-400 text-purple-400' : ''}`} />
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-52 border border-zinc-850 rounded-lg bg-zinc-900/40 p-2.5">
                    {voicesLoading ? (
                      <div className="space-y-2 p-1">
                        <Skeleton className="h-8 w-full bg-zinc-900/60" />
                        <Skeleton className="h-8 w-full bg-zinc-900/60" />
                        <Skeleton className="h-8 w-full bg-zinc-900/60" />
                        <Skeleton className="h-8 w-full bg-zinc-900/60" />
                      </div>
                    ) : filteredVoices.length === 0 ? (
                      <div className="text-xs text-zinc-500 p-4 text-center flex flex-col items-center justify-center gap-3">
                        {/^[a-zA-Z0-9_-]{15,35}$/.test(voiceSearch.trim()) ? (
                          <div className="w-full space-y-2">
                            <span className="text-[11px] block text-zinc-400">This looks like a Custom Voice ID.</span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={async () => {
                                const targetId = voiceSearch.trim();
                                setSelectedVoiceId(targetId);
                                toast.info(`Attempting to fetch voice metadata...`);
                                
                                let newVoice: CustomVoice;
                                try {
                                  const res = await getVoice(targetId);
                                  if (res.ok) {
                                    newVoice = { 
                                      ...res.value, 
                                      isCustom: true,
                                      previewUrl: res.value.previewUrl || ((res.value as unknown as Record<string, unknown>).preview_url as string)
                                    } as CustomVoice;
                                    toast.success(`Custom voice "${newVoice.name}" loaded and saved successfully!`);
                                  } else {
                                    toast.warning(`Custom ID selected. (Metadata lookup failed: ${res.error})`);
                                    const friendlyName = prompt(
                                      `We couldn't fetch metadata for Voice ID "${targetId}" from ElevenLabs (it might be a public/shared voice).\n\nPlease enter a name for this voice to save it:`, 
                                      `Custom Voice (${targetId.substring(0, 5)})`
                                    ) || `Custom (${targetId.substring(0, 8)})`;
                                    
                                    const customPreviewUrl = prompt(
                                      `Optional: Enter an audio preview URL (MP3/WAV link) for "${friendlyName}":`,
                                      ""
                                    ) || undefined;

                                    newVoice = {
                                      voiceId: targetId,
                                      name: friendlyName,
                                      previewUrl: customPreviewUrl,
                                      labels: { gender: 'custom', accent: 'id' },
                                      isCustom: true
                                    };
                                  }
                                } catch (e) {
                                  console.error(e);
                                  toast.warning(`Custom ID selected (offline fallback).`);
                                  
                                  const friendlyName = prompt(
                                    `Offline fallback for Voice ID "${targetId}".\n\nPlease enter a name for this voice:`, 
                                    `Custom Voice (${targetId.substring(0, 5)})`
                                  ) || `Custom (${targetId.substring(0, 8)})`;

                                  const customPreviewUrl = prompt(
                                    `Optional: Enter an audio preview URL (MP3/WAV link) for "${friendlyName}":`,
                                    ""
                                  ) || undefined;

                                  newVoice = {
                                    voiceId: targetId,
                                    name: friendlyName,
                                    previewUrl: customPreviewUrl,
                                    labels: { gender: 'custom', accent: 'id' },
                                    isCustom: true
                                  };
                                }

                                // Update state
                                setVoices(prev => {
                                  if (!prev.some(v => v.voiceId === newVoice.voiceId)) {
                                    return [newVoice, ...prev];
                                  }
                                  return prev;
                                });

                                // Save to IndexedDB
                                try {
                                  await saveCustomVoiceLocal(newVoice);
                                } catch (e) {
                                  console.error('Failed to save custom voice to IndexedDB:', e);
                                }
                              }}
                              className="w-full border-purple-800/40 text-purple-400 hover:text-purple-300 hover:bg-purple-950/20 text-[11px] font-semibold h-8"
                            >
                              Add & Use Custom Voice ID
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span>No matching voices found.</span>
                            {showFavoritesOnly && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => setShowFavoritesOnly(false)}
                                className="text-purple-400 hover:text-purple-300 text-[11px] p-0 h-auto"
                              >
                                Disable Favorites Filter
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5">
                        {displayedVoices.map(v => {
                          const isSelected = selectedVoiceId === v.voiceId;
                          const isFav = favoriteVoices.includes(v.voiceId);
                          return (
                            <div 
                              key={v.voiceId}
                              className={`flex items-center justify-between p-2 px-2.5 rounded-md transition-all text-xs border ${
                                isSelected 
                                  ? 'bg-purple-950/20 text-purple-200 font-medium border-purple-800/45 shadow-sm shadow-purple-950/50' 
                                  : v.isCustom 
                                    ? 'bg-purple-950/5 border-purple-900/20 hover:bg-purple-950/10 text-zinc-300'
                                    : 'hover:bg-zinc-900/60 text-zinc-300 border-transparent'
                              }`}
                            >
                              <div 
                                className="flex-1 cursor-pointer flex items-center gap-1.5 min-w-0" 
                                onClick={() => setSelectedVoiceId(v.voiceId)}
                              >
                                <span className="truncate text-[13px] font-medium text-zinc-200">{v.name}</span>
                                {v.isCustom && (
                                  <span className="text-[9px] font-bold px-1 py-0.5 bg-purple-900/40 text-purple-300 border border-purple-800/30 rounded shrink-0">
                                    Custom
                                  </span>
                                )}
                                {v.labels?.gender && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700 capitalize shrink-0">
                                    {v.labels.gender}
                                  </span>
                                )}
                                {v.labels?.accent && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800/40 text-zinc-500 rounded truncate max-w-[80px] shrink-0">
                                    {v.labels.accent}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md shrink-0"
                                  onClick={(e) => { e.stopPropagation(); handleVoicePreview(v.previewUrl || ((v as unknown as Record<string, unknown>).preview_url as string), v.voiceId); }}
                                >
                                  {previewingVoiceId === v.voiceId ? (
                                    <div className="flex items-end gap-[2px] h-3.5 w-3.5 shrink-0 justify-center mb-[1px]">
                                      <span className="w-[2px] bg-purple-400 rounded-full animate-soundwave-1" />
                                      <span className="w-[2px] bg-purple-400 rounded-full animate-soundwave-2" />
                                      <span className="w-[2px] bg-purple-400 rounded-full animate-soundwave-3" />
                                    </div>
                                  ) : (
                                    <Volume2 className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-zinc-500 hover:text-yellow-400 hover:bg-zinc-800/50 rounded-md shrink-0"
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(v.voiceId); }}
                                >
                                  <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                </Button>
                                {v.isCustom && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 rounded-md shrink-0"
                                    onClick={(e) => deleteCustomVoice(v.voiceId, e)}
                                    title="Delete custom voice"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {filteredVoices.length > voiceListLimit && (
                          <div className="pt-2 pb-1 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setVoiceListLimit(prev => prev + 100)}
                              className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-950/20 w-full font-medium h-8"
                            >
                              Load More Voices ({filteredVoices.length - voiceListLimit} remaining)
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Bulk Voice Management Form */}
                  {isImportOpen && (
                    <div className="space-y-2.5 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-purple-400 tracking-wider uppercase">Bulk Import Voice IDs</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-zinc-500 hover:text-white" 
                          onClick={() => setIsImportOpen(false)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Textarea 
                        placeholder="Paste Voice IDs (one per line, or comma-separated)..."
                        value={bulkImportText}
                        onChange={(e) => setBulkImportText(e.target.value)}
                        className="bg-zinc-950 border-zinc-850 text-xs min-h-[90px] text-zinc-300 placeholder:text-zinc-700 leading-relaxed font-mono focus-visible:ring-purple-800"
                      />
                      <Button 
                        size="sm" 
                        onClick={executeBulkImport}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-xs font-semibold h-8"
                      >
                        Import {bulkImportText.split(/[\n,\s;]+/).map(s => s.trim()).filter(Boolean).length} voices
                      </Button>
                    </div>
                  )}

                  {/* Bulk Voice Management Actions Row */}
                  <div className="pt-3 border-t border-zinc-900/80 flex flex-col gap-2.5 mt-2.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                      <span>MANAGE SAVED VOICES</span>
                      <span className="font-bold text-purple-400">
                        Custom: {voices.filter(v => v.isCustom).length}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsImportOpen(!isImportOpen)}
                        className={`text-xs h-8 px-3 border-zinc-800 hover:text-purple-300 font-semibold ${isImportOpen ? 'bg-purple-950/20 text-purple-400 border-purple-800/30' : 'bg-zinc-900 text-zinc-400'}`}
                        title="Bulk import Voice IDs (CSV/Lines)"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1 shrink-0" /> Import
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportVoices}
                        className="text-xs h-8 px-3 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-purple-300 font-semibold"
                        title="Export custom voices to JSON file"
                      >
                        <Download className="h-3.5 w-3.5 mr-1 shrink-0" /> Export
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearCustomVoices}
                        className="text-xs h-8 px-3 bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/30 font-semibold"
                        title="Wipe all custom voices from browser database"
                      >
                        <Trash className="h-3.5 w-3.5 mr-1 shrink-0" /> Clear All
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Seed Control & Output Format */}
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                {/* Seed */}
                <div className="space-y-2">
                  <Label htmlFor="seed-input" className="text-sm font-semibold text-zinc-300 flex flex-wrap items-center justify-between gap-1.5">
                    <span>Sampling Seed</span>
                    <span className="text-xs text-zinc-500 font-normal shrink-0">Empty for random</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="seed-input" 
                      placeholder="e.g. 133742 (0..4294967295)" 
                      value={seed}
                      onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
                      className="bg-zinc-900 border-zinc-855 text-sm h-10 flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setIsSeedLocked(!isSeedLocked)}
                      className={`h-10 w-10 border-zinc-850 shrink-0 ${isSeedLocked ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-900 text-zinc-400'}`}
                      title={isSeedLocked ? 'Seed locked' : 'Seed unlocked'}
                    >
                      {isSeedLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Format selection */}
                <div className="space-y-3.5 pt-1">
                  <div className="space-y-2">
                    <Label htmlFor="format-select" className="text-sm font-semibold text-zinc-300">Output Quality</Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger id="format-select" className="bg-zinc-900 border-zinc-855 text-sm h-10 w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                        {OUTPUT_FORMATS.map(f => (
                          <SelectItem key={f.value} value={f.value} className="text-sm">{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="norm-select" className="text-sm font-semibold text-zinc-300">Text Normalization</Label>
                    <Select value={applyTextNormalization} onValueChange={(val: string) => setApplyTextNormalization(val as 'auto' | 'on' | 'off')}>
                      <SelectTrigger id="norm-select" className="bg-zinc-900 border-zinc-855 text-sm h-10 w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                        <SelectItem value="auto" className="text-sm">Auto Normalization</SelectItem>
                        <SelectItem value="on" className="text-sm">Force Normalization</SelectItem>
                        <SelectItem value="off" className="text-sm">No Normalization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Timestamps switch */}
                <div className="flex items-center justify-between border-t border-zinc-900 pt-3.5 text-xs mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-300">Generate Character Alignment</span>
                    <span className="text-xs text-zinc-500">Return timing JSON for subtitle export</span>
                  </div>
                  <Switch 
                    checked={withTimestamps} 
                    onCheckedChange={setWithTimestamps}
                  />
                </div>
              </CardContent>
            </Card>

            {/* API Usage & Economy Widget */}
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-sm">
              <CardHeader className="py-3 px-4 border-b border-zinc-900/60 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  API Usage & Economy
                </CardTitle>
                {subInfo && (
                  <span className="text-[10px] bg-purple-900/40 text-purple-300 font-semibold px-2 py-0.5 rounded capitalize">
                    {subInfo.tier} Plan
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {subInfo ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 font-medium">ElevenLabs Remaining:</span>
                      <span className="text-zinc-300 font-bold font-mono">
                        {Math.max(0, subInfo.characterLimit - subInfo.characterCount).toLocaleString()} / {subInfo.characterLimit.toLocaleString()} chars
                      </span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, ((subInfo.characterLimit - subInfo.characterCount) / subInfo.characterLimit) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-500">
                      <span>Used: {subInfo.characterCount.toLocaleString()} chars</span>
                      <span>Resets: {subInfo.resetDate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 p-2 bg-zinc-900/30 rounded border border-zinc-900">
                    <AlertTriangle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                    <span>ElevenLabs Subscription details unavailable (No API key or offline).</span>
                  </div>
                )}
                <div className="border-t border-zinc-900 pt-3">
                  <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between mb-2">
                    <span>CURRENT WORKBENCH SESSION</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded p-2">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Session Cost</div>
                      <div className="text-xs font-bold font-mono text-zinc-300 mt-0.5">
                        {sessionStats.charactersUsed.toLocaleString()} chars
                      </div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded p-2">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Generations</div>
                      <div className="text-xs font-bold font-mono text-zinc-300 mt-0.5">
                        {sessionStats.generationsCount} runs
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Zen Mode Toggle */}
            <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-lg px-4 py-2.5 backdrop-blur-sm text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-zinc-300">Zen Focus Mode</span>
                <span className="text-[10px] text-zinc-500">Hide dashboard guides and footnotes</span>
              </div>
              <Switch 
                checked={zenMode} 
                onCheckedChange={toggleZenMode}
              />
            </div>

          </div>
        )}

        {/* RIGHT COLUMN - Tab Contents */}
        {activeTab !== 'history' && activeTab !== 'assembly' && (
          <div className="@4xl:col-span-8 space-y-5 min-w-0">
            {isApiKeyMissing && (
              <div className="p-4 bg-red-950/20 border border-red-900/35 rounded-lg text-xs flex flex-col gap-1.5 text-red-200">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>ElevenLabs API Key Missing</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You can explore configurations, write scripts, use the Snippet Library, and switch projects, but audio generation is disabled. Please input your key in the bottom-left sidebar panel to start generating.
                </p>
              </div>
            )}
            
            {/* Tab: Expressive TTS */}
            {activeTab === 'expressive' && (
              <Card className="border-zinc-800 bg-zinc-950/20">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold flex justify-between items-center">
                    <span>Source Script</span>
                    {!zenMode && (
                      <span className="text-xs text-zinc-500 font-normal">Supports v3 Inline tags & IPA</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="relative">
                    <Textarea 
                      ref={textareaRef}
                      placeholder="Enter script text here... (Example: This is a [happy] sentence, cleared for rendering...)"
                      className="bg-zinc-900 border-zinc-850 text-sm min-h-[160px] md:min-h-[220px] max-h-[500px] resize-y text-zinc-100 leading-relaxed focus-visible:ring-purple-800 p-3.5"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                    <div className={`absolute right-3.5 bottom-3.5 text-xs font-mono bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800/35 transition-colors ${text.length > 5000 ? 'text-red-400 border-red-900/50' : 'text-zinc-500'}`}>
                      {text.length.toLocaleString()} / 5000
                    </div>
                  </div>

                  {/* Emotion tag quick links */}
                  <div className="space-y-2 border-t border-zinc-900/60 pt-3.5">
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={() => setShowTags(!showTags)}
                        className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors flex-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <Smile className="h-4 w-4 text-purple-400" />
                          Insert Emotional Steering Tag
                        </span>
                        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${showTags ? 'rotate-180' : ''}`} />
                      </button>
                      {showTags && !isAddingTag && (
                        <button 
                          onClick={() => setIsAddingTag(true)} 
                          className="text-purple-400 hover:text-purple-300 font-bold lowercase text-xs flex items-center gap-0.5 ml-3 shrink-0"
                        >
                          + Custom Tag
                        </button>
                      )}
                    </div>

                    {showTags && isAddingTag && (
                      <div className="p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-lg space-y-2.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="text-xs font-bold text-zinc-350 flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5 text-purple-450" /> Add Custom Steering Tag
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="tag-label-input" className="text-[10px] uppercase font-bold text-zinc-550">Label (e.g. 🎭 Dramatic)</Label>
                            <Input
                              id="tag-label-input"
                              placeholder="e.g. 🎭 Dramatic"
                              value={newTagLabel}
                              onChange={(e) => setNewTagLabel(e.target.value)}
                              className="h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-200"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="tag-prompt-input" className="text-[10px] uppercase font-bold text-zinc-550">Steering Prompt (e.g. [dramatic])</Label>
                            <Input
                              id="tag-prompt-input"
                              placeholder="e.g. dramatic"
                              value={newTagPrompt}
                              onChange={(e) => setNewTagPrompt(e.target.value)}
                              className="h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-200"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1.5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setIsAddingTag(false);
                              setNewTagLabel('');
                              setNewTagPrompt('');
                            }}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={saveCustomTag}
                            className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3"
                          >
                            Save Tag
                          </Button>
                        </div>
                      </div>
                    )}

                    {showTags && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {EMOTION_TAGS.map(t => (
                          <Button 
                            key={t.tag}
                            variant="outline" 
                            size="sm"
                            onClick={() => insertTag(t.tag)}
                            className="text-[11px] h-7 px-3 rounded-full bg-zinc-900 border-zinc-800 hover:border-purple-600/40 hover:bg-purple-950/10 hover:text-purple-300 transition-all duration-200 font-medium"
                          >
                            {t.label}
                          </Button>
                        ))}

                        {customTags.map(t => (
                          <div 
                            key={t.tag}
                            onClick={() => insertTag(t.tag)}
                            className="group flex items-center gap-1.5 text-[11px] h-7 px-3 rounded-full bg-purple-950/10 border border-purple-900/40 text-purple-300 hover:bg-purple-900/20 hover:text-white cursor-pointer select-none transition-all duration-200 font-medium"
                          >
                            <span>{t.label}</span>
                            <span 
                              onClick={(e) => deleteCustomTag(t.tag, e)}
                              className="text-purple-500 hover:text-red-400 opacity-0 group-hover:opacity-100 font-bold ml-1.5 text-[10px] transition-opacity duration-150"
                              title="Delete tag"
                            >
                              ✕
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Snippets Library */}
                  <div className="space-y-2 border-t border-zinc-900/60 pt-3.5">
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={() => setShowSnippets(!showSnippets)}
                        className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors flex-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-purple-400" />
                          Snippet Library Templates
                        </span>
                        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${showSnippets ? 'rotate-180' : ''}`} />
                      </button>
                      {showSnippets && (
                        <button onClick={saveSnippet} className="text-purple-400 hover:text-purple-300 font-bold lowercase text-xs flex items-center gap-0.5 ml-3 shrink-0">
                          + Save Current as Snippet
                        </button>
                      )}
                    </div>
                    {showSnippets && (
                      <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {snippets.length === 0 ? (
                          <p className="text-xs text-zinc-500 p-2 bg-zinc-900/20 border border-zinc-850 rounded-lg">No custom templates saved yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {snippets.map(s => (
                              <div 
                                key={s.id} 
                                onClick={() => setText(s.text)}
                                className="group flex items-center gap-1.5 text-xs h-7 px-3 bg-zinc-900/40 border border-zinc-800 hover:border-purple-800/35 hover:bg-zinc-800 hover:text-white rounded-full cursor-pointer select-none transition-all duration-200"
                                title={s.text}
                              >
                                <span>{s.title}</span>
                                <span 
                                  onClick={(e) => deleteSnippet(s.id, e)}
                                  className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 font-bold ml-1 text-[10px] transition-opacity duration-150"
                                  title="Delete template"
                                >
                                  ✕
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3.5 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-3.5 mt-2">
                    <div className="flex items-center gap-2.5 text-sm">
                      <span className="text-zinc-400 font-semibold">Batch Takes:</span>
                      <Select value={takesCount.toString()} onValueChange={(val) => setTakesCount(Number(val))}>
                        <SelectTrigger className="h-10 w-28 bg-zinc-900 border-zinc-855 text-zinc-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          <SelectItem value="1" className="text-xs">1 Take</SelectItem>
                          <SelectItem value="3" className="text-xs">3 Takes</SelectItem>
                          <SelectItem value="5" className="text-xs">5 Takes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      id="generate-btn"
                      onClick={handleGenerate} 
                      disabled={isGenerating || !text.trim() || !selectedVoiceId || isApiKeyMissing || rateLimitSeconds > 0}
                      className="btn-interactive-lift bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-md min-w-[180px] h-10"
                    >
                      {isApiKeyMissing ? (
                        'API Key Required'
                      ) : rateLimitSeconds > 0 ? (
                        `ElevenLabs просит подождать... ${rateLimitSeconds}с`
                      ) : isGenerating ? (
                        <>
                          <div className="mini-wave-container">
                            <span className="mini-wave-bar" />
                            <span className="mini-wave-bar" />
                            <span className="mini-wave-bar" />
                          </div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1.5" />
                          {takesCount > 1 ? `Generate ${takesCount} Takes` : 'Generate Take'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab: Chunk Narration */}
            {activeTab === 'chunking' && (
              <Card className="border-zinc-800 bg-zinc-950/20">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-sm font-semibold">Long-form Paragraph Stitching</CardTitle>
                  {!zenMode && (
                    <CardDescription className="text-xs text-zinc-500 mt-1 leading-normal">
                      Split a long script by paragraphs. Generates sequentially passing previous IDs for voice consistency.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="chunk-editor" className="text-sm font-semibold text-zinc-300">Full Text</Label>
                      <Textarea 
                        id="chunk-editor"
                        placeholder="Paste your long script here. Select a splitting method below and click Split."
                        className="bg-zinc-900 border-zinc-855 text-sm min-h-[140px] max-h-[400px] resize-y text-zinc-100 leading-relaxed p-3.5 focus-visible:ring-purple-800"
                        value={chunkText}
                        onChange={(e) => setChunkText(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="split-method-select" className="text-sm font-semibold text-zinc-300">Splitting Method</Label>
                        <Select value={splitMethod} onValueChange={(val) => setSplitMethod(val as 'paragraphs' | 'lines' | 'sentences' | 'smart')}>
                          <SelectTrigger id="split-method-select" className="bg-zinc-900 border-zinc-855 text-sm h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                            <SelectItem value="paragraphs" className="text-sm">Paragraphs (Double Empty Line)</SelectItem>
                            <SelectItem value="lines" className="text-sm">Lines (Single Line Break)</SelectItem>
                            <SelectItem value="sentences" className="text-sm">Sentences (Punctuation .!?)</SelectItem>
                            <SelectItem value="smart" className="text-sm">Smart Split (Grouped sentences ~1000 chars)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={handleSplitChunks} 
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-10 px-4 font-bold shrink-0 shadow-md transition-all active:translate-y-[1px]"
                      >
                        Split Into Chunks
                      </Button>
                    </div>

                    {/* Dynamic splitting method description */}
                    <div className="text-xs text-zinc-400 bg-purple-950/10 border border-purple-900/20 rounded-lg p-3 mt-2 flex gap-2.5 leading-normal">
                      <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        {splitMethod === 'paragraphs' && (
                          <>
                            <span className="font-semibold text-zinc-200 block">Paragraphs (Double Empty Line)</span>
                            <span className="leading-relaxed">Best for structured books, articles, or narration scripts. Splits text only where there is an empty line between paragraphs. Provides natural, structured speech flows.</span>
                          </>
                        )}
                        {splitMethod === 'lines' && (
                          <>
                            <span className="font-semibold text-zinc-200 block">Lines (Single Line Break)</span>
                            <span className="leading-relaxed">Best for poetry, structured dialogues, lists, or vocabulary exercises. Splits text at every single carriage return (`\n`).</span>
                          </>
                        )}
                        {splitMethod === 'sentences' && (
                          <>
                            <span className="font-semibold text-zinc-200 block">Sentences (Punctuation .!?)</span>
                            <span className="leading-relaxed">Splits strictly sentence by sentence. Excellent for micro-narration control, interactive flashcards, or short child-oriented prompts.</span>
                          </>
                        )}
                        {splitMethod === 'smart' && (
                          <>
                            <span className="font-semibold text-zinc-200 block">Smart Split (Grouped sentences ~1000 chars) [Recommended]</span>
                            <span className="leading-relaxed">Intelligently bundles sentences into blocks under 1000 characters. Ensures that sentences are never cut off mid-speech, keeping long narrations natural, cohesive, and cost-efficient.</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {chunks.length > 0 && (
                    <div className="space-y-3.5 pt-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold text-zinc-300">Sequence Editor ({chunks.length} chunks)</Label>
                        <span className="text-xs text-zinc-500 font-mono">You can edit individual chunks below before generating</span>
                      </div>
                      
                      <div className="max-h-[360px] overflow-y-auto border border-zinc-850 rounded-lg bg-zinc-900/40 p-2.5 space-y-3 custom-scrollbar">
                        {chunks.map((c, idx) => (
                          <div key={idx} className="relative bg-zinc-950/60 border border-zinc-900/50 rounded-lg p-2.5 flex items-start gap-2.5 group">
                            <span className="font-bold text-purple-400 text-xs mt-2 shrink-0 w-16 text-right select-none">
                              Chunk {idx + 1}
                            </span>
                            <Textarea 
                              value={c}
                              onChange={(e) => {
                                const updated = [...chunks];
                                updated[idx] = e.target.value;
                                setChunks(updated);
                              }}
                              placeholder="Enter chunk script..."
                              className="bg-zinc-900 border-zinc-850 text-xs h-24 max-h-[140px] resize-y overflow-y-auto text-zinc-200 leading-relaxed focus-visible:ring-purple-800 flex-1 py-2 px-3"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = [...chunks];
                                updated.splice(idx, 1);
                                setChunks(updated);
                                toast.info(`Chunk ${idx + 1} deleted.`);
                              }}
                              className="h-8 w-8 text-zinc-500 hover:text-red-400 shrink-0 self-center transition-all duration-200 hover:bg-red-950/20"
                              title="Delete this chunk"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-3.5 border-t border-zinc-900/60 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setChunks([...chunks, '']);
                            toast.success('Empty chunk appended to the end.');
                          }}
                          className="bg-zinc-900 border-zinc-850 text-xs h-8 px-3 font-semibold"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Empty Chunk
                        </Button>
                        
                        <Button 
                          onClick={handleGenerateChunks} 
                          disabled={isGeneratingChunks || chunks.length === 0 || isApiKeyMissing || rateLimitSeconds > 0}
                          className="btn-interactive-lift bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold h-10 min-w-[180px]"
                        >
                          {isApiKeyMissing ? (
                            'API Key Required'
                          ) : rateLimitSeconds > 0 ? (
                            `ElevenLabs просит подождать... ${rateLimitSeconds}с`
                          ) : isGeneratingChunks ? (
                            <>
                              <div className="mini-wave-container">
                                <span className="mini-wave-bar" />
                                <span className="mini-wave-bar" />
                                <span className="mini-wave-bar" />
                              </div>
                              Sequencing Chunks...
                            </>
                          ) : (
                            <>
                              <Layers className="h-4 w-4 mr-1.5" />
                              Generate Sequence
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tab: Dialogue */}
            {activeTab === 'dialogue' && (
              <Card className="border-zinc-800 bg-zinc-950/20">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-sm font-semibold">Multi-speaker dialogue editor</CardTitle>
                  {!zenMode && (
                    <CardDescription className="text-xs text-zinc-500 mt-1 leading-normal">
                      Construct dialogue lines with individual voices and mix them into a single audio file.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 space-y-4">
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {dialogueLines.map((line, idx) => (
                      <div 
                        key={line.id} 
                        className="flex gap-2 items-start bg-zinc-950/60 border border-zinc-900 rounded-lg p-2.5 relative group"
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnter={(e) => handleDragEnter(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {/* Drag Handle */}
                        <div className="flex flex-col items-center justify-center pt-5 px-0.5 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="flex-1 space-y-2.5">
                          {/* Voice select */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 font-bold font-mono min-w-[36px]">#{idx + 1}</span>
                            <Select 
                              value={line.voiceId} 
                              onValueChange={(val) => updateDialogueLine(idx, 'voiceId', val)}
                            >
                              <SelectTrigger className="bg-zinc-900 border-zinc-855 text-xs h-8 w-44">
                                <SelectValue placeholder="Select speaker voice" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                                {getDialogueLineVoices(line.voiceId).map(v => (
                                  <SelectItem key={v.voiceId} value={v.voiceId} className="text-xs">{v.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Textarea 
                            placeholder="Enter text spoken by this voice..."
                            className="bg-zinc-900 border-zinc-855 text-sm min-h-[60px] h-14 resize-y text-zinc-100 p-2.5 focus-visible:ring-purple-800"
                            value={line.text}
                            onChange={(e) => updateDialogueLine(idx, 'text', e.target.value)}
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1 mt-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => duplicateDialogueLine(idx)}
                            className="h-8 w-8 text-zinc-500 hover:text-purple-400 hover:bg-zinc-800/40 rounded-md transition-all"
                            title="Duplicate row"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeDialogueLine(idx)}
                            className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/40 rounded-md transition-all"
                            disabled={dialogueLines.length <= 1}
                            title="Delete row"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-3.5 border-t border-zinc-900 mt-2">
                    <Button variant="outline" size="sm" onClick={addDialogueLine} className="bg-zinc-900 border-zinc-855 text-xs h-8 px-3 font-semibold">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Speaker Row
                    </Button>
                    <Button 
                      id="dialogue-generate-btn"
                      onClick={handleGenerateDialogue} 
                      disabled={isGenerating || dialogueLines.length === 0 || isApiKeyMissing || rateLimitSeconds > 0}
                      className="btn-interactive-lift bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold h-10 min-w-[150px]"
                    >
                      {isApiKeyMissing ? (
                        'API Key Required'
                      ) : rateLimitSeconds > 0 ? (
                        `ElevenLabs просит подождать... ${rateLimitSeconds}с`
                      ) : isGenerating ? (
                        <>
                          <div className="mini-wave-container">
                            <span className="mini-wave-bar" />
                            <span className="mini-wave-bar" />
                            <span className="mini-wave-bar" />
                          </div>
                          Mixing Dialogue...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1.5" />
                          Mix Dialogue
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab: Voice-to-Voice (Speech-to-Speech) */}
            {activeTab === 'voice2voice' && (
              <Card className="border-zinc-800 bg-zinc-950/20">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Voice-to-Voice (Speech-to-Speech)</span>
                    {!zenMode && (
                      <span className="text-xs text-zinc-500 font-normal">Change input voice to target voice</span>
                    )}
                  </CardTitle>
                  {!zenMode && (
                    <CardDescription className="text-xs text-zinc-500 mt-1 leading-normal">
                      Record your own voice from the microphone or upload an audio file. The AI will convert it to the selected target voice, preserving your exact intonation, emotion, and pace.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Record section */}
                    <div className="border border-zinc-850 rounded-lg p-5 bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-3.5 min-h-[150px]">
                      <span className="text-sm font-semibold text-zinc-300">Option 1: Record from Microphone</span>
                      
                      {isRecording ? (
                        <div className="flex flex-col items-center space-y-2.5">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/30 border border-red-800/40 rounded-full text-red-400 text-xs animate-pulse font-mono">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                            Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={stopRecording}
                            className="text-xs font-bold h-10 px-4 shadow-md"
                          >
                            <Trash className="h-3.5 w-3.5 mr-1" /> Stop & Save
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={startRecording}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-10 px-4 shadow-md transition-all active:translate-y-[1px]"
                        >
                          <Mic className="h-3.5 w-3.5 mr-1.5 animate-pulse" /> Start Recording
                        </Button>
                      )}
                    </div>

                    {/* Upload section */}
                    <div className="border border-zinc-850 rounded-lg p-5 bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-3.5 min-h-[150px] relative">
                      <span className="text-sm font-semibold text-zinc-300">Option 2: Upload Audio File</span>
                      <p className="text-xs text-zinc-500">Supports WAV, MP3, M4A up to 10MB</p>
                      
                      <div className="relative">
                        <input 
                          type="file" 
                          id="sts-file-upload" 
                          accept="audio/*" 
                          onChange={handleStsFileChange} 
                          className="hidden" 
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => document.getElementById('sts-file-upload')?.click()}
                          className="bg-zinc-900 border-zinc-850 text-xs h-10 px-4 font-bold"
                        >
                          <FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Choose File
                        </Button>
                      </div>
                    </div>
                  </div>

                  {stsSourceAudioUrl && (
                    <div className="border border-zinc-850 rounded-lg p-3 bg-zinc-900/10 space-y-2">
                      <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span className="font-semibold flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5 text-purple-400" /> Source Audio Preview</span>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => {
                            setStsSourceAudioUrl(null);
                            setStsSourceAudioBase64(null);
                          }}
                          className="h-auto p-0 text-red-400 hover:text-red-300 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                      <audio src={stsSourceAudioUrl} controls className="w-full h-9 bg-zinc-900 rounded" />
                    </div>
                  )}

                  <div className="pt-3.5 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-3.5 mt-2">
                    <div className="flex items-center gap-2.5">
                      <Switch 
                        id="noise-switch"
                        checked={removeBackgroundNoise} 
                        onCheckedChange={setRemoveBackgroundNoise}
                      />
                      <Label htmlFor="noise-switch" className="text-xs text-zinc-400 cursor-pointer select-none font-medium">
                        Remove background noise from input audio
                      </Label>
                    </div>

                    <Button 
                      disabled={isConvertingSTS || !stsSourceAudioBase64 || !selectedVoiceId || isApiKeyMissing}
                      onClick={handleGenerateSTS}
                      className="btn-interactive-lift bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-md min-w-[180px] h-10 w-full sm:w-auto"
                    >
                      {isApiKeyMissing ? (
                        'API Key Required'
                      ) : isConvertingSTS ? (
                        <>
                          <div className="mini-wave-container">
                            <span className="mini-wave-bar" />
                            <span className="mini-wave-bar" />
                            <span className="mini-wave-bar" />
                          </div>
                          Converting...
                        </>
                      ) : (
                        <>
                          <Radio className="h-4 w-4 mr-1.5" />
                          Convert Voice
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current result feedback */}
            {currentResult && (
              <Card className="border-purple-900/40 bg-zinc-950/80 shadow-md">
                <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-zinc-900">
                  <div className="flex items-center gap-2">
                    <FileAudio className="h-4 w-4 text-purple-400" />
                    <CardTitle className="text-xs font-bold text-zinc-200">Active Render Output</CardTitle>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    ID: {currentResult.id}
                  </div>
                </CardHeader>
                <CardContent className="py-4 space-y-3.5">
                  <div className="text-xs bg-zinc-900/40 border border-zinc-900 rounded p-2.5 leading-relaxed text-zinc-400 relative group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-zinc-300 text-[10px] uppercase tracking-wider">Generated Text</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyText(currentResult.id, currentResult.text)}
                        className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Copy text to clipboard"
                      >
                        {copiedId === currentResult.id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="pr-4 whitespace-pre-wrap">{currentResult.text}</div>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
                    <audio src={currentResult.audioUrl} controls className="w-full h-8" />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => triggerBrowserDownload(currentResult.filename, currentResult.audioUrl)}
                      className="bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-xs font-semibold shrink-0 h-8 gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Save File
                    </Button>
                  </div>

                  {/* Metadata Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded p-2 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Latency</div>
                      <div className="text-xs font-semibold text-zinc-300 mt-0.5">{currentResult.processingTimeMs}ms</div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded p-2 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Characters Cost</div>
                      <div className="text-xs font-semibold text-zinc-300 mt-0.5">
                        {currentResult.characterCost !== null ? `${currentResult.characterCost} chars` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded p-2 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">File Size</div>
                      <div className="text-xs font-semibold text-zinc-300 mt-0.5">
                        {(currentResult.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded p-2 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Seed Used</div>
                      <div className="text-xs font-mono font-semibold text-zinc-300 mt-0.5">{currentResult.seed}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* FULL WIDTH - Tab: Assembly */}
        {activeTab === 'assembly' && (
          <div className="lg:col-span-12 space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-200">Audio Editor & Stitcher</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Combine and stitch multiple generated audio clips together locally.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Side: Available Audio Clips */}
              <div className="lg:col-span-5 space-y-3">
                <Card className="border-zinc-800 bg-zinc-950/40">
                  <CardHeader className="p-5 pb-3 border-b border-zinc-900 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                      Available Speech Clips ({filteredAvailableClips.length})
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowStarredClipsOnly(prev => !prev)}
                      className={`h-7 px-2.5 text-xs font-semibold rounded-md transition-all gap-1.5 ${
                        showStarredClipsOnly 
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20' 
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <Star className={`h-3.5 w-3.5 ${showStarredClipsOnly ? 'fill-yellow-400' : ''}`} />
                      {showStarredClipsOnly ? "Starred Only" : "Show Starred"}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[480px]">
                      {filteredAvailableClips.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-650">
                          {showStarredClipsOnly 
                            ? 'No starred speech clips in this project workspace.' 
                            : 'No audio recordings available in this project workspace. Generate some speech first.'}
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-900/60">
                          {filteredAvailableClips.map((item) => (
                            <div key={item.id} className="p-3.5 px-4 hover:bg-zinc-900/40 flex items-center justify-between gap-3 text-xs">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => toggleStarredTake(item.id)}
                                className={`h-7 w-7 transition-colors rounded-md shrink-0 p-0 ${
                                  starredTakeIds.includes(item.id) 
                                    ? 'text-yellow-400 hover:text-yellow-300' 
                                    : 'text-zinc-500 hover:text-yellow-400 hover:bg-zinc-900/60'
                                }`}
                                title={starredTakeIds.includes(item.id) ? "Unstar take" : "Star take"}
                              >
                                <Star className={`h-3.5 w-3.5 ${starredTakeIds.includes(item.id) ? 'fill-yellow-400' : ''}`} />
                              </Button>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                                  <span className="text-purple-400 font-bold">{item.voiceName}</span>
                                  <span>•</span>
                                  <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-zinc-300 line-clamp-2 break-words font-sans text-xs" title={item.text}>{item.text}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAssemblyQueue(prev => [...prev, item])}
                                className="h-8 px-3 border-zinc-850 bg-zinc-900 text-xs font-bold text-zinc-300 hover:text-white"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side: Assembly Queue */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-zinc-800 bg-zinc-950/40">
                  <CardHeader className="p-5 pb-3 border-b border-zinc-900 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                      Assembly Stitching Queue ({assemblyQueue.length} items)
                    </CardTitle>
                    {assemblyQueue.length > 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setAssemblyQueue([])}
                        className="h-auto p-0 text-xs text-red-400 hover:text-red-300 font-bold"
                      >
                        Clear Queue
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[360px] border-b border-zinc-900">
                      {assemblyQueue.length === 0 ? (
                        <div className="p-12 text-center text-xs text-zinc-600 flex flex-col items-center justify-center gap-2">
                          <FileAudio className="h-8 w-8 text-zinc-800 animate-pulse" />
                          <span>Queue is empty. Click &quot;Add&quot; on the left clips list to stack items.</span>
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-900/60">
                          {assemblyQueue.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="p-3.5 px-4 flex items-center justify-between gap-3 text-xs bg-zinc-950/40">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="font-mono text-zinc-500 text-xs font-bold w-4">{idx + 1}.</span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] text-purple-400 font-bold">{item.voiceName}</div>
                                  <p className="text-zinc-200 line-clamp-2 break-words text-xs" title={item.text}>{item.text}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const nextQ = [...assemblyQueue];
                                    const temp = nextQ[idx];
                                    nextQ[idx] = nextQ[idx - 1];
                                    nextQ[idx - 1] = temp;
                                    setAssemblyQueue(nextQ);
                                  }}
                                  className="h-8 w-8 text-zinc-500 hover:text-white disabled:opacity-30 hover:bg-zinc-800/40 rounded-md transition-all"
                                >
                                  ▲
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === assemblyQueue.length - 1}
                                  onClick={() => {
                                    const nextQ = [...assemblyQueue];
                                    const temp = nextQ[idx];
                                    nextQ[idx] = nextQ[idx + 1];
                                    nextQ[idx + 1] = temp;
                                    setAssemblyQueue(nextQ);
                                  }}
                                  className="h-8 w-8 text-zinc-500 hover:text-white disabled:opacity-30 hover:bg-zinc-800/40 rounded-md transition-all"
                                >
                                  ▼
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    const nextQ = [...assemblyQueue];
                                    nextQ.splice(idx, 1);
                                    setAssemblyQueue(nextQ);
                                  }}
                                  className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/40 rounded-md transition-all"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    <div className="p-5 space-y-4">
                      {/* Silence pause input */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-300 font-semibold text-[13px]">Silence Pause Gap between clips</span>
                          <span className="text-zinc-200 font-mono font-medium bg-zinc-900/60 px-1.5 py-0.5 rounded border border-zinc-800/40">{assemblyPauseMs} ms</span>
                        </div>
                        <Slider 
                          value={[assemblyPauseMs]} 
                          onValueChange={(val) => setAssemblyPauseMs(val[0])} 
                          max={5000} 
                          min={0} 
                          step={100}
                          className="[&>.relative>.bg-primary]:bg-purple-500 mt-1"
                        />
                      </div>

                      <Button
                        onClick={handleMergeAudio}
                        disabled={isMergingAudio || assemblyQueue.length < 2}
                        className="w-full btn-interactive-lift bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm h-10 rounded-md gap-1.5"
                      >
                        {isMergingAudio ? (
                          <>
                            <div className="mini-wave-container">
                              <span className="mini-wave-bar" />
                              <span className="mini-wave-bar" />
                              <span className="mini-wave-bar" />
                            </div>
                            Stitching buffer...
                          </>
                        ) : (
                          <>
                            <FileAudio className="h-4 w-4" />
                            Merge & Download WAV File
                          </>
                        )}
                      </Button>
                      {assemblyQueue.length < 2 && (
                        <p className="text-xs text-zinc-500 text-center">Add at least 2 audio clips to enable stitching.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* FULL WIDTH - Tab: History */}
        {activeTab === 'history' && (
          <div className="col-span-1 @4xl:col-span-12 space-y-4 min-w-0">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-zinc-200">Local History Log</h2>
                {!zenMode && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Stored in browser IndexedDB. Capped at 500 items (with Smart Pruning & TTL).
                  </p>
                )}
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleClearServerCache}
                className="text-xs font-bold h-10 px-4 shadow-md transition-all active:translate-y-[1px]"
                disabled={historyItems.length === 0}
              >
                <Trash className="h-3.5 w-3.5 mr-1" /> {isHosted ? 'Clear History Log' : 'Clear Cache Folder'}
              </Button>
            </div>

            {/* Local Storage Indicator Banner */}
            {!zenMode && (
              <div className="bg-zinc-950/80 border border-zinc-850 rounded-lg p-5 space-y-2.5 text-xs shadow-sm">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
                  <span className="text-purple-400">🔒</span> Strictly Local Offline History
                </div>
                <p className="text-zinc-450 leading-relaxed text-xs">
                  {isHosted ? (
                    <span>
                      All generated audio files are saved directly in your browser&apos;s sandboxed database (<code className="text-purple-400">IndexedDB</code>). Your history metadata and voice files are stored 100% locally on your machine and never uploaded to any hosting server or database.
                    </span>
                  ) : (
                    <span>
                      All generated audio files are saved directly to your local hard drive in the folder below. Your history metadata and voice files are stored 100% locally on your machine (browser <code className="text-purple-400">IndexedDB</code> and server filesystem) and never uploaded to any external server or database.
                    </span>
                  )}
                </p>
                <div className="flex flex-col gap-1.5 pt-1 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <span className="text-zinc-400 font-semibold">Local Storage Path:</span>
                    <span className="text-purple-400 select-all">
                      {isHosted ? 'Browser Sandboxed Database (IndexedDB)' : storagePath}
                    </span>
                  </div>
                  <div className="text-zinc-500">
                    <span className="text-zinc-400 font-semibold">Cache Policy:</span> Capped at <span className="text-zinc-300 font-bold">500 files</span>. Unstarred/unassigned files older than <span className="text-zinc-300 font-bold">30 days</span> are auto-purged. Favorites are protected.
                  </div>
                  <div className="text-zinc-500">
                    <span className="text-zinc-400 font-semibold">Local Disk Usage:</span> <span className="text-purple-400 font-bold">{((historyItems.reduce((acc, item) => acc + (item.sizeBytes || 0), 0)) / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>
            )}

            {displayedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-zinc-850 rounded-lg bg-zinc-900/20 text-center gap-2">
                <FileAudio className="h-8 w-8 text-zinc-650" />
                <div className="text-sm font-semibold text-zinc-450">No Generations Yet</div>
                <div className="text-xs text-zinc-600 max-w-[280px]">
                  {activeProjectId 
                    ? 'No generations inside this project yet. Switch to another project or generate some audio.'
                    : 'Generate some speech, dialogue, or stitched chunks to see them appear in your local history logs.'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupHistoryItems(displayedHistory).map((group) => {
                  if (!group.isGroup) {
                    const item = group.items[0];
                    return (
                      <Card key={item.id} className="border-zinc-850 bg-zinc-950/40 relative flex flex-col justify-between group/card hover:border-purple-900/40 hover:shadow-lg hover:shadow-purple-950/10 transition-all duration-300 [content-visibility:auto] [contain-intrinsic-size:auto_180px]">
                        <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-zinc-900 space-y-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${item.type === 'dialogue' ? 'bg-blue-400' : item.type === 'chunked' ? 'bg-yellow-400' : item.type === 'sts' ? 'bg-purple-400' : 'bg-green-400'}`} />
                            <span className="text-[11px] font-bold text-zinc-400 capitalize">
                              {item.type === 'sts' ? 'Voice Conversion' : item.type} Take
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-500">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleStarredTake(item.id)}
                              className={`h-5 w-5 transition-colors rounded ${
                                starredTakeIds.includes(item.id) 
                                  ? 'text-yellow-400 hover:text-yellow-300' 
                                  : 'text-zinc-500 hover:text-yellow-400 hover:bg-zinc-900/60'
                              }`}
                              title={starredTakeIds.includes(item.id) ? "Unstar take" : "Star take"}
                            >
                              <Star className={`h-3 w-3 ${starredTakeIds.includes(item.id) ? 'fill-yellow-400' : ''}`} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              className="h-5 w-5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900/60 transition-colors rounded"
                              title="Delete generation take"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="py-3 space-y-3">
                          <div className="text-xs text-zinc-300 leading-relaxed line-clamp-3 bg-zinc-900/30 border border-zinc-900 p-2 rounded relative group/text pr-8">
                            <div>{item.text}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyText(item.id, item.text)}
                              className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all absolute right-1 top-1 opacity-40 group-hover/text:opacity-100 focus:opacity-100"
                              title="Copy text"
                            >
                              {copiedId === item.id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-zinc-500 border-b border-zinc-900 pb-2">
                            <div>
                              Voice: <span className="text-zinc-300 font-medium">{item.voiceName}</span>
                            </div>
                            <div>
                              Seed: <span className="text-zinc-300 font-mono font-medium">{item.seed ?? 'N/A'}</span>
                            </div>
                            <div>
                              Size: <span className="text-zinc-300 font-medium">{(item.sizeBytes / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>

                          {/* Playback or delete feedback */}
                          {item.existsOnServer ? (
                            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-800 rounded p-2">
                              <audio src={item.audioUrl} controls className="h-6 w-full text-[10px]" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 p-2 bg-red-950/15 border border-red-900/20 text-red-400 rounded text-xs">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span>File auto-purged from disk (exceeded 300 files limit).</span>
                            </div>
                          )}
                        </CardContent>

                        <div className="flex justify-between items-center p-3 border-t border-zinc-900 bg-zinc-950/80 rounded-b-lg">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => replicateSettings(item)}
                            className="text-[10px] h-7 px-2 hover:bg-zinc-800 text-purple-400 hover:text-purple-300 font-semibold"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Replicate Settings
                          </Button>

                          {item.existsOnServer && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => triggerBrowserDownload(item.filename, item.audioUrl)}
                              className="text-[10px] h-7 px-2 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                            >
                              <Download className="h-3 w-3 mr-1" /> Download
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  } else {
                    // Render Take Group Stack Card
                    const selectedKeepId = bestTakes[group.groupId] || group.items[0].id;
                    return (
                      <Card key={group.id} className="border-purple-900/30 bg-zinc-950/40 relative flex flex-col justify-between group/card hover:border-purple-900/50 hover:shadow-xl hover:shadow-purple-950/10 transition-all duration-300 md:col-span-2">
                        <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-zinc-900 space-y-0">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-xs font-bold text-zinc-300">
                              🎬 Multiple Takes Group ({group.items.length} takes)
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleClearRejects(group)}
                              className="h-6 px-2 text-[10px] border-zinc-800 hover:bg-zinc-900 hover:text-green-400 bg-zinc-900/40"
                              title="Keep only selected best take and delete others"
                            >
                              ⭐ Keep Best Take Only
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteHistoryGroup(group)}
                              className="h-6 w-6 text-zinc-500 hover:text-red-400"
                              title="Delete all takes in group"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="py-4 space-y-4">
                          <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/30 border border-zinc-900 p-2.5 rounded relative pr-8">
                            <div>{group.text}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyText(group.id, group.text)}
                              className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all absolute right-1 top-1 opacity-40 hover:opacity-100"
                              title="Copy text"
                            >
                              {copiedId === group.id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {group.items.map((take: HistoryItem) => {
                              const isSelected = selectedKeepId === take.id;
                              return (
                                <div 
                                  key={take.id} 
                                  className={`p-3 rounded-lg border transition-all duration-200 ${isSelected ? 'border-purple-800 bg-purple-950/10' : 'border-zinc-900 bg-zinc-950/60'}`}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-purple-900 text-purple-200' : 'bg-zinc-900 text-zinc-400'}`}>
                                        Take {take.takeNumber}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-mono">Seed: {take.seed}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSelectBestTake(group.groupId, take.id, group.items)}
                                        className={`h-5 px-1.5 text-[9px] font-medium rounded ${isSelected ? 'text-green-400 hover:text-green-300 bg-green-950/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
                                      >
                                        {isSelected ? '⭐ Best Selected' : 'Mark Best'}
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => toggleStarredTake(take.id)}
                                        className={`h-5 w-5 transition-colors rounded ${
                                          starredTakeIds.includes(take.id) 
                                            ? 'text-yellow-400 hover:text-yellow-300' 
                                            : 'text-zinc-500 hover:text-yellow-400 hover:bg-zinc-900/60'
                                        }`}
                                        title={starredTakeIds.includes(take.id) ? "Unstar take" : "Star take"}
                                      >
                                        <Star className={`h-3 w-3 ${starredTakeIds.includes(take.id) ? 'fill-yellow-400' : ''}`} />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDeleteHistoryItem(take.id)}
                                        className="h-5 w-5 text-zinc-500 hover:text-red-400"
                                        title="Delete this take only"
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <audio src={take.audioUrl} controls className="h-6 w-full text-[10px] bg-zinc-900 rounded" />
                                  </div>

                                  <div className="flex justify-between items-center text-[9px] text-zinc-600 mt-2 pt-1.5 border-t border-zinc-900/60">
                                    <div>Latency: {take.processingTimeMs}ms</div>
                                    <div>Cost: {take.characterCost} chars</div>
                                    <div className="flex gap-2">
                                      <button onClick={() => replicateSettings(take)} className="text-purple-400 hover:text-purple-300 font-semibold">Replicate</button>
                                      <button onClick={() => triggerBrowserDownload(take.filename, take.audioUrl)} className="text-zinc-400 hover:text-white font-semibold">Download</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Create Project Modal Overlay */}
      {isCreateProjOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-900">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-purple-400" />
                Create New Project
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsCreateProjOpen(false)}
                className="h-6 w-6 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name" className="text-xs text-zinc-400">Project Name *</Label>
                <Input 
                  id="proj-name" 
                  placeholder="e.g. Audiobook Vol. 1" 
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc" className="text-xs text-zinc-400">Description (Optional)</Label>
                <Input 
                  id="proj-desc" 
                  placeholder="e.g. Chapter 1 narration with standard narrator voice" 
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-9"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsCreateProjOpen(false)}
                  className="text-xs border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (!newProjName.trim()) {
                      toast.error('Please enter a project name');
                      return;
                    }
                    handleCreateProject(newProjName, newProjDesc);
                    setIsCreateProjOpen(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 401 Auth Error Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <Card className="w-full max-w-md border-red-900/50 bg-zinc-950 text-zinc-100 shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader className="pb-3 border-b border-zinc-900">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-red-400">
                <AlertCircle className="h-4 w-4" />
                Ошибка авторизации (401)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="text-xs text-zinc-300 leading-relaxed">
                Похоже, ваш ключ больше не действителен (возможно, он был отозван или удален). Пожалуйста, введите новый валидный ключ ElevenLabs.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-auth-key" className="text-xs text-zinc-400">Новый API Ключ</Label>
                <Input 
                  id="new-auth-key" 
                  type="password"
                  placeholder="sk_..." 
                  value={authModalKey}
                  onChange={(e) => setAuthModalKey(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono focus-visible:ring-red-900/50"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  size="sm" 
                  disabled={isSavingKey || !authModalKey.trim()}
                  onClick={async () => {
                    setIsSavingKey(true);
                    await setKey(authModalKey.trim());
                    setIsSavingKey(false);
                    setShowAuthModal(false);
                    setAuthModalKey('');
                    toast.success('Key updated! Try generating again.');
                  }}
                  className="bg-red-900 hover:bg-red-800 text-white text-xs font-semibold px-6"
                >
                  {isSavingKey ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
                  Сохранить и продолжить
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}


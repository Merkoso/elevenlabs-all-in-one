'use client';

import { KeyIcon, AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useKey } from '@/components/key-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ApiKeyBannerProps {
  variant?: 'header' | 'sidebar' | 'hero';
}

export function ApiKeyBanner({ variant = 'header' }: ApiKeyBannerProps) {
  const [key, setKey] = useKey();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(key || '');

  const [isConnecting, setIsConnecting] = useState(false);

  const hasApiKey = key !== null && key !== '';
  const hasChanges = inputValue !== (key || '');

  const handleSave = async () => {
    const newKey = inputValue.trim() === '' ? null : inputValue;
    setIsConnecting(true);
    try {
      await setKey(newKey);
    } finally {
      setIsConnecting(false);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
  };

  if (variant === 'hero') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-xl max-w-md mx-auto shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 space-y-6">
        <div className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-full text-purple-400">
          <KeyIcon className="h-10 w-10 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-zinc-100 tracking-tight">API Key Required</h3>
          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
            To use the ElevenLabs Workbench, you need to provide an API key. Your key is stored strictly in your browser session and is never saved to the cloud.
          </p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <div className="flex gap-2">
            <Input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-zinc-900 border-zinc-800 text-xs h-10 text-zinc-100 focus-visible:ring-purple-800"
              placeholder="Paste your ElevenLabs API Key (sk_...)"
            />
            {inputValue && (
              <Button variant="outline" size="icon" onClick={handleClear} className="h-10 w-10 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </Button>
            )}
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!inputValue.trim() || isConnecting} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-10 rounded-lg shadow-lg hover:shadow-purple-500/20 transition-all text-xs"
          >
            {isConnecting ? 'Connecting...' : 'Connect API Key'}
          </Button>
          <p className="text-[10px] text-zinc-500">
            Don&apos;t have a key?{' '}
            <Link
              href="https://elevenlabs.io/app/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-purple-400 hover:text-purple-300 transition-colors"
            >
              Get one from ElevenLabs
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Different styling based on variant
  const buttonClasses =
    variant === 'header'
      ? cn(
          'flex items-center gap-2 rounded-full font-medium transition-all',
          hasApiKey
            ? 'bg-green-600/20 text-green-500 hover:bg-green-600/30'
            : 'bg-red-600/20 text-red-500 hover:bg-red-600/30'
        )
      : cn(
          'flex w-full items-center justify-between rounded font-medium transition-all',
          hasApiKey
            ? 'bg-green-600/10 text-green-500 hover:bg-green-600/20'
            : 'bg-red-600/10 text-red-500 hover:bg-red-600/20'
        );

  return (
    <div className={variant === 'header' ? 'flex items-center' : 'w-full'}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            className={buttonClasses}
            variant="ghost"
            size={variant === 'header' ? 'sm' : 'default'}
          >
            {hasApiKey ? (
              <>
                <span className="flex items-center gap-2">
                  <KeyIcon className="h-4 w-4" />
                  <span>API Key Set</span>
                </span>
                {variant === 'sidebar' && (
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                )}
              </>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <AlertTriangleIcon className="h-4 w-4 animate-pulse" />
                  <span>Set API Key</span>
                </span>
                {variant === 'sidebar' && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
                )}
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ElevenLabs API Key</DialogTitle>
            <DialogDescription>
              Enter your ElevenLabs API key to access the platform features. You can find your API
              key in your{' '}
              <Link
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                ElevenLabs account
              </Link>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1"
                  placeholder="Enter your ElevenLabs API key"
                />
                <Button variant="outline" size="icon" onClick={handleClear} title="Clear API Key">
                  <span className="sr-only">Clear</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

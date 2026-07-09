'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { setApiKey as setApiKeyAction } from '@/app/actions/manage-api-key';

const KeyContext = React.createContext<
  [string | null, (newKey: string | null) => Promise<void>] | undefined
>(undefined);

export function KeyProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey: string | null;
}) {
  const router = useRouter();
  const [key, setKeyState] = React.useState<string | null>(apiKey);

  const setKey = React.useCallback(async (newKey: string | null) => {
    // 1. Await the server action so the cookie is definitively set on the backend
    await setApiKeyAction(newKey);
    // 2. Trigger router refresh so that Server Components (like layout) get the updated cookie
    router.refresh();
    // 3. Update the local React state, immediately triggering dependent client components to re-fetch
    setKeyState(newKey);
  }, [router]);

  return <KeyContext.Provider value={[key, setKey]}>{children}</KeyContext.Provider>;
}

export function useKey() {
  const context = React.useContext(KeyContext);
  if (context === undefined) {
    throw new Error('useKey must be used within a KeyProvider');
  }
  return context;
}

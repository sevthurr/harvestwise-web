import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useIsRestoring } from '@tanstack/react-query';
import { router } from './routes';
import { ensureCanonicalPriceList, persistOfflineQueryCache, queryClient, persister, shouldDehydrateQuery } from './global/lib/queryClient';
import { PwaUpdatePrompt } from './global/components/shared/PwaUpdatePrompt';
import { CropsProvider } from './farmer/components/crops/CropsContext';
import { DisplayModeProvider } from './global/contexts/DisplayModeContext';
import { AuthProvider } from './global/contexts/AuthContext';
import { LanguageProvider } from './global/contexts/LanguageContext';

import { BackgroundProcessProvider } from './global/contexts/BackgroundProcessContext';
import { NotificationStreamProvider } from './global/contexts/NotificationStreamContext';
import { AppErrorBoundary } from './global/components/RouteError';

function RestoredAppContent() {
  const isRestoring = useIsRestoring();

  useEffect(() => {
    if (isRestoring) return;
    if (ensureCanonicalPriceList(queryClient)) {
      persistOfflineQueryCache(queryClient);
    }
  }, [isRestoring]);

  if (isRestoring) {
    return <div role="status" className="min-h-screen grid place-items-center text-sm text-[var(--hw-neutral-600)]">Loading offline data…</div>;
  }

  return (
    <AuthProvider>
      <LanguageProvider>
        <AppErrorBoundary>
          <DisplayModeProvider>
            <CropsProvider>
              <NotificationStreamProvider>
                <BackgroundProcessProvider>
                  <Suspense fallback={null}>
                    <RouterProvider router={router} />
                  </Suspense>
                  <PwaUpdatePrompt />
                </BackgroundProcessProvider>
              </NotificationStreamProvider>
            </CropsProvider>
          </DisplayModeProvider>
        </AppErrorBoundary>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        dehydrateOptions: { shouldDehydrateQuery },
      }}
    >
      <RestoredAppContent />
    </PersistQueryClientProvider>
  );
}


import { RouterProvider } from 'react-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { router } from './routes';
import { queryClient, persister } from './global/lib/queryClient';
import { CropsProvider } from './farmer/components/crops/CropsContext';
import { DisplayModeProvider } from './global/contexts/DisplayModeContext';
import { AuthProvider } from './global/contexts/AuthContext';
import { LanguageProvider } from './global/contexts/LanguageContext';

import { BackgroundProcessProvider } from './global/contexts/BackgroundProcessContext';
import { NotificationStreamProvider } from './global/contexts/NotificationStreamContext';

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
      <AuthProvider>
        <LanguageProvider>
          <DisplayModeProvider>
            <CropsProvider>
              <NotificationStreamProvider>
                <BackgroundProcessProvider>
                  <RouterProvider router={router} />
                </BackgroundProcessProvider>
              </NotificationStreamProvider>
            </CropsProvider>
          </DisplayModeProvider>
        </LanguageProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}


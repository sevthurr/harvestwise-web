import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { queryClient } from './global/lib/queryClient';
import { CropsProvider } from './farmer/components/crops/CropsContext';
import { DisplayModeProvider } from './global/contexts/DisplayModeContext';
import { AuthProvider } from './global/contexts/AuthContext';
import { LanguageProvider } from './global/contexts/LanguageContext';

import { BackgroundProcessProvider } from './global/contexts/BackgroundProcessContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <DisplayModeProvider>
            <CropsProvider>
              <BackgroundProcessProvider>
                <RouterProvider router={router} />
              </BackgroundProcessProvider>
            </CropsProvider>
          </DisplayModeProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}


import { RouterProvider } from 'react-router';
import { router } from './routes';
import { CropsProvider } from './farmer/components/crops/CropsContext';
import { DisplayModeProvider } from './global/contexts/DisplayModeContext';
import { AuthProvider } from './global/contexts/AuthContext';
import { LanguageProvider } from './global/contexts/LanguageContext';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DisplayModeProvider>
          <CropsProvider>
            <RouterProvider router={router} />
          </CropsProvider>
        </DisplayModeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

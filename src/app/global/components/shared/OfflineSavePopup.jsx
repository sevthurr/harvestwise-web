import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Transient "saving for offline use" notice for the login / first-open seed.
 * AuthProvider owns the phase and dismisses success/error after ~2s; this
 * component only renders the current phase. It is informational, so it does
 * not trap focus or require any interaction.
 */
export function OfflineSavePopup({ phase }) {
  const { t } = useLanguage();

  if (phase === 'idle' || !phase) return null;

  const saving = phase === 'saving';
  const error = phase === 'error';

  const message = saving
    ? t('farmer.offline_save_saving', {}, 'Saving your data for offline use…')
    : error
      ? t('farmer.offline_save_error', {}, 'Some offline data could not be saved')
      : t('farmer.offline_save_success', {}, 'Saved for offline use');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
      <div
        role="status"
        aria-live="polite"
        aria-busy={saving}
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12)]"
      >
        {saving ? (
          <Loader2 aria-hidden="true" className="mx-auto mb-3 h-8 w-8 animate-spin text-[var(--hw-green-700)] motion-reduce:animate-none" />
        ) : error ? (
          <AlertCircle aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-red-600" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
        )}
        <p className={`text-[15px] font-semibold ${error ? 'text-red-800' : 'text-[var(--hw-neutral-900)]'}`}>
          {message}
        </p>
      </div>
    </div>
  );
}

export default OfflineSavePopup;

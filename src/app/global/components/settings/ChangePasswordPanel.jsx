import { ShieldAlert } from "lucide-react";
import { Card, SectionTitle } from "../ui/hw-ui";
import { useLanguage } from "../../contexts/LanguageContext";
import { PasswordChangeForm } from "./PasswordChangeForm";

/**
 * Full-width block shown in place of the workspace content while the signed-in
 * user is still on an admin-provisioned temporary password.
 *
 * This replaces a dismissible modal. Dismissing it was a dead end: the
 * privileged routers refuse the caller with 403 via require_password_rotated(),
 * so the user browsed a half-broken app with no route back to the prompt. This
 * has no close button, no backdrop dismissal, and no "Later" — which is safe
 * because the backend deliberately leaves GET /auth/me and
 * POST /auth/change-password open, so satisfying the requirement is always
 * possible from here.
 *
 * Presentational: the layout owns the gate and passes onRotated.
 */
const ChangePasswordPanel = ({ onRotated }) => {
  const { t } = useLanguage();

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-lg">
        <Card>
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <SectionTitle>
                {t(
                  "common.pw_panel_title",
                  {},
                  "Change your temporary password"
                )}
              </SectionTitle>
              <p className="text-[13px] leading-relaxed text-black">
                {t(
                  "common.pw_panel_body",
                  {},
                  "To keep your account secure, please replace the temporary password you received with a password only you know."
                )}
              </p>
            </div>
          </div>

          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
            {t(
              "common.pw_panel_restricted",
              {},
              "Your account is on a temporary password, so the rest of the app stays unavailable until you finish this step."
            )}
          </p>

          {/* No onCancel — this surface must not offer an escape route. */}
          <PasswordChangeForm onSuccess={onRotated} idPrefix="panel" />
        </Card>
      </div>
    </div>
  );
};

export { ChangePasswordPanel };
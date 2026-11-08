/**
 * AdminAuditLogs.jsx
 *
 * Admin view of the audit trail from the `logs` table. The rendering lives in
 * the shared AuditLogsView; this page supplies the admin data source, the
 * action namespace filter and the "Unknown Admin" export attribution.
 *
 * API (query_logs):
 *   GET /api/admin/logs
 *   ?user_id=&action=&date_from=&date_to=&page=1&page_size=20
 *   Returns: { items: LogResponse[], total, page, page_size }
 */

import { adminApi } from "../../../services/api";
import AuditLogsView from "../../global/components/audit/AuditLogsView";

// Action filter options based on the dot-notation namespaces actually written
// to the logs table. Each value is matched as a substring by the backend, so
// "auth" covers auth.login, auth.totp_*, auth.otp_*, etc.
const ACTION_FILTER_OPTIONS = [
  { value: "",           label: "All Actions"         },
  { value: "auth",       label: "Auth"                },
  { value: "import",     label: "Import"              },
  { value: "config",     label: "Config"              },
  { value: "dftc",       label: "DFTC"                },
  { value: "farmer",     label: "Farmer"              },
  { value: "user",       label: "User Management"     },
  { value: "position",   label: "Positions"           },
];

function AdminAuditLogs() {
  return (
    <AuditLogsView
      title="Audit Logs"
      description="View and track system events and administrative actions."
      queryKeyPrefix="adminAuditLogs"
      fetchLogs={adminApi.getAuditLogs}
      actionOptions={ACTION_FILTER_OPTIONS}
      showUserFilter
      exportFileName="audit-logs"
      onRecordExport={(payload) => adminApi.recordActivity(payload)}
      generatedByFallback="Unknown Admin"
      emptyDescription="Admin actions will be recorded here automatically once the backend is connected."
    />
  );
}

export default AdminAuditLogs;

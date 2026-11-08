import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import AuditLogsView from "../../global/components/audit/AuditLogsView";
import { dftcApi } from "../../../services/api/dftcApi";

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "auth", label: "Auth" },
  { value: "dftc", label: "DFTC" },
  { value: "import", label: "Import" },
  { value: "user", label: "Account" },
  { value: "export", label: "Export" },
];

export default function DFTCAuditLogs() {
  const access = useQuery({
    queryKey: ["dftcAuditLogsAccess"],
    queryFn: () => dftcApi.getAuditLogs({ page_size: 1 }),
    retry: false,
    staleTime: 60 * 1000,
  });

  if (access.isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (access.error) {
    return <div className="px-6 py-12 text-center"><h1 className="text-xl font-semibold">Access Denied</h1><p className="mt-2 text-sm text-gray-500">You do not have permission to view these audit logs.</p></div>;
  }

  return <AuditLogsView
    title="Audit Logs"
    description="View DFTC activity and administrative events."
    queryKeyPrefix="dftcAuditLogs"
    fetchLogs={dftcApi.getAuditLogs}
    actionOptions={ACTION_FILTER_OPTIONS}
    showUserFilter
    exportFileName="dftc-audit-logs"
    onRecordExport={() => dftcApi.recordActivity({ action: "export.dftc_audit_logs_pdf", details: "Exported DFTC audit logs" })}
    generatedByFallback="Unknown DFTC Staff"
    emptyDescription="DFTC activity will be recorded here automatically."
  />;
}

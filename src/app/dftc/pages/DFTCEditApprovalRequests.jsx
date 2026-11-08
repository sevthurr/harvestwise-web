import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dftcApi } from "../../../services/api/dftcApi";
import { useAuth } from "../../global/contexts/AuthContext";

export default function DFTCEditApprovalRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHead = user?.position === "Acting Section Head" || user?.staff_profile?.position_name === "Acting Section Head";
  const { data, isLoading, error } = useQuery({ queryKey: ["dftc-edit-approval-requests"], queryFn: () => dftcApi.getEditApprovalRequests(), enabled: isHead });
  const requests = data?.items || [];
  async function approve(item) {
    if (item.requester_user_id === user?.id && !window.confirm("This is your own request. Do you really want to approve it?")) return;
    if (!window.confirm("Apply these proposed changes?")) return;
    await dftcApi.approveEditApprovalRequest(item.id);
    queryClient.invalidateQueries({ queryKey: ["dftc-edit-approval-requests"] });
  }
  async function reject(item) {
    const comment = window.prompt("Reason for rejection (required):", "");
    if (!comment?.trim()) return;
    await dftcApi.rejectEditApprovalRequest(item.id, comment.trim());
    queryClient.invalidateQueries({ queryKey: ["dftc-edit-approval-requests"] });
  }
  if (!isHead) return <div className="p-6">Access denied.</div>;
  if (isLoading) return <div className="p-6">Loading approval requests…</div>;
  if (error) return <div className="p-6 text-red-700">Unable to load approval requests.</div>;
  return <div className="p-6 space-y-4"><h1 className="text-xl font-semibold">Saved-data edit approvals</h1>{!requests.length && <p>No pending requests.</p>}{requests.map((item) => <section key={item.id} className="rounded-xl border bg-white p-4 space-y-2"><div className="flex justify-between gap-4"><div><b>{item.target_submission_id}</b><div className="text-sm">Requested by {item.requester_user_id}</div></div><span className="text-sm">{item.status}</span></div>{item.reason && <p className="text-sm">Reason: {item.reason}</p>}<details><summary className="cursor-pointer">Before / after values</summary><pre className="mt-2 overflow-auto text-xs">{JSON.stringify({ before: item.before_values, after: item.proposed_changes }, null, 2)}</pre></details>{item.status === "pending" && <div className="flex gap-2"><button onClick={() => approve(item)} className="rounded bg-green-700 px-3 py-2 text-white">Approve</button><button onClick={() => reject(item)} className="rounded border px-3 py-2">Reject</button></div>}</section>)}</div>;
}

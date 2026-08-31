const STATUS_CFG = {
  "Completed": { color: "text-emerald-700", dot: "bg-emerald-500" },
  "Completed with Warnings": { color: "text-amber-700", dot: "bg-amber-400" },
  "Failed": { color: "text-red-700", dot: "bg-red-500" }
};

const STEP_STATUS_CFG = {
  "Completed": { color: "text-emerald-700", dot: "bg-emerald-500" },
  "Skipped": { color: "text-[#94a3b8]", dot: "bg-slate-300" },
  "Failed": { color: "text-red-700", dot: "bg-red-500" }
};

const ACTIVITY_TYPES = [
  "File Upload",
  "API Sync",
  "Forecast Generation",
  "Module Output Calculation",
  "Weight / Threshold Update",
  "Publish to Farmer App"
];

const JOB_STATUSES = [
  "Completed",
  "Completed with Warnings",
  "Failed"
];

export {
  ACTIVITY_TYPES,
  JOB_STATUSES,
  STATUS_CFG,
  STEP_STATUS_CFG
};

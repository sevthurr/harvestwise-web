import { Sprout, ChevronRight, FileText, AlertCircle } from "lucide-react";
const RecommendEntry = ({
  hasDraft,
  onStart,
  onContinueDraft
}) => <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
      {
  /* Icon + title */
}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 bg-[var(--hw-green-50)] rounded-2xl">
          <Sprout className="w-7 h-7 text-[var(--hw-green-700)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--hw-neutral-900)]">
            Check what to plant
          </h1>
          <p className="mt-1.5 text-sm text-[var(--hw-neutral-900)] leading-relaxed">
            Tell us about your planting plan, expected costs, and possible harvest.
            HarvestWise will use this information to prepare a personalized recommendation.
          </p>
        </div>
      </div>

      {
  /* What to expect */
}
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] divide-y divide-[var(--hw-neutral-100)]">
        {[
  { num: "1", label: "Choose crop" },
  { num: "2", label: "Planting details" },
  { num: "3", label: "Cost and selling price" },
  { num: "4", label: "Review Breakeven" }
].map((s) => <div key={s.num} className="flex items-center gap-3 px-4 py-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--hw-green-50)] text-[var(--hw-green-700)] text-xs font-bold flex items-center justify-center">
              {s.num}
            </span>
            <span className="text-sm text-[var(--hw-neutral-700)]">{s.label}</span>
          </div>)}
      </div>

      {
  /* Actions */
}
      <div className="space-y-3">
        <button
  onClick={onStart}
  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--hw-green-700)] text-white font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
>
          Start assessment
          <ChevronRight className="w-4 h-4" />
        </button>

        {hasDraft && <button
  onClick={onContinueDraft}
  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-white text-[var(--hw-green-700)] font-medium rounded-xl border border-[var(--hw-green-400)] hover:bg-[var(--hw-green-50)] transition-colors"
>
            <FileText className="w-4 h-4" />
            Continue saved draft
          </button>}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-[var(--hw-neutral-700)]">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Results are estimates and do not guarantee income.
        </p>
      </div>
  </div>;
export {
  RecommendEntry
};

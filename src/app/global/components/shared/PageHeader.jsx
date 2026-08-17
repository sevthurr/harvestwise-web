function PageHeader({ title, description, meta, action, className = "" }) {
  return <div
    className={`rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-6 py-5 ${className}`}
    style={{
      background: "linear-gradient(135deg, var(--hw-green-50) 0%, #ffffff 52%, #ffffff 100%)"
    }}
  >
      <div className={`flex gap-4 ${action ? "items-start justify-between flex-wrap" : ""}`}>
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-[var(--hw-neutral-900)] leading-tight">{title}</h1>
          {description && <p className="text-[14px] text-[var(--hw-neutral-800)] mt-1 leading-snug">{description}</p>}
          {meta && <p className="text-[13px] text-[var(--hw-neutral-800)] mt-0.5">{meta}</p>}
        </div>
        {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
      </div>
    </div>;
}
export {
  PageHeader
};

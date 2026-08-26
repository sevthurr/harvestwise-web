function PageHeader({ title, description, meta, action, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--hw-green-700)] px-6 py-5 relative overflow-hidden shadow-[var(--shadow-xs)] ${className}`}
      style={{
        background: "linear-gradient(90deg, #143601 0%, #1b4702 35%, #276105 70%, #3d860d 100%)"
      }}
    >
      <div className={`relative z-10 flex gap-4 ${action ? "items-start justify-between flex-wrap" : ""}`}>
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-white leading-tight">{title}</h1>
          {description && <p className="text-[14px] text-white/95 mt-1 leading-snug font-normal">{description}</p>}
          {meta && <p className="text-[13px] text-white/80 mt-0.5">{meta}</p>}
        </div>
        {action && <div className="flex-shrink-0 mt-0.5 relative z-10">{action}</div>}
      </div>
    </div>
  );
}
export {
  PageHeader
};

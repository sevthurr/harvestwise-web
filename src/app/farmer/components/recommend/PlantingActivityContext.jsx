import { useState } from "react";
import { Info } from "lucide-react";
const PLANTING_ACTIVITY = {
  kamatis: {
    assoc: { planning: 4, planted: 3, areaTotal: 1850, harvestVolEst: "2,100\u20132,800 kg", harvestWindow: "Jul 26 \u2013 Aug 12" },
    platform: { total: 120, planning: 18, planted: 24, areaTotal: 12400, harvestVolEst: "14,000\u201318,000 kg", harvestWindow: "Jul 20 \u2013 Sep 5" },
    highConcentration: true,
    concentrationNote: "Several Kamatis crop records are expected to reach harvest during the same period. Consider coordinating planting area or harvest schedules."
  },
  talong: {
    assoc: { planning: 1, planted: 1, areaTotal: 600, harvestVolEst: "650\u2013800 kg", harvestWindow: "Sep 1 \u2013 Sep 20" },
    platform: { total: 120, planning: 8, planted: 6, areaTotal: 4200, harvestVolEst: "4,800\u20136,200 kg", harvestWindow: "Aug 20 \u2013 Oct 10" },
    highConcentration: false,
    concentrationNote: ""
  },
  repolyo: {
    assoc: { planning: 1, planted: 1, areaTotal: 600, harvestVolEst: "700\u2013900 kg", harvestWindow: "Sep 5 \u2013 Sep 25" },
    platform: { total: 120, planning: 22, planted: 14, areaTotal: 9800, harvestVolEst: "11,000\u201314,000 kg", harvestWindow: "Aug 25 \u2013 Oct 15" },
    highConcentration: true,
    concentrationNote: "Several Repolyo crop records overlap in expected harvest period. Consider coordinating planting area or harvest schedules."
  },
  atsal: {
    assoc: { planning: 2, planted: 0, areaTotal: 500, harvestVolEst: "Not yet planted", harvestWindow: "Sep \u2013 Oct" },
    platform: { total: 120, planning: 6, planted: 4, areaTotal: 2800, harvestVolEst: "3,200\u20134,100 kg", harvestWindow: "Sep 10 \u2013 Nov 5" },
    highConcentration: false,
    concentrationNote: ""
  },
  carrots: {
    assoc: { planning: 1, planted: 1, areaTotal: 400, harvestVolEst: "480\u2013600 kg", harvestWindow: "Sep 15 \u2013 Oct 5" },
    platform: { total: 120, planning: 4, planted: 8, areaTotal: 3600, harvestVolEst: "4,200\u20135,500 kg", harvestWindow: "Sep 5 \u2013 Oct 20" },
    highConcentration: false,
    concentrationNote: ""
  },
  pipino: {
    assoc: { planning: 0, planted: 1, areaTotal: 200, harvestVolEst: "220\u2013300 kg", harvestWindow: "Jul 15 \u2013 Aug 1" },
    platform: { total: 120, planning: 3, planted: 5, areaTotal: 1800, harvestVolEst: "2,000\u20132,600 kg", harvestWindow: "Jul 10 \u2013 Aug 15" },
    highConcentration: false,
    concentrationNote: ""
  },
  ampalaya: {
    assoc: { planning: 2, planted: 0, areaTotal: 450, harvestVolEst: "Not yet planted", harvestWindow: "Aug \u2013 Sep" },
    platform: { total: 120, planning: 5, planted: 3, areaTotal: 2200, harvestVolEst: "2,500\u20133,200 kg", harvestWindow: "Aug 1 \u2013 Sep 20" },
    highConcentration: false,
    concentrationNote: ""
  },
  kalabasa: {
    assoc: { planning: 1, planted: 1, areaTotal: 600, harvestVolEst: "630\u2013800 kg", harvestWindow: "Sep 1 \u2013 Sep 20" },
    platform: { total: 120, planning: 7, planted: 9, areaTotal: 4800, harvestVolEst: "5,600\u20137,200 kg", harvestWindow: "Aug 20 \u2013 Oct 1" },
    highConcentration: false,
    concentrationNote: ""
  },
  lettuce: {
    assoc: { planning: 1, planted: 1, areaTotal: 350, harvestVolEst: "280\u2013350 kg", harvestWindow: "Jul 15 \u2013 Aug 5" },
    platform: { total: 120, planning: 12, planted: 16, areaTotal: 7200, harvestVolEst: "6,000\u20138,000 kg", harvestWindow: "Jul 5 \u2013 Aug 20" },
    highConcentration: true,
    concentrationNote: "Several Lettuce crop records overlap in expected harvest period. Consider coordinating planting schedules."
  },
  pechay: {
    assoc: { planning: 1, planted: 1, areaTotal: 550, harvestVolEst: "350\u2013450 kg", harvestWindow: "Jul 10 \u2013 Aug 1" },
    platform: { total: 120, planning: 15, planted: 12, areaTotal: 6500, harvestVolEst: "4,500\u20136,000 kg", harvestWindow: "Jul 1 \u2013 Aug 15" },
    highConcentration: true,
    concentrationNote: "Several Pechay crop records overlap in expected harvest period. Consider coordinating planting area or harvest schedules."
  },
  // Fallback data for any other commodity
  default: {
    assoc: { planning: 2, planted: 1, areaTotal: 500, harvestVolEst: "Varies", harvestWindow: "TBD" },
    platform: { total: 120, planning: 10, planted: 8, areaTotal: 5e3, harvestVolEst: "Varies", harvestWindow: "TBD" },
    highConcentration: false,
    concentrationNote: ""
  }
};
const ASSOC_PREFERENCE_COUNT = 3;
const InfoPopover = ({ text, align = "left" }) => {
  const [open, setOpen] = useState(false);
  return <span className="relative inline-flex flex-shrink-0">
      <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setOpen((v) => !v);
    }}
    className="p-0.5 text-[var(--hw-neutral-400)] hover:text-blue-500 transition-colors"
    aria-label="More information"
  >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && <>
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <span
    className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1 z-20 w-60 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-[var(--shadow-lg)] p-3 block`}
    onClick={(e) => e.stopPropagation()}
  >
            <p className="text-[13px] text-[var(--hw-neutral-700)] leading-relaxed">{text}</p>
          </span>
        </>}
    </span>;
};
const DataRow = ({ label, value }) => <div className="flex justify-between gap-3 py-1.5 border-b border-[var(--hw-neutral-100)] last:border-0">
    <span className="text-[13px] text-[var(--hw-neutral-900)] flex-shrink-0">{label}</span>
    <span className="text-[13px] font-medium text-[var(--hw-neutral-900)] text-right">{value}</span>
  </div>;
const PlantingActivityContext = ({
  commodityId,
  commodityName,
  defaultExpanded = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const activity = PLANTING_ACTIVITY[commodityId] ?? PLANTING_ACTIVITY["default"];
  const { assoc, platform } = activity;
  const planningPct = Math.round(platform.planning / platform.total * 100);
  const plantedPct = Math.round(platform.planted / platform.total * 100);
  const totalActive = assoc.planning + assoc.planted;
  return null;
};
export {
  PlantingActivityContext
};

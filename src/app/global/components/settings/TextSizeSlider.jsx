import { useTextSize } from "../../contexts/TextSizeContext";
import { Card, SectionLabel, TEXT_SIZE_OPTIONS } from "../ui/hw-ui";
const TextSizeSlider = ({
  showToast,
  description = "Adjusts text size across the app."
}) => {
  const { textSize, setTextSize } = useTextSize();
  return <Card>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>Text Size</SectionLabel>
        <span className="text-[14px] font-semibold text-[var(--hw-green-700)] -mt-3">
          {TEXT_SIZE_OPTIONS.find((o) => o.value === textSize)?.label}
        </span>
      </div>
      <p className="text-[13px] text-black mb-4">{description}</p>
      <input
    type="range"
    min={0}
    max={2}
    step={1}
    value={TEXT_SIZE_OPTIONS.findIndex((o) => o.value === textSize)}
    onChange={(e) => {
      const opt = TEXT_SIZE_OPTIONS[Number(e.target.value)];
      if (opt) {
        setTextSize(opt.value);
        showToast("Text size updated.");
      }
    }}
    className="w-full h-2 rounded-full appearance-none cursor-pointer
          bg-[var(--hw-neutral-200)]
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[var(--hw-green-700)]
          [&::-webkit-slider-thumb]:shadow-sm
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[var(--hw-green-700)]
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
  />
      <div className="flex justify-between mt-2">
        {TEXT_SIZE_OPTIONS.map((opt) => <span key={opt.value} className={`text-[12px] font-medium ${textSize === opt.value ? "text-[var(--hw-green-700)]" : "text-black"}`}>
            {opt.label}
          </span>)}
      </div>
    </Card>;
};
export {
  TextSizeSlider
};

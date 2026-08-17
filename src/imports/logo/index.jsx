export function VerticalLogo({ className }) {
  return (
    <div className={className || "h-[361px] relative w-[494px]"} data-name="vertical_logo">
      <img 
        alt="HarvestWise Logo" 
        src="/vertical-logo.png" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default VerticalLogo;

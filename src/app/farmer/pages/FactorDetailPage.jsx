import { useNavigate, useLocation } from "react-router";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { FactorDetailTabs } from "../components/shared/FactorDetailTabs";
function FactorDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;
  if (!state) {
    return <div className="px-4 py-8 text-center space-y-3">
        <p className="text-[var(--hw-neutral-900)]">Detailed factors not available.</p>
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-[var(--hw-green-700)]">Go back</button>
      </div>;
  }
  const { title, subtitle, breadcrumbs, backPath, backLabel, price, arrival, production, weather, profitability, commodityId, commodityName } = state;
  const breadcrumbItems = breadcrumbs.map((bc) => ({
    label: bc.label,
    onClick: bc.path ? () => navigate(bc.path) : void 0
  }));
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Page title */}
        <div>
          <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{title}</h1>
          {subtitle && <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">{subtitle}</p>}
        </div>

        {/* Factor tabs */}
        <FactorDetailTabs
          price={price}
          arrival={arrival}
          production={production}
          weather={weather}
          profitability={profitability}
          defaultTab="price"
          commodityId={commodityId}
          commodityName={commodityName}
        />
    </div>;
}
export {
  FactorDetailPage as default
};

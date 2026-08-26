import { Home, PhilippinePeso, CalendarDays, Sprout } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const navItems = [
  { id: "home", label: "Home", key: "nav.home", icon: <Home className="w-5 h-5" /> },
  { id: "prices", label: "Prices", key: "nav.prices", icon: <PhilippinePeso className="w-5 h-5" /> },
  { id: "guide", label: "Calendar", key: "nav.guide", icon: <CalendarDays className="w-5 h-5" /> },
  { id: "crops", label: "My Crops", key: "nav.my_crops", icon: <Sprout className="w-5 h-5" /> }
];

const BottomNav = ({ activeItem = "home", onItemClick }) => {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--hw-neutral-200)] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] px-2 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-[var(--hw-green-700)] bg-[var(--hw-green-50)]"
                  : "text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{t(item.key, {}, item.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export { BottomNav };

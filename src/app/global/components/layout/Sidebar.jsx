import { Home, PhilippinePeso, CalendarDays, Sprout } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const navItems = [
  { id: "home", label: "Home", key: "nav.home", icon: <Home className="w-5 h-5" /> },
  { id: "prices", label: "Prices", key: "nav.prices", icon: <PhilippinePeso className="w-5 h-5" /> },
  { id: "guide", label: "Crop Calendar", key: "nav.guide", icon: <CalendarDays className="w-5 h-5" /> },
  { id: "crops", label: "My Crops", key: "nav.my_crops", icon: <Sprout className="w-5 h-5" /> }
];

const Sidebar = ({
  activeItem = "home",
  onItemClick,
  collapsed = false
}) => {
  const { t } = useLanguage();

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-[var(--hw-neutral-200)] transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } hidden md:flex flex-col`}
    >
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 pt-3">
        {navItems.map((item) => {
          const isActive = activeItem === item.id;
          const translatedLabel = t(item.key, {}, item.label);
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-[var(--hw-green-700)] text-white"
                  : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)]"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? translatedLabel : void 0}
            >
              {item.icon}
              {!collapsed && <span className="font-medium">{translatedLabel}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export { Sidebar };

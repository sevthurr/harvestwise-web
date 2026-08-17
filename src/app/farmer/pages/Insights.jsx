import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  CloudRain,
  TrendingUp,
  Package,
  Clock,
  CalendarDays,
  RotateCcw,
  RefreshCw,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCheck,
  Check,
  X,
  WifiOff,
  Bell,
  ChevronRight,
  Loader2
} from "lucide-react";
const INITIAL_ALERTS = [
  {
    id: "a1",
    category: "weather",
    tab: "weather",
    urgency: "urgent",
    title: "Heavy rain may affect your Kamatis crop",
    summary: "Heavy rain is expected during the next several days and may affect field activity and deliveries.",
    detail: "The weather service reports heavy rainfall for Davao City over the next 4 to 6 days. Field activity, including fertilizer application and harvesting, may be disrupted. Market deliveries may also be affected, which could temporarily reduce supply and shift prices.",
    commodity: "Kamatis",
    relatedTo: "Kamatis crop \u2014 Planted / Growing",
    reason: "Your active Kamatis crop is in a growing phase and may be affected by sustained heavy rain.",
    timestamp: "Today, 7:30 AM",
    group: "today",
    read: false,
    action: { label: "View crop", route: "/crops/crop-1" }
  },
  {
    id: "a2",
    category: "price",
    tab: "market",
    urgency: "attention",
    title: "Kamatis prices are rising",
    summary: "Recent market prices have improved since your last update.",
    detail: "Kamatis retail prices at Bangkerohan Public Market have moved upward over the past two days. This may be related to reduced supply from farms affected by recent weather. Prices are now above your break-even price of \u20B142/kg.",
    commodity: "Kamatis",
    relatedTo: "Kamatis \u2014 Bangkerohan Public Market",
    reason: "You have an active Kamatis crop plan. Rising prices may improve your expected earnings.",
    timestamp: "Today, 8:00 AM",
    group: "today",
    read: false,
    action: { label: "View market", route: "/prices/kamatis" }
  },
  {
    id: "a3",
    category: "supply",
    tab: "market",
    urgency: "attention",
    title: "Talong supply may increase soon",
    summary: "More deliveries may reach the market near your expected harvest period.",
    detail: "Market monitors indicate that more farms are likely to harvest Talong in the coming weeks. Increased supply may put downward pressure on prices near your expected harvest date. Consider reviewing your planting plan.",
    commodity: "Talong",
    relatedTo: "Talong plan \u2014 On Hold",
    reason: "Your Talong plan is currently on hold. Upcoming supply changes may affect your reassessment.",
    timestamp: "Today, 9:15 AM",
    group: "today",
    read: false,
    action: { label: "Review crop plan", route: "/crops/crop-2" }
  },
  {
    id: "a4",
    category: "harvest",
    tab: "crops",
    urgency: "information",
    title: "Your Kamatis harvest is approaching",
    summary: "Your expected harvest window begins in seven days.",
    detail: "Based on your planting date of May 5, 2026, your Kamatis harvest window is expected to begin around July 19, 2026. Prepare your harvesting equipment, post-harvest storage, and transport. Check current market prices before deciding when to sell.",
    commodity: "Kamatis",
    relatedTo: "Kamatis crop \u2014 Planted / Growing",
    reason: "Your Kamatis crop is approaching the Pre-Harvest phase based on your recorded planting date.",
    timestamp: "Today, 6:00 AM",
    group: "today",
    read: true,
    action: { label: "View harvest outlook", route: "/crops/crop-1" }
  },
  {
    id: "a5",
    category: "calendar",
    tab: "market",
    urgency: "information",
    title: "Upcoming payday period may support demand",
    summary: "Demand may improve during the upcoming payday period.",
    detail: "The mid-month payday period is approaching. Historical market data suggests that demand for vegetables, including Kamatis, tends to increase during payday weeks as households buy more fresh produce. This may temporarily support prices.",
    relatedTo: "Market calendar \u2014 Davao City",
    reason: "Market calendar indicators show an upcoming payday period that may influence demand across monitored commodities.",
    timestamp: "Yesterday, 3:00 PM",
    group: "earlier",
    read: true,
    action: { label: "View market details", route: "/prices" }
  },
  {
    id: "a6",
    category: "reassessment",
    tab: "crops",
    urgency: "attention",
    title: "Reassess your Talong plan",
    summary: "Your saved plan has been on hold for three days. New market information is available.",
    detail: "Your Talong planting plan has been on hold for three days. Market supply and price information has been updated since your last assessment. A new reassessment may give you a more accurate recommendation before you decide whether to proceed or hold further.",
    commodity: "Talong",
    relatedTo: "Talong plan \u2014 On Hold",
    reason: "HarvestWise sends a reminder when a plan has been on hold for three or more days and new data is available.",
    timestamp: "Yesterday, 10:00 AM",
    group: "earlier",
    read: false,
    action: { label: "Reassess now", route: "/forecast" }
  },
  {
    id: "a7",
    category: "system",
    tab: "system",
    urgency: "information",
    title: "New information is available",
    summary: "Connect to update prices, forecasts, weather, and crop monitoring results.",
    detail: "Updated market prices, weather data, and crop monitoring results are available. Connect to the internet to download the latest information for your saved crops and market watchlist.",
    relatedTo: "System synchronization",
    reason: "HarvestWise checks for new data periodically and notifies you when updates are available.",
    timestamp: "Yesterday, 6:00 AM",
    group: "earlier",
    read: true,
    action: { label: "Sync now", route: "" }
  }
];
const URGENCY_CONFIG = {
  urgent: { label: "Urgent", Icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50" },
  attention: { label: "Attention", Icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  information: { label: "Information", Icon: Info, color: "text-blue-500", bg: "bg-blue-50" }
};
const CATEGORY_ICON = {
  weather: CloudRain,
  price: TrendingUp,
  supply: Package,
  harvest: Clock,
  calendar: CalendarDays,
  reassessment: RotateCcw,
  system: RefreshCw
};
const TABS = [
  { id: "all", label: "All" },
  { id: "crops", label: "My Crops" },
  { id: "market", label: "Market" },
  { id: "weather", label: "Weather" },
  { id: "system", label: "System" }
];
const AlertDetailDrawer = ({
  alert,
  onClose,
  onMarkRead,
  onNavigate,
  onSync
}) => {
  if (!alert) return null;
  const urgency = URGENCY_CONFIG[alert.urgency];
  const CategoryIcon = CATEGORY_ICON[alert.category];
  return <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        {
    /* Header */
  }
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex-shrink-0 p-2 rounded-xl mt-0.5 ${urgency.bg}`}>
              <CategoryIcon className={`w-4 h-4 ${urgency.color}`} />
            </div>
            <p className="font-semibold text-[var(--hw-neutral-900)] leading-snug">{alert.title}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Body */
  }
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {
    /* Urgency label */
  }
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${urgency.color}`}>
            <urgency.Icon className="w-3.5 h-3.5" />
            {urgency.label}
          </span>

          {
    /* Full explanation */
  }
          <p className="text-sm text-[var(--hw-neutral-700)] leading-relaxed">{alert.detail}</p>

          {
    /* Meta */
  }
          <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] divide-y divide-[var(--hw-neutral-200)]">
            {alert.relatedTo && <div className="flex justify-between gap-4 px-3 py-2.5 flex-wrap">
                <span className="text-xs text-[var(--hw-neutral-700)]">Related to</span>
                <span className="text-xs font-medium text-[var(--hw-neutral-700)]">{alert.relatedTo}</span>
              </div>}
            <div className="flex justify-between gap-4 px-3 py-2.5 flex-wrap">
              <span className="text-xs text-[var(--hw-neutral-700)]">Date and time</span>
              <span className="text-xs font-medium text-[var(--hw-neutral-700)]">{alert.timestamp}</span>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-xs text-[var(--hw-neutral-700)] mb-1">Why this alert?</p>
              <p className="text-xs text-[var(--hw-neutral-900)] leading-relaxed">{alert.reason}</p>
            </div>
          </div>
        </div>

        {
    /* Footer */
  }
        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] space-y-2">
          {alert.action.route ? <button
    onClick={() => {
      onNavigate(alert.action.route);
      onClose();
    }}
    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
              {alert.action.label}
              <ChevronRight className="w-4 h-4" />
            </button> : <button
    onClick={() => {
      onSync();
      onClose();
    }}
    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
              <RefreshCw className="w-4 h-4" />
              {alert.action.label}
            </button>}
          {!alert.read && <button
    onClick={() => {
      onMarkRead(alert.id);
      onClose();
    }}
    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
              <Check className="w-4 h-4" />
              Mark as read
            </button>}
        </div>
      </div>
    </>;
};
const AlertCard = ({ alert, onOpen, onMarkRead }) => {
  const urgency = URGENCY_CONFIG[alert.urgency];
  const CategoryIcon = CATEGORY_ICON[alert.category];
  return <button
    onClick={() => {
      onOpen(alert);
      if (!alert.read) onMarkRead(alert.id);
    }}
    className={`w-full text-left flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-[var(--hw-neutral-50)] ${!alert.read ? "bg-[var(--hw-green-50)]/50" : "bg-white"}`}
  >
      {
    /* Category icon with urgency tint */
  }
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 ${urgency.bg}`}>
        <CategoryIcon className={`w-5 h-5 ${urgency.color}`} />
      </div>

      {
    /* Content */
  }
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!alert.read ? "font-semibold text-[var(--hw-neutral-900)]" : "font-medium text-[var(--hw-neutral-700)]"}`}>
            {alert.title}
          </p>
          <span className="flex-shrink-0 text-xs text-[var(--hw-neutral-700)] mt-0.5">{alert.timestamp}</span>
        </div>
        <p className="text-xs text-[var(--hw-neutral-900)] leading-relaxed">{alert.summary}</p>
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {
    /* Urgency label — icon + text, not color alone */
  }
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${urgency.color}`}>
            <urgency.Icon className="w-3 h-3" />
            {urgency.label}
          </span>
          {alert.commodity && <span className="text-xs text-[var(--hw-neutral-700)]">· {alert.commodity}</span>}
        </div>
      </div>

      {
    /* Unread dot */
  }
      {!alert.read && <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--hw-green-700)] mt-2" />}
    </button>;
};
const EmptyState = ({ unreadOnly }) => <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
    <div className="w-14 h-14 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center">
      <Bell className="w-7 h-7 text-[var(--hw-neutral-300)]" />
    </div>
    <p className="font-semibold text-[var(--hw-neutral-700)]">
      {unreadOnly ? "No unread alerts" : "No alerts"}
    </p>
    <p className="text-sm text-[var(--hw-neutral-900)] max-w-xs leading-relaxed">
      {unreadOnly ? "All caught up. You have no unread alerts right now." : "Important crop and market updates will appear here."}
    </p>
  </div>;
const OfflineState = () => <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mx-4">
    <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-semibold text-amber-800">You are offline</p>
      <p className="text-sm text-amber-700 mt-0.5">Showing alerts saved on this device.</p>
    </div>
  </div>;
function InsightsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [activeTab, setActiveTab] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [openAlert, setOpenAlert] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline] = useState(false);
  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);
  const filtered = useMemo(() => {
    let list = alerts;
    if (activeTab !== "all") list = list.filter((a) => a.tab === activeTab);
    if (unreadOnly) list = list.filter((a) => !a.read);
    return list;
  }, [alerts, activeTab, unreadOnly]);
  const todayAlerts = filtered.filter((a) => a.group === "today");
  const earlierAlerts = filtered.filter((a) => a.group === "earlier");
  const markOneRead = (id) => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  const markAllRead = () => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2e3);
  };
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-5">

        {
    /* Header */
  }
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--hw-neutral-900)]">
                Alerts and Advisories
              </h1>
              <p className="text-sm text-[var(--hw-neutral-900)] mt-1 leading-relaxed">
                Important updates about your crops, market conditions, weather, and saved information.
              </p>
            </div>
            {
    /* Unread count pill */
  }
            {unreadCount > 0 && <span className="flex-shrink-0 mt-1 min-w-[28px] h-7 px-2 bg-[var(--hw-green-700)] text-white text-sm font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>}
          </div>

          {
    /* Mark all + unread toggle row */
  }
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
    onClick={() => setUnreadOnly((v) => !v)}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${unreadOnly ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              Unread only
            </button>
            {unreadCount > 0 && <button
    onClick={markAllRead}
    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>}
          </div>
        </div>

        {
    /* Offline notice */
  }
        {isOffline && <OfflineState />}

        {
    /* Filter tabs */
  }
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {TABS.map((tab) => {
    const count = alerts.filter(
      (a) => (tab.id === "all" || a.tab === tab.id) && !a.read
    ).length;
    const isActive = activeTab === tab.id;
    return <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${isActive ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
    >
                {tab.label}
                {count > 0 && <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-green-600 text-white" : "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)]"}`}>
                    {count}
                  </span>}
              </button>;
  })}
        </div>

        {
    /* Syncing indicator */
  }
        {isSyncing && <div className="flex items-center gap-2 text-sm text-[var(--hw-neutral-900)]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--hw-green-600)]" />
            Syncing new information…
          </div>}

        {
    /* Alert list */
  }
        {filtered.length === 0 ? <EmptyState unreadOnly={unreadOnly} /> : <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            {todayAlerts.length > 0 && <div>
                <div className="px-4 py-2 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                  <p className="text-xs font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Today</p>
                </div>
                <div className="divide-y divide-[var(--hw-neutral-100)]">
                  {todayAlerts.map((alert) => <AlertCard
    key={alert.id}
    alert={alert}
    onOpen={setOpenAlert}
    onMarkRead={markOneRead}
  />)}
                </div>
              </div>}

            {earlierAlerts.length > 0 && <div className={todayAlerts.length > 0 ? "border-t border-[var(--hw-neutral-200)]" : ""}>
                <div className="px-4 py-2 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                  <p className="text-xs font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">Earlier</p>
                </div>
                <div className="divide-y divide-[var(--hw-neutral-100)]">
                  {earlierAlerts.map((alert) => <AlertCard
    key={alert.id}
    alert={alert}
    onOpen={setOpenAlert}
    onMarkRead={markOneRead}
  />)}
                </div>
              </div>}
          </div>}
      </div>

      {
    /* Alert detail drawer */
  }
      <AlertDetailDrawer
    alert={openAlert}
    onClose={() => setOpenAlert(null)}
    onMarkRead={markOneRead}
    onNavigate={(route) => navigate(route)}
    onSync={handleSync}
  />
    </div>;
}
export {
  InsightsPage as default
};

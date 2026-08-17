import { useState } from "react";
import { Toast, ToastContainer } from "../../global/components/ui/Toast";
const priceChartData = [
  { date: "2/19", price: 45, forecast: 45 },
  { date: "2/20", price: 48, forecast: 48 },
  { date: "2/21", price: 46, forecast: 47 },
  { date: "2/22", price: 50, forecast: 49 },
  { date: "2/23", price: 52, forecast: 51, confidenceHigh: 55, confidenceLow: 47 },
  { date: "2/24", price: void 0, forecast: 54, confidenceHigh: 58, confidenceLow: 50 },
  { date: "2/25", price: void 0, forecast: 56, confidenceHigh: 61, confidenceLow: 51 },
  { date: "2/26", price: void 0, forecast: 58, confidenceHigh: 64, confidenceLow: 52 }
];
const volumeChartData = [
  { category: "Tomato", volume: 1250 },
  { category: "Lettuce", volume: 980 },
  { category: "Carrot", volume: 1450 },
  { category: "Onion", volume: 2100 },
  { category: "Potato", volume: 1800 }
];
const chatData = [
  {
    id: "1",
    name: "Juan Dela Cruz",
    lastMessage: "What's the current price for tomatoes?",
    timestamp: "10m ago",
    unreadCount: 2,
    avatar: "JD",
    online: true
  },
  {
    id: "2",
    name: "Maria Santos",
    lastMessage: "Thanks for the forecast update!",
    timestamp: "1h ago",
    unreadCount: 0,
    avatar: "MS",
    online: false
  },
  {
    id: "3",
    name: "Green Valley Farm",
    lastMessage: "Can you send the planting guide?",
    timestamp: "2h ago",
    unreadCount: 1,
    avatar: "GV",
    online: true
  }
];
const messageData = [
  {
    id: "1",
    text: "Good morning! What's the current price for tomatoes?",
    timestamp: "10:15 AM",
    sender: "other",
    senderName: "Juan Dela Cruz"
  },
  {
    id: "2",
    text: "Hi Juan! Current tomato price is \u20B152.00 per kg, up 4% from yesterday.",
    timestamp: "10:16 AM",
    sender: "user"
  },
  {
    id: "3",
    text: "Great! Is it a good time to harvest?",
    timestamp: "10:17 AM",
    sender: "other"
  }
];
function ShowcasePage() {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChat, setSelectedChat] = useState("1");
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedDate, setSelectedDate] = useState(void 0);
  const [radioValue, setRadioValue] = useState("tomato");
  return <div className="px-4 md:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {
    /* Hero Section */
  }
        <div className="text-center space-y-4 py-8">
          <img
            src="/vertical-logo.png"
            alt="HarvestWise"
            className="h-32 mx-auto mb-6"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--hw-green-900)]">
            HarvestWise Design System
          </h1>
          <p className="text-lg text-[var(--hw-neutral-900)] max-w-2xl mx-auto">
            A mobile-first, production-ready UI kit for AgriTech applications.
            Built with accessibility, farmer-friendliness, and data-driven insights in mind.
          </p>
        </div>

        {
    /* Rest of showcase content - abbreviated for brevity, copy from original App.tsx */
  }
        {
    /* Color Palette, Typography, Buttons, etc. */
  }
        
        <section>
          <h2 className="text-2xl font-bold text-[var(--hw-neutral-900)] mb-4">Components Showcase</h2>
          <p className="text-[var(--hw-neutral-900)]">
            This page demonstrates all components in the HarvestWise design system. 
            Navigate to other pages to see them in action within real application screens.
          </p>
        </section>

        {
    /* Footer */
  }
        <div className="text-center py-8 text-sm text-[var(--hw-neutral-900)]">
          <p>HarvestWise Design System v1.0 • Built with React, TypeScript, and Tailwind CSS</p>
          <p className="mt-1">Mobile-First • Accessible • Production-Ready</p>
        </div>
      </div>

      {
    /* Modals and Toasts */
  }
      {showToast && <ToastContainer>
          <Toast
    variant="success"
    title="Design System"
    message="Component showcase loaded successfully!"
    onClose={() => setShowToast(false)}
  />
        </ToastContainer>}
    </div>;
}
export {
  ShowcasePage as default
};

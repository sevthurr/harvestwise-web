import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { ChatList } from "../components/messaging/ChatList";
import { ChatThread } from "../components/messaging/ChatThread";
import { SearchInput } from "../../global/components/ui/SearchInput";
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
    name: "Green Valley Farm Supply",
    lastMessage: "Can you send the planting guide?",
    timestamp: "2h ago",
    unreadCount: 1,
    avatar: "GV",
    online: true
  },
  {
    id: "4",
    name: "Bangkerohan Market Stall 5",
    lastMessage: "We need 50kg of lettuce tomorrow",
    timestamp: "3h ago",
    unreadCount: 0,
    avatar: "BM",
    online: false
  }
];
const initialMessages = {
  "1": [
    { id: "1", text: "Good morning! What's the current price for tomatoes?", timestamp: "10:15 AM", sender: "other", senderName: "Juan Dela Cruz" },
    { id: "2", text: "Hi Juan! Current tomato price is \u20B152.00 per kg, up 4% from yesterday.", timestamp: "10:16 AM", sender: "user" },
    { id: "3", text: "Great! Is it a good time to harvest?", timestamp: "10:17 AM", sender: "other", senderName: "Juan Dela Cruz" },
    { id: "4", text: "Based on our 7-day forecast, prices will continue rising. I recommend harvesting within the next 2-3 days for optimal pricing.", timestamp: "10:18 AM", sender: "user" }
  ],
  "2": [
    { id: "1", text: "I saw the latest forecast \u2014 looks like onion prices are peaking soon.", timestamp: "9:10 AM", sender: "other", senderName: "Maria Santos" },
    { id: "2", text: "Yes! Best window to sell is this week.", timestamp: "9:12 AM", sender: "user" },
    { id: "3", text: "Thanks for the forecast update!", timestamp: "9:15 AM", sender: "other", senderName: "Maria Santos" }
  ],
  "3": [
    { id: "1", text: "Can you send the planting guide?", timestamp: "8:30 AM", sender: "other", senderName: "Green Valley Farm Supply" },
    { id: "2", text: "Sure! I'll send it over shortly. It covers tomato and lettuce planting for Q1.", timestamp: "8:35 AM", sender: "user" }
  ],
  "4": [
    { id: "1", text: "We need 50kg of lettuce tomorrow", timestamp: "7:00 AM", sender: "other", senderName: "Bangkerohan Market Stall 5" },
    { id: "2", text: "I can arrange that. What time should we deliver?", timestamp: "7:05 AM", sender: "user" },
    { id: "3", text: "Before 8 AM would be great. Gate 2 entrance.", timestamp: "7:08 AM", sender: "other", senderName: "Bangkerohan Market Stall 5" }
  ]
};
const Avatar = ({
  initials,
  online,
  size = "md"
}) => {
  const dim = size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  return <div className="relative flex-shrink-0">
      <div className={`${dim} rounded-full bg-[var(--hw-green-100)] flex items-center justify-center text-[var(--hw-green-800)] font-semibold`}>
        {initials}
      </div>
      {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />}
    </div>;
};
function MessagesPage() {
  const navigate = useNavigate();
  const [mobileView, setMobileView] = useState("list");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState(initialMessages);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedChatData = chatData.find((c) => c.id === selectedChat);
  const currentMessages = selectedChat ? messages[selectedChat] || [] : [];
  const filteredChats = searchQuery ? chatData.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())) : chatData;
  const handleChatSelect = (chatId) => {
    setSelectedChat(chatId);
    setMobileView("thread");
    setSearchQuery("");
  };
  const handleSendMessage = (text) => {
    if (!selectedChat) return;
    const newMsg = {
      id: Date.now().toString(),
      text,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "user"
    };
    setMessages((prev) => ({
      ...prev,
      [selectedChat]: [...prev[selectedChat] || [], newMsg]
    }));
  };
  const screenH = "h-screen";
  return <div className={`flex bg-white overflow-hidden ${screenH}`}>

      {
    /* ══════════════════════════════════════════════════════════════════════
        MOBILE: List View  (< md)
    ══════════════════════════════════════════════════════════════════════ */
  }
      <div className={`flex flex-col w-full md:hidden ${mobileView === "list" ? "flex" : "hidden"}`}>
        {
    /* Header */
  }
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--hw-neutral-200)] bg-white flex-shrink-0">
          <button
    onClick={() => navigate(-1)}
    className="p-1.5 -ml-1 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
    aria-label="Go back"
  >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-base font-semibold text-[var(--hw-neutral-900)]">Messages</p>
        </div>

        {
    /* Search */
  }
        <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)] flex-shrink-0">
          <SearchInput
    placeholder="Search conversations..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
        </div>

        {
    /* Chat list */
  }
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <ChatList
    chats={filteredChats}
    activeChat={selectedChat || ""}
    onChatSelect={handleChatSelect}
  />
        </div>
      </div>

      {
    /* ══════════════════════════════════════════════════════════════════════
        MOBILE: Thread View  (< md)
    ══════════════════════════════════════════════════════════════════════ */
  }
      <div className={`flex flex-col w-full md:hidden ${mobileView === "thread" ? "flex" : "hidden"}`}>
        {
    /* Thread header */
  }
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--hw-neutral-200)] bg-white flex-shrink-0">
          <button
    onClick={() => setMobileView("list")}
    className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
    aria-label="Back to inbox"
  >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {selectedChatData && <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Avatar initials={selectedChatData.avatar} online={selectedChatData.online} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--hw-neutral-900)] truncate leading-tight">
                  {selectedChatData.name}
                </p>
                <p className="text-xs text-[var(--hw-neutral-900)] leading-tight">
                  {selectedChatData.online ? "Active now" : "Offline"}
                </p>
              </div>
            </div>}
        </div>

        {
    /* Thread content */
  }
        <div className="flex-1 overflow-hidden">
          <ChatThread
    messages={currentMessages}
    onSendMessage={handleSendMessage}
  />
        </div>
      </div>

      {
    /* ══════════════════════════════════════════════════════════════════════
        DESKTOP: Side-by-side  (≥ md)
    ══════════════════════════════════════════════════════════════════════ */
  }
      <div className="hidden md:flex w-full h-full">

        {
    /* Left pane – inbox list */
  }
        <div className="w-80 flex flex-col border-r border-[var(--hw-neutral-200)] bg-white flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--hw-neutral-200)] flex-shrink-0">
            <button
    onClick={() => navigate(-1)}
    className="p-1.5 -ml-1 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
    aria-label="Go back"
  >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <p className="text-base font-semibold text-[var(--hw-neutral-900)]">Messages</p>
          </div>
          <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)] flex-shrink-0">
            <SearchInput
    placeholder="Search conversations..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <ChatList
    chats={filteredChats}
    activeChat={selectedChat || ""}
    onChatSelect={setSelectedChat}
  />
          </div>
        </div>

        {
    /* Right pane – thread */
  }
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedChatData ? <>
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--hw-neutral-200)] flex-shrink-0">
                <Avatar initials={selectedChatData.avatar} online={selectedChatData.online} />
                <div>
                  <p className="text-sm font-semibold text-[var(--hw-neutral-900)] leading-tight">
                    {selectedChatData.name}
                  </p>
                  <p className="text-xs text-[var(--hw-neutral-900)] leading-tight">
                    {selectedChatData.online ? "Active now" : "Offline"}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatThread
    messages={currentMessages}
    onSendMessage={handleSendMessage}
  />
              </div>
            </> : (
    /* Empty-state */
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--hw-neutral-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--hw-neutral-900)]">Select a conversation</p>
                <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">
                  Choose from your inbox to start messaging
                </p>
              </div>
            </div>
  )}
        </div>
      </div>

    </div>;
}
export {
  MessagesPage as default
};

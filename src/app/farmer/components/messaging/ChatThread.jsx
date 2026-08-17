import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
const ChatThread = ({ messages, onSendMessage }) => {
  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage?.(messageText.trim());
      setMessageText("");
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  return <div className="flex flex-col h-full bg-[var(--hw-neutral-50)]">

      {
    /* ── Message list ─────────────────────────────────────────────────── */
  }
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg) => {
    const isUser = msg.sender === "user";
    return <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              {
      /* Sender label – received only */
    }
              {!isUser && msg.senderName && <p className="text-xs font-semibold text-[var(--hw-neutral-900)] mb-1 ml-1">
                  {msg.senderName}
                </p>}

              {
      /* Bubble */
    }
              <div
      className={`max-w-[78%] md:max-w-[60%] px-4 py-2.5 rounded-2xl ${isUser ? "bg-[var(--hw-green-700)] text-white rounded-br-sm" : "bg-white text-[var(--hw-neutral-900)] rounded-bl-sm shadow-sm border border-[var(--hw-neutral-200)]"}`}
    >
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.text}
                </p>
                {
      /* Timestamp inside bubble for sent; outside for received */
    }
                {isUser && <p className="text-xs mt-1 text-white/60 text-right">
                    {msg.timestamp}
                  </p>}
              </div>

              {
      /* Timestamp outside for received */
    }
              {!isUser && <p className="text-xs text-[var(--hw-neutral-700)] mt-1 ml-1">
                  {msg.timestamp}
                </p>}
            </div>;
  })}
        <div ref={bottomRef} />
      </div>

      {
    /* ── Input bar ────────────────────────────────────────────────────── */
  }
      <div className="bg-white border-t border-[var(--hw-neutral-200)] px-3 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          {
    /* Attachment */
  }
          <button className="p-2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] rounded-lg transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>

          {
    /* Text input */
  }
          <div className="flex-1 flex items-end bg-[var(--hw-neutral-100)] rounded-2xl px-3 py-2 gap-2">
            <textarea
    value={messageText}
    onChange={(e) => setMessageText(e.target.value)}
    onKeyPress={handleKeyPress}
    placeholder="Type a message..."
    rows={1}
    className="flex-1 bg-transparent border-none resize-none focus:outline-none text-sm text-[var(--hw-neutral-900)] placeholder-[var(--hw-neutral-400)] max-h-28 leading-relaxed"
    style={{ scrollbarWidth: "none" }}
  />
            <button className="p-0.5 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] transition-colors flex-shrink-0">
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {
    /* Send */
  }
          <button
    onClick={handleSend}
    disabled={!messageText.trim()}
    className="p-2.5 bg-[var(--hw-green-700)] text-white rounded-full hover:bg-[var(--hw-green-800)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
  >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>;
};
export {
  ChatThread
};

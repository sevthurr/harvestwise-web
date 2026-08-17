import { MessageSquare } from "lucide-react";
const ChatList = ({ chats, activeChat, onChatSelect }) => {
  return <div className="divide-y divide-[var(--hw-neutral-100)]">
      {chats.map((chat) => {
    const isActive = activeChat === chat.id;
    const hasUnread = (chat.unreadCount ?? 0) > 0;
    return <button
      key={chat.id}
      onClick={() => onChatSelect?.(chat.id)}
      className={`
              w-full py-3.5 px-2 text-left transition-colors rounded-xl
              ${isActive ? "bg-[var(--hw-green-50)]" : "hover:bg-[var(--hw-neutral-50)]"}
            `}
    >
            <div className="flex items-center gap-3">
              {
      /* Avatar */
    }
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-[var(--hw-green-100)] flex items-center justify-center text-[var(--hw-green-800)] text-sm font-bold">
                  {chat.avatar || chat.name.slice(0, 2).toUpperCase()}
                </div>
                {chat.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
              </div>

              {
      /* Content */
    }
              <div className="flex-1 min-w-0">
                {
      /* Name + timestamp */
    }
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <p className={`text-sm truncate ${hasUnread ? "font-bold text-[var(--hw-neutral-900)]" : "font-semibold text-[var(--hw-neutral-900)]"}`}>
                    {chat.name}
                  </p>
                  <span className="text-xs text-[var(--hw-neutral-700)] flex-shrink-0">
                    {chat.timestamp}
                  </span>
                </div>

                {
      /* Last message + unread count */
    }
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${hasUnread ? "text-[var(--hw-neutral-700)]" : "text-[var(--hw-neutral-700)]"}`}>
                    {chat.lastMessage}
                  </p>
                  {
      /* Unread badge – shown as a number (even 0) to match the design */
    }
                  <span
      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${hasUnread ? "bg-[var(--hw-green-700)] text-white" : "bg-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)]"}`}
    >
                    {chat.unreadCount ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </button>;
  })}
    </div>;
};
const EmptyChatList = () => <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
      <MessageSquare className="w-8 h-8 text-[var(--hw-neutral-400)]" />
    </div>
    <h3 className="text-lg font-semibold text-[var(--hw-neutral-900)] mb-2">No messages yet</h3>
    <p className="text-sm text-[var(--hw-neutral-900)]">
      Start a conversation with farmers or stall owners
    </p>
  </div>;
export {
  ChatList,
  EmptyChatList
};

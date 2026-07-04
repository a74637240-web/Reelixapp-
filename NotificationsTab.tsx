import React, { useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Flame, Sparkles, Check } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system';
  username?: string;
  avatar?: string;
  text: string;
  timestamp: string;
  unread: boolean;
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      type: 'like',
      username: 'cyberpunk_vibes',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: 'liked your newly published Reel video.',
      timestamp: '5m ago',
      unread: true,
    },
    {
      id: 'notif_2',
      type: 'comment',
      username: 'skate_pro',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      text: 'commented: "Stunning frequency modulation 🌧️🎛️"',
      timestamp: '28m ago',
      unread: true,
    },
    {
      id: 'notif_3',
      type: 'follow',
      username: 'neon_dancer',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      text: 'started following you.',
      timestamp: '2h ago',
      unread: false,
    },
    {
      id: 'notif_4',
      type: 'system',
      text: 'Welcome to Reels! Start creating awesome videos to grow your crowd ✨',
      timestamp: '1d ago',
      unread: false,
    },
  ]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={10} className="fill-rose-500 text-rose-500" />;
      case 'comment':
        return <MessageCircle size={10} className="fill-indigo-500 text-indigo-500" />;
      case 'follow':
        return <UserPlus size={10} className="text-teal-400" />;
      default:
        return <Sparkles size={10} className="text-amber-400" />;
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="w-full h-full bg-neutral-950 flex flex-col text-white">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-900 bg-neutral-950 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold tracking-wider flex items-center gap-1.5">
          <Bell size={16} className="text-pink-500" />
          Activity
        </h2>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-[10px] font-bold text-indigo-400 hover:text-white flex items-center gap-1"
          >
            <Check size={12} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-12">
            <Bell size={24} className="text-neutral-700 mb-2" />
            <p className="text-xs">No activity notifications yet</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`flex gap-3 p-2.5 rounded-2xl border transition items-center ${
                item.unread
                  ? 'bg-neutral-900/60 border-indigo-500/10'
                  : 'bg-neutral-900/20 border-neutral-900'
              }`}
            >
              {/* User Avatar Circle */}
              {item.avatar ? (
                <div className="relative shrink-0">
                  <img
                    src={item.avatar}
                    alt={item.username}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-950 border border-neutral-800 rounded-full flex items-center justify-center">
                    {getIcon(item.type)}
                  </div>
                </div>
              ) : (
                /* System notification logo */
                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-amber-400">
                  <Flame size={18} />
                </div>
              )}

              {/* Text metadata */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-300 leading-snug">
                  {item.username && (
                    <span className="font-semibold text-white mr-1">@{item.username}</span>
                  )}
                  {item.text}
                </p>
                <span className="text-[9px] text-neutral-500 mt-1 block font-mono">
                  {item.timestamp}
                </span>
              </div>

              {/* Unread circle dot */}
              {item.unread && (
                <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

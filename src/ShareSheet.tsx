import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Send, Link, MessageSquare, Twitter, Facebook } from 'lucide-react';
import { Video } from '../types';
import { getUsers, sendDirectMessage } from '../storageService';

interface ShareSheetProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareSheet({ video, isOpen, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const creators = getUsers().slice(0, 4);

  const handleCopy = () => {
    // Generate a simulated share link
    const dummyLink = `${window.location.origin}/reels/${video.id}`;
    navigator.clipboard.writeText(dummyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToUser = (userId: string) => {
    if (sentTo.includes(userId)) return;
    
    try {
      // Send the actual direct message containing the video ID to the recipient
      sendDirectMessage(userId, undefined, video.id);
      setSentTo(prev => [...prev, userId]);
    } catch (err) {
      console.error('Failed to share reel to DM:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black z-40 cursor-pointer"
          />

          {/* Share Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl z-50 flex flex-col p-4 space-y-4"
          >
            {/* Grabber indicator & Header */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-1 bg-neutral-700 rounded-full mb-3" />
              <div className="flex justify-between items-center w-full">
                <span className="text-white font-semibold text-sm">Share video</span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Simulated DM Direct Share */}
            <div>
              <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider block mb-2.5">
                Send Direct Message
              </span>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {creators.map((user) => (
                  <div key={user.id} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                    <div className="relative">
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-11 h-11 rounded-full object-cover border border-neutral-800"
                        referrerPolicy="no-referrer"
                      />
                      {sentTo.includes(user.id) && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                          <Check size={16} className="text-green-400" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-300 truncate w-full text-center">
                      @{user.username}
                    </span>
                    <button
                      onClick={() => handleSendToUser(user.id)}
                      disabled={sentTo.includes(user.id)}
                      className={`text-[9px] font-semibold py-1 px-2 rounded-full w-full text-center transition ${
                        sentTo.includes(user.id)
                          ? 'bg-neutral-800 text-neutral-500'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {sentTo.includes(user.id) ? 'Sent' : 'Send'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions grid */}
            <div className="border-t border-neutral-800 pt-3.5">
              <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider block mb-2.5">
                Share Link
              </span>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
                >
                  {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                  <span className="text-[10px] truncate">{copied ? 'Copied' : 'Copy link'}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
                >
                  <Twitter size={18} className="text-sky-400" />
                  <span className="text-[10px] truncate">Twitter</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
                >
                  <Facebook size={18} className="text-blue-500" />
                  <span className="text-[10px] truncate">Facebook</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
                >
                  <MessageSquare size={18} className="text-teal-400" />
                  <span className="text-[10px] truncate">WhatsApp</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Send, Sparkles } from 'lucide-react';
import { Comment, User } from '../types';
import { getComments, addComment, toggleLikeComment, getCurrentUser } from '../storageService';

interface CommentSheetProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentsUpdated: (newCount: number) => void;
}

export default function CommentSheet({ videoId, isOpen, onClose, onCommentsUpdated }: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setComments(getComments(videoId));
      setCurrentUser(getCurrentUser());
    }
  }, [videoId, isOpen]);

  // Subscribe to real-time database updates
  useEffect(() => {
    if (!isOpen) return;
    const handleUpdate = () => {
      setComments(getComments(videoId));
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('reels-data-updated', handleUpdate);
    return () => window.removeEventListener('reels-data-updated', handleUpdate);
  }, [videoId, isOpen]);

  // Scroll to bottom when comments are loaded or added
  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const added = await addComment(videoId, newCommentText.trim());
    const updatedList = [...comments, added];
    setComments(updatedList);
    setNewCommentText('');
    onCommentsUpdated(updatedList.length);
  };

  const handleLike = async (commentId: string) => {
    const updated = await toggleLikeComment(commentId);
    if (updated) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, isLiked: updated.isLiked, likesCount: updated.likesCount } : c));
    }
  };

  const suggestComment = () => {
    const suggestions = [
      "This is fire! 🔥",
      "Wow, love the lighting here ✨",
      "Incredible camera angle, teach me!",
      "Loop is so satisfying 🔁",
      "Which track is playing in the background?",
      "Need full tutorial ASAP! 🙌",
      "Stunning! 😍"
    ];
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    setNewCommentText(random);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black z-40 cursor-pointer"
          />

          {/* Comment Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute bottom-0 left-0 right-0 h-[65%] bg-neutral-900 border-t border-neutral-800 rounded-t-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Grabber indicator & Header */}
            <div className="flex flex-col items-center pt-2 pb-3 px-4 border-b border-neutral-800 shrink-0">
              <div className="w-12 h-1 bg-neutral-700 rounded-full mb-3" />
              <div className="flex justify-between items-center w-full">
                <span className="text-white font-semibold text-sm">Comments ({comments.length})</span>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 py-12">
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs mt-1">Be the first to share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 text-sm items-start">
                    <img
                      src={comment.userAvatar}
                      alt={comment.username}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-800 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-medium text-xs">@{comment.username}</span>
                        <span className="text-[10px] text-neutral-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-neutral-200 text-xs mt-0.5 leading-relaxed">{comment.text}</p>
                    </div>
                    <button
                      onClick={() => handleLike(comment.id)}
                      className="flex flex-col items-center gap-0.5 self-center text-neutral-500 hover:text-rose-500 transition-colors"
                    >
                      <Heart
                        size={14}
                        className={comment.isLiked ? 'fill-rose-500 text-rose-500' : 'text-neutral-500'}
                      />
                      {comment.likesCount > 0 && (
                        <span className="text-[10px] text-neutral-500">{comment.likesCount}</span>
                      )}
                    </button>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Quick Suggestions Panel */}
            <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-900 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
              <button 
                onClick={suggestComment}
                className="flex items-center gap-1 bg-neutral-800 text-neutral-300 text-[10px] py-1 px-2.5 rounded-full hover:bg-neutral-700 transition"
              >
                <Sparkles size={10} className="text-purple-400" />
                <span>Auto-suggest</span>
              </button>
              <button 
                onClick={() => setNewCommentText("Incredible! 😍")} 
                className="bg-neutral-800 text-neutral-300 text-[10px] py-1 px-2.5 rounded-full hover:bg-neutral-700 transition"
              >
                Incredible! 😍
              </button>
              <button 
                onClick={() => setNewCommentText("Awesome stuff 🤩")} 
                className="bg-neutral-800 text-neutral-300 text-[10px] py-1 px-2.5 rounded-full hover:bg-neutral-700 transition"
              >
                Awesome stuff 🤩
              </button>
              <button 
                onClick={() => setNewCommentText("Wow 🔥")} 
                className="bg-neutral-800 text-neutral-300 text-[10px] py-1 px-2.5 rounded-full hover:bg-neutral-700 transition"
              >
                Wow 🔥
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center gap-2 shrink-0"
            >
              {currentUser && (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                  referrerPolicy="no-referrer"
                />
              )}
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add comment as you..."
                className="flex-1 bg-neutral-800 border-none outline-none text-white text-xs py-2 px-3 rounded-xl placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-700"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="p-2 rounded-full text-indigo-400 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

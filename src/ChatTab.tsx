import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ArrowLeft, Send, Film, Search, Sparkles, Check, CheckCheck, X, User, ArrowUpRight, Phone, Video as VideoIcon, PhoneOff, Mic, MicOff, Volume2, VolumeX, Camera, CameraOff } from 'lucide-react';
import { User as UserType, Video, Message, Conversation } from '../types';
import {
  getCurrentUser,
  getConversations,
  sendDirectMessage,
  markMessagesAsRead,
  getVideos,
  getUsers,
  getMessages,
} from '../storageService';

interface ChatTabProps {
  onVideoClick: (videoId: string) => void;
  onCreatorClick: (username: string) => void;
  initialActiveCreatorId?: string | null; // Allow opening a chat directly if initiated elsewhere
}

export default function ChatTab({ onVideoClick, onCreatorClick, initialActiveCreatorId }: ChatTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUser, setActiveUser] = useState<UserType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  // Call System States
  const [currentCall, setCurrentCall] = useState<{
    type: 'audio' | 'video';
    state: 'ringing' | 'connected' | 'ended';
    muted: boolean;
    speaker: boolean;
    cameraOff: boolean;
    startTime?: number;
  } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [userMediaStream, setUserMediaStream] = useState<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Load baseline data
  useEffect(() => {
    setCurrentUser(getCurrentUser());
    setVideos(getVideos());
    refreshConversations();
  }, []);

  // Subscribe to real-time database updates
  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(getCurrentUser());
      setVideos(getVideos());
      refreshConversations();
      if (activeUser) {
        // Refresh active user's message log
        const allMessages = getMessages();
        const activeConvoMessages = allMessages.filter(
          (msg: Message) =>
            (msg.senderId === currentUser?.id && msg.receiverId === activeUser.id) ||
            (msg.senderId === activeUser.id && msg.receiverId === currentUser?.id)
        );
        setMessages(activeConvoMessages.sort((a: Message, b: Message) => a.createdAt - b.createdAt));
      }
    };
    window.addEventListener('reels-data-updated', handleUpdate);
    return () => window.removeEventListener('reels-data-updated', handleUpdate);
  }, [activeUser, currentUser?.id]);

  // Sync active creator if provided initially
  useEffect(() => {
    if (initialActiveCreatorId) {
      const allUsers = getUsers();
      const targetUser = allUsers.find(u => u.id === initialActiveCreatorId);
      if (targetUser) {
        handleSelectUser(targetUser);
      }
    }
  }, [initialActiveCreatorId]);

  // Refresh active messages and mark read when active user changes
  useEffect(() => {
    if (activeUser) {
      markMessagesAsRead(activeUser.id);
      refreshActiveMessages();
      refreshConversations();
    }
  }, [activeUser]);

  // Smooth scroll to bottom on message updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const refreshConversations = () => {
    setConversations(getConversations());
  };

  const refreshActiveMessages = () => {
    if (!activeUser || !currentUser) return;
    const allMessages = JSON.parse(localStorage.getItem('reels_messages') || '[]');
    const activeConvoMessages = allMessages.filter(
      (m: Message) =>
        (m.senderId === currentUser.id && m.receiverId === activeUser.id) ||
        (m.senderId === activeUser.id && m.receiverId === currentUser.id)
    );
    // Sort by chronological order
    setMessages(activeConvoMessages.sort((a: Message, b: Message) => a.createdAt - b.createdAt));
  };

  // Handle simulated ringing to active transition after 3 seconds
  useEffect(() => {
    if (!currentCall || currentCall.state !== 'ringing') return;

    const timer = setTimeout(() => {
      setCurrentCall(prev => {
        if (!prev) return null;
        return {
          ...prev,
          state: 'connected',
          startTime: Date.now(),
        };
      });
      setCallDuration(0);
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentCall?.state]);

  // Handle call duration tick
  useEffect(() => {
    if (!currentCall || currentCall.state !== 'connected') {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentCall?.state]);

  // Handle user's camera stream for video calls
  useEffect(() => {
    if (!currentCall || currentCall.type !== 'video' || currentCall.state !== 'connected' || currentCall.cameraOff) {
      if (userMediaStream) {
        userMediaStream.getTracks().forEach(track => track.stop());
        setUserMediaStream(null);
      }
      return;
    }

    // Try to get webcam
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
      .then(stream => {
        setUserMediaStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.warn('Camera access denied or unavailable, using fallback:', err);
      });

    return () => {
      if (userMediaStream) {
        userMediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentCall?.type, currentCall?.state, currentCall?.cameraOff]);

  // Connect local video ref stream when stream state updates
  useEffect(() => {
    if (localVideoRef.current && userMediaStream) {
      localVideoRef.current.srcObject = userMediaStream;
    }
  }, [userMediaStream]);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initiateCall = (type: 'audio' | 'video') => {
    setCurrentCall({
      type,
      state: 'ringing',
      muted: false,
      speaker: type === 'video', // default speaker on for video
      cameraOff: false,
    });
  };

  const endCall = () => {
    if (!currentCall || !activeUser || !currentUser) return;

    // Save end-call state
    setCurrentCall(prev => prev ? { ...prev, state: 'ended' } : null);

    // Stop streams
    if (userMediaStream) {
      userMediaStream.getTracks().forEach(track => track.stop());
      setUserMediaStream(null);
    }

    // Append simulated call summary message to the chat history
    const durationStr = formatDuration(callDuration);
    const callTypeLabel = currentCall.type === 'video' ? 'Video call' : 'Voice call';
    const messageText = `📞 ${callTypeLabel} ended • Duration: ${durationStr}`;

    const messagesKey = 'reels_messages';
    const allMessages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const endCallMessage: Message = {
      id: `msg_call_${Date.now()}`,
      senderId: currentUser.id,
      receiverId: activeUser.id,
      text: messageText,
      timestamp,
      createdAt: Date.now(),
      isRead: true, // mark as read
    };

    allMessages.push(endCallMessage);
    localStorage.setItem(messagesKey, JSON.stringify(allMessages));

    // Wait a brief second to show "Call Ended" on the overlay before closing
    setTimeout(() => {
      setCurrentCall(null);
      refreshActiveMessages();
      refreshConversations();
    }, 1200);
  };

  const handleSelectUser = (user: UserType) => {
    setActiveUser(user);
    setSearchQuery('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !messageInput.trim()) return;

    const trimmedMsg = messageInput.trim();
    setMessageInput('');

    // Send the message locally
    sendDirectMessage(activeUser.id, trimmedMsg);
    
    // Refresh states
    refreshActiveMessages();
    refreshConversations();

    // IMMERSIVE SIMULATED CREATOR AUTOREPLY
    simulateCreatorReply(activeUser, trimmedMsg);
  };

  const simulateCreatorReply = (creator: UserType, userMessage: string) => {
    const creatorName = creator.displayName;
    const lowercaseMsg = userMessage.toLowerCase();
    
    let replyText = `Hey! Thanks for messaging. Let's keep in touch! Check out my latest videos in the meantime. 🚀✨`;

    // Tailored interactive responses based on selected creator and context clues
    if (creator.username === 'cyberpunk_vibes') {
      if (lowercaseMsg.includes('collab') || lowercaseMsg.includes('work') || lowercaseMsg.includes('video')) {
        replyText = `Whoa, yes! I'm down to collaborate. Let's design some futuristic transitions centered around Shibuya's neon nightlife 🌌 DM me your ideas!`;
      } else {
        replyText = `Hey there! Tokyo is beautiful tonight. Hope you're enjoying my night aesthetics! What's your favorite look? 💜`;
      }
    } else if (creator.username === 'skate_pro') {
      if (lowercaseMsg.includes('skate') || lowercaseMsg.includes('park') || lowercaseMsg.includes('session')) {
        replyText = `Let's shred! 🛹 I'll be at the Venice skatepark around 8 AM Saturday. Let's film some raw lines!`;
      } else {
        replyText = `Yo! Keep pushing, keep grinding. Hit me up if you want any tips on landing your kickflips cleanly! 🙌`;
      }
    } else if (creator.username === 'neon_dancer') {
      if (lowercaseMsg.includes('dance') || lowercaseMsg.includes('music') || lowercaseMsg.includes('song')) {
        replyText = `Dance has no limits! 💃 Let's sync up on a modular bass beat. I'd love to choreograph a transition clip to your sound!`;
      } else {
        replyText = `Hey! Feel the rhythm! Thanks for the support, let's keep creating beautiful movement! ⚡`;
      }
    } else if (creator.username === 'sound_synth') {
      if (lowercaseMsg.includes('synth') || lowercaseMsg.includes('audio') || lowercaseMsg.includes('beat')) {
        replyText = `Analogue loops are the best 🎛️ Let me know if you need any ambient, lofi, or synthwave tracks for your video uploads!`;
      } else {
        replyText = `Thanks for tuning in! Working on a brand new cozy lofi beat track. Sending ambient vibes your way! 🎧🌧️`;
      }
    } else if (creator.username === 'city_runner') {
      replyText = `Sunset runs are absolute therapy! 🏃‍♀️🌆 Make sure to step outside and catch some gorgeous evening skies today!`;
    }

    // Set a slight natural delay for typing simulation
    setTimeout(() => {
      // Create message manually to simulate incoming message
      const messagesKey = 'reels_messages';
      const allMessages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
      
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const replyMessage: Message = {
        id: `msg_reply_${Date.now()}`,
        senderId: creator.id,
        receiverId: currentUser?.id || 'current_user_1',
        text: replyText,
        timestamp,
        createdAt: Date.now(),
        isRead: false,
      };

      allMessages.push(replyMessage);
      localStorage.setItem(messagesKey, JSON.stringify(allMessages));

      // Refresh UI if the user is still chatting with this creator
      if (activeUser?.id === creator.id) {
        refreshActiveMessages();
      }
      refreshConversations();
    }, 1800);
  };

  // Filtered lists of users to initiate new chats with
  const allUsers = getUsers();
  const filteredUsers = allUsers.filter(
    u =>
      u.id !== currentUser?.id &&
      (u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full h-full bg-neutral-950 flex flex-col text-white relative">
      {activeUser ? (
        /* ================= ACTIVE CHAT SCREEN ================= */
        <div className="absolute inset-0 z-40 bg-neutral-950 flex flex-col h-full animate-fade-in">
          {/* Chat Header */}
          <div className="p-4 border-b border-neutral-900 bg-neutral-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActiveUser(null)}
                className="p-1.5 rounded-full hover:bg-neutral-900 transition text-neutral-400 hover:text-white active:scale-95 shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              
              <div
                onClick={() => onCreatorClick(activeUser.username)}
                className="flex items-center gap-2 cursor-pointer group min-w-0"
              >
                <img
                  src={activeUser.avatar}
                  alt={activeUser.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-neutral-800 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white leading-none group-hover:text-indigo-400 transition flex items-center gap-1 truncate">
                    {activeUser.displayName}
                    {activeUser.isVerified && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1 py-0.2 rounded-md scale-90 shrink-0">✓</span>}
                  </h3>
                  <span className="text-[9px] text-neutral-500 font-mono truncate block">@{activeUser.username}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Voice and Video Calling triggers */}
              <button
                onClick={() => initiateCall('audio')}
                className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-indigo-400 hover:text-indigo-300 transition active:scale-95 border border-neutral-850"
                title="Voice Call"
                id="voice-call-btn"
              >
                <Phone size={12} className="stroke-[2.5px]" />
              </button>
              <button
                onClick={() => initiateCall('video')}
                className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-indigo-400 hover:text-indigo-300 transition active:scale-95 border border-neutral-850"
                title="Video Call"
                id="video-call-btn"
              >
                <VideoIcon size={12} className="stroke-[2.5px]" />
              </button>

              <div className="hidden xs:flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[7.5px] text-emerald-400 font-bold uppercase tracking-wider">Online</span>
              </div>
            </div>
          </div>

          {/* Messages Thread Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-950/20">
            {/* Conversation Starter Header */}
            <div className="py-6 flex flex-col items-center text-center space-y-2 border-b border-neutral-900/40 mb-2">
              <img
                src={activeUser.avatar}
                alt={activeUser.displayName}
                className="w-12 h-12 rounded-full object-cover border border-neutral-800 shadow-xl"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="text-xs font-bold">{activeUser.displayName}</h4>
                <p className="text-[10px] text-neutral-500 font-mono">@{activeUser.username}</p>
              </div>
              <p className="text-[10px] text-neutral-400 max-w-[200px] leading-relaxed italic">
                "{activeUser.bio}"
              </p>
              <div className="text-[8px] font-mono text-neutral-600 bg-neutral-900/60 px-2 py-1 rounded-md">
                End-to-end simulated messaging channel
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-8 text-neutral-600 space-y-1">
                <Sparkles size={16} className="mx-auto text-neutral-700 animate-pulse" />
                <p className="text-xs font-semibold">Start of safe messaging history</p>
                <p className="text-[9px]">Say hello or suggest a collaboration!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[75%] ${isMe ? 'self-end ml-auto items-end' : 'self-start mr-auto items-start'}`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                        isMe
                          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-tr-none'
                          : 'bg-neutral-900/80 text-neutral-200 border border-neutral-800/60 rounded-tl-none'
                      }`}
                    >
                      {/* Text content */}
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                      {/* Shared Reel Card Preview */}
                      {msg.sharedVideoId && (() => {
                        const sharedVid = videos.find(v => v.id === msg.sharedVideoId);
                        if (!sharedVid) return <span className="text-[10px] text-neutral-500 italic block">Deleted Reel</span>;
                        return (
                          <div
                            onClick={() => onVideoClick(sharedVid.id)}
                            className="mt-2 bg-black/40 border border-white/10 hover:border-white/25 rounded-xl overflow-hidden p-1.5 transition cursor-pointer flex gap-2 w-52 text-left group/reel"
                          >
                            <div className="w-12 h-18 bg-neutral-900 rounded-lg overflow-hidden shrink-0 border border-neutral-800/80 relative">
                              <video src={sharedVid.url} className="w-full h-full object-cover pointer-events-none" muted playsInline />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Film size={12} className="text-indigo-400 group-hover/reel:scale-110 transition" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                              <div>
                                <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider block">Shared Reel</span>
                                <p className="text-[9px] text-neutral-300 font-medium line-clamp-2 mt-0.5 italic leading-snug">
                                  "{sharedVid.description}"
                                </p>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <img
                                  src={sharedVid.creator.avatar}
                                  className="w-3 h-3 rounded-full object-cover border border-white/20"
                                  alt=""
                                />
                                <span className="text-[8px] text-neutral-400 truncate font-mono">
                                  @{sharedVid.creator.username}
                                </span>
                                <ArrowUpRight size={8} className="text-indigo-400 ml-auto" />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Metadata & Status indicators */}
                    <div className="flex items-center gap-1 mt-1 text-[8px] text-neutral-500 font-mono">
                      <span>{msg.timestamp}</span>
                      {isMe && (
                        <span>
                          {msg.isRead ? (
                            <CheckCheck size={10} className="text-indigo-400" />
                          ) : (
                            <Check size={10} className="text-neutral-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Footer Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-neutral-950 border-t border-neutral-900 flex gap-2 items-center shrink-0"
          >
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message @${activeUser.username}...`}
              className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-neutral-700 outline-none text-xs text-white py-2 px-3 rounded-full placeholder:text-neutral-600 transition"
            />
            <button
              type="submit"
              disabled={!messageInput.trim()}
              className={`p-2 rounded-full transition shrink-0 active:scale-95 flex items-center justify-center ${
                messageInput.trim()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
              }`}
            >
              <Send size={12} />
            </button>
          </form>

          {/* ================= SIMULATED CALLING OVERLAY ================= */}
          {currentCall && (
            <div className="absolute inset-0 z-50 bg-neutral-950 flex flex-col justify-between p-6 animate-fade-in font-sans select-none overflow-hidden">
              
              {/* Blurred Ambient Gradient Avatar Background */}
              <div className="absolute inset-0 z-0">
                <img
                  src={activeUser.avatar}
                  alt=""
                  className="w-full h-full object-cover blur-3xl opacity-25 scale-125"
                />
                <div className="absolute inset-0 bg-neutral-950/85" />
              </div>

              {/* Dynamic Video Stream Background for Active Video Calls */}
              {currentCall.type === 'video' && currentCall.state === 'connected' && (
                <div className="absolute inset-0 z-0 bg-neutral-950">
                  {(() => {
                    const creatorVideo = videos.find(v => v.creator.id === activeUser.id);
                    return creatorVideo ? (
                      <video
                        src={creatorVideo.url}
                        className="w-full h-full object-cover opacity-90"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-900/40 flex flex-col items-center justify-center">
                        <VideoIcon size={40} className="text-neutral-700 animate-pulse" />
                        <span className="text-[10px] text-neutral-500 mt-2">Connecting remote camera stream...</span>
                      </div>
                    );
                  })()}
                  {/* Subtle dark gradient overlays for typography readability */}
                  <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />
                </div>
              )}

              {/* Picture-in-Picture Thumbnail for Local Camera Feed (Video Call Connected Only) */}
              {currentCall.type === 'video' && currentCall.state === 'connected' && (
                <div className="absolute top-24 right-5 w-24 aspect-[3/4] bg-neutral-900/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-35 animate-scale-up">
                  {currentCall.cameraOff ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 text-neutral-600 gap-1 p-2 text-center">
                      <CameraOff size={14} className="text-neutral-500" />
                      <span className="text-[7px] font-medium leading-none uppercase tracking-wide">Camera Off</span>
                    </div>
                  ) : userMediaStream ? (
                    <video
                      ref={localVideoRef}
                      className="w-full h-full object-cover scale-x-[-1]"
                      autoPlay
                      playsInline
                      muted
                    />
                  ) : (
                    /* Fallback self avatar preview */
                    <div className="w-full h-full bg-indigo-950/30 flex flex-col items-center justify-center relative p-2 gap-1.5 text-center">
                      <img
                        src={currentUser?.avatar}
                        alt="You"
                        className="w-9 h-9 rounded-full object-cover border border-white/10 animate-pulse"
                      />
                      <span className="text-[7px] text-indigo-300 font-semibold tracking-wide uppercase font-mono">Front Feed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Call Header */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-5 mt-14">
                {/* Concentric waves in ringing status */}
                <div className="relative flex items-center justify-center">
                  {currentCall.state === 'ringing' && (
                    <>
                      <div className="absolute w-32 h-32 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-ping duration-1000" />
                      <div className="absolute w-44 h-44 rounded-full bg-indigo-500/5 border border-indigo-500/10 animate-ping duration-1500" />
                    </>
                  )}
                  {/* Hide or scale down avatar if video is active to avoid cluttering screen */}
                  {!(currentCall.type === 'video' && currentCall.state === 'connected') && (
                    <div className="relative w-26 h-26 rounded-full p-[2.5px] bg-gradient-to-tr from-indigo-500 via-pink-500 to-indigo-400 shadow-2xl">
                      <img
                        src={activeUser.avatar}
                        alt={activeUser.displayName}
                        className="w-full h-full rounded-full object-cover border-4 border-neutral-950"
                      />
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-extrabold text-white tracking-tight drop-shadow-md">
                    {activeUser.displayName}
                  </h3>
                  <p className="text-[9px] text-neutral-300 font-bold font-mono tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
                    {currentCall.state === 'ringing'
                      ? 'Ringing...'
                      : currentCall.state === 'connected'
                      ? `${currentCall.type === 'video' ? '📹 Video Call' : '📞 Voice Call'} • ${formatDuration(callDuration)}`
                      : 'Call Ended'}
                  </p>
                </div>
              </div>

              {/* Center Element: Audio Voice Sound Wave (Audio Call Connected Only) */}
              {currentCall.type === 'audio' && currentCall.state === 'connected' && (
                <div className="relative z-10 flex flex-col items-center justify-center gap-4 py-8">
                  <div className="flex items-center justify-center gap-1 h-12">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((val, idx) => (
                      <div
                        key={idx}
                        className="w-1 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-full animate-pulse"
                        style={{
                          height: `${14 + Math.sin(idx + callDuration * 1.5) * 16}px`,
                          animationDelay: `${idx * 80}ms`,
                          animationDuration: '0.8s'
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-neutral-500 font-semibold tracking-wider uppercase">Voice Activity Active</span>
                </div>
              )}

              {/* Bottom Area: Calling controls panel */}
              <div className="relative z-10 w-full flex flex-col items-center gap-6 mb-8">
                <div className="flex items-center gap-5 justify-center">
                  {currentCall.state === 'connected' && (
                    <>
                      {/* Mute toggle button */}
                      <button
                        type="button"
                        onClick={() => setCurrentCall(prev => prev ? { ...prev, muted: !prev.muted } : null)}
                        className={`p-3.5 rounded-full border transition active:scale-90 flex items-center justify-center ${
                          currentCall.muted
                            ? 'bg-red-600/30 border-red-500/40 text-red-400 hover:bg-red-600/40'
                            : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                        }`}
                        title={currentCall.muted ? 'Unmute Mic' : 'Mute Mic'}
                      >
                        {currentCall.muted ? <MicOff size={15} /> : <Mic size={15} />}
                      </button>

                      {/* Video Call: Camera toggle. Audio Call: Speaker toggler */}
                      {currentCall.type === 'video' ? (
                        <button
                          type="button"
                          onClick={() => setCurrentCall(prev => prev ? { ...prev, cameraOff: !prev.cameraOff } : null)}
                          className={`p-3.5 rounded-full border transition active:scale-90 flex items-center justify-center ${
                            currentCall.cameraOff
                              ? 'bg-red-600/30 border-red-500/40 text-red-400 hover:bg-red-600/40'
                              : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                          }`}
                          title={currentCall.cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                        >
                          {currentCall.cameraOff ? <CameraOff size={15} /> : <Camera size={15} />}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCurrentCall(prev => prev ? { ...prev, speaker: !prev.speaker } : null)}
                          className={`p-3.5 rounded-full border transition active:scale-90 flex items-center justify-center ${
                            currentCall.speaker
                              ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30'
                              : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                          }`}
                          title={currentCall.speaker ? 'Speaker Off' : 'Speaker On'}
                        >
                          {currentCall.speaker ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        </button>
                      )}
                    </>
                  )}

                  {/* End Call button */}
                  <button
                    type="button"
                    onClick={endCall}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition active:scale-90 flex items-center justify-center shadow-lg shadow-red-600/30"
                    title="End Call"
                    id="end-call-btn"
                  >
                    <PhoneOff size={18} />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      ) : (
        /* ================= CONVERSATIONS LIST SCREEN ================= */
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-neutral-900 bg-neutral-950 flex flex-col gap-3 shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold tracking-wider flex items-center gap-1.5">
                <MessageCircle size={16} className="text-indigo-500" />
                Direct Messages
              </h2>
              <span className="text-[9px] text-neutral-500 font-mono font-bold bg-neutral-900 px-2 py-0.5 rounded-full">
                {conversations.filter(c => c.unreadCount > 0).length} Unread
              </span>
            </div>

            {/* Custom Search bar to start new conversations */}
            <div className="relative">
              <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators to chat..."
                className="w-full bg-neutral-900 border border-neutral-900 hover:border-neutral-800/80 focus:border-neutral-800 outline-none text-[11px] text-white py-1.5 pl-8 pr-8 rounded-xl placeholder:text-neutral-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Conversations Thread Lists */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {searchQuery ? (
              /* Search Results */
              filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-neutral-600 space-y-1">
                  <User size={18} className="mx-auto text-neutral-700" />
                  <p className="text-xs">No matching creators found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block px-1.5 mb-1">
                    Start Chatting With
                  </span>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="flex items-center gap-3 p-2.5 bg-neutral-900/20 hover:bg-neutral-900/80 border border-transparent hover:border-neutral-900 rounded-xl transition cursor-pointer"
                    >
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-neutral-850"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold truncate text-neutral-200">
                          {user.displayName}
                        </h4>
                        <p className="text-[10px] text-neutral-500 font-mono truncate">
                          @{user.username}
                        </p>
                      </div>
                      <div className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 py-1 px-2 rounded-lg shrink-0">
                        Chat Now
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Conversation histories default */
              conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-16">
                  <MessageCircle size={24} className="text-neutral-700 mb-2" />
                  <p className="text-xs">No active direct message threads</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Use search above to chat with creators</p>
                </div>
              ) : (
                conversations.map((convo) => {
                  const otherUser = convo.participants.find(p => p.id !== currentUser?.id) || convo.participants[0];
                  const hasUnread = convo.unreadCount > 0;
                  
                  return (
                    <div
                      key={convo.id}
                      onClick={() => handleSelectUser(otherUser)}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl border transition cursor-pointer relative group ${
                        hasUnread
                          ? 'bg-indigo-600/5 border-indigo-500/20 hover:bg-indigo-600/10 hover:border-indigo-500/30'
                          : 'bg-neutral-900/30 border-neutral-900/50 hover:bg-neutral-900/80 hover:border-neutral-800'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={otherUser.avatar}
                          alt={otherUser.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-800/80"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
                      </div>

                      {/* Snippet details */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xs font-bold text-neutral-200 truncate pr-2 group-hover:text-white transition">
                            {otherUser.displayName}
                          </h4>
                          <span className="text-[8px] text-neutral-500 font-mono shrink-0">
                            {convo.lastMessage?.timestamp || 'Active'}
                          </span>
                        </div>
                        
                        <p className={`text-[10px] truncate ${hasUnread ? 'text-indigo-300 font-semibold' : 'text-neutral-500'}`}>
                          {convo.lastMessage ? (
                            convo.lastMessage.sharedVideoId ? (
                              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                                <Film size={10} /> Shared a video post
                              </span>
                            ) : (
                              convo.lastMessage.text
                            )
                          ) : (
                            <span className="italic text-neutral-600">No messages yet</span>
                          )}
                        </p>
                      </div>

                      {/* Unread dot or active status badge */}
                      {hasUnread && (
                        <div className="flex flex-col items-center justify-center shrink-0 ml-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50" />
                          <span className="text-[8px] text-indigo-400 font-mono font-bold mt-1">
                            {convo.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

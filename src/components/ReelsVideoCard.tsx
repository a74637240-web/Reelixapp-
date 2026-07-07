import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Send, Bookmark, Music, Volume2, VolumeX, Play, Pause, Check, Gift, Sparkles } from 'lucide-react';
import { Video } from '../types';
import { toggleLikeVideo, toggleSaveVideo, toggleFollowUser } from '../storageService';
import GiftSheet from './GiftSheet';

interface ReelsVideoCardProps {
  video: Video;
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  onCommentsClick: (videoId: string) => void;
  onShareClick: (video: Video) => void;
  onCreatorClick: (creatorUsername: string) => void;
}

export default function ReelsVideoCard({
  video,
  isActive,
  isMuted,
  onMuteToggle,
  onCommentsClick,
  onShareClick,
  onCreatorClick,
}: ReelsVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video>(video);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMuteOverlay, setShowMuteOverlay] = useState(false);
  const [showPlayStateOverlay, setShowPlayStateOverlay] = useState<false | 'play' | 'pause'>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<number>(0);
  
  // Floating double-tap heart animations list
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<number>(0);

  // Gifting system states and triggers
  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false);
  const [flyingGifts, setFlyingGifts] = useState<{ id: string; emoji: string; delay: number; x: number }[]>([]);

  const triggerGiftFX = (giftType: string) => {
    const emojis: Record<string, string> = {
      rose: '🌹',
      trophy: '🏆',
      diamond: '💎',
      crown: '👑',
    };
    const emoji = emojis[giftType] || '🎁';
    const newFlying: { id: string; emoji: string; delay: number; x: number }[] = [];
    
    for (let i = 0; i < 12; i++) {
      newFlying.push({
        id: `gift_${Date.now()}_${i}_${Math.random()}`,
        emoji,
        delay: Math.random() * 0.8,
        x: 10 + Math.random() * 80,
      });
    }
    setFlyingGifts(prev => [...prev, ...newFlying]);

    setTimeout(() => {
      setFlyingGifts(prev => prev.filter(f => !newFlying.find(nf => nf.id === f.id)));
    }, 3500);
  };

  // Sync state with outside props if necessary (e.g. video updates elsewhere)
  useEffect(() => {
    setCurrentVideo(video);
  }, [video]);

  // Handle active playback
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoError) {
      if (isActive) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
      return;
    }
    if (!videoEl) return;

    if (isActive) {
      // Start from beginning or resume
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("Video playback was interrupted:", err);
            setIsPlaying(false);
          });
      }
    } else {
      videoEl.pause();
      videoEl.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, videoError]);

  const handleVideoPress = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // It's a double tap!
      handleDoubleTap(e);
    } else {
      // Single tap - toggle mute/unmute
      // Wait, standard Instagram is tap once to mute/unmute, and tap is perfect.
      // Let's toggle play/pause or mute/unmute. Usually tap to mute/unmute is preferred,
      // and a nice indicator appears.
      handleSingleTap();
    }
    lastTapRef.current = now;
  };

  const handleSingleTap = () => {
    onMuteToggle();
    setShowMuteOverlay(true);
    const timer = setTimeout(() => setShowMuteOverlay(false), 850);
    return () => clearTimeout(timer);
  };

  const togglePlayback = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger the volume tap
    const videoEl = videoRef.current;
    if (videoError) {
      setIsPlaying(!isPlaying);
      setShowPlayStateOverlay(isPlaying ? 'pause' : 'play');
      setTimeout(() => setShowPlayStateOverlay(false), 700);
      return;
    }
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
      setIsPlaying(false);
      setShowPlayStateOverlay('pause');
    } else {
      videoEl.play();
      setIsPlaying(true);
      setShowPlayStateOverlay('play');
    }
    setTimeout(() => setShowPlayStateOverlay(false), 700);
  };

  const handleDoubleTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Get bounds to position the floating heart relative to click
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newHeart = {
      id: Date.now(),
      x,
      y,
    };
    setHearts(prev => [...prev, newHeart]);

    // Perform the like action if not liked yet
    if (!currentVideo.isLiked) {
      const updated = await toggleLikeVideo(currentVideo.id);
      if (updated) {
        setCurrentVideo({ ...updated });
      }
    }
  };

  const handleHeartAnimationComplete = (id: number) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await toggleLikeVideo(currentVideo.id);
    if (updated) {
      setCurrentVideo({ ...updated });
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await toggleSaveVideo(currentVideo.id);
    if (updated) {
      setCurrentVideo({ ...updated });
    }
  };

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCreator = await toggleFollowUser(currentVideo.creator.id);
    if (updatedCreator) {
      setCurrentVideo(prev => ({
        ...prev,
        creator: updatedCreator,
      }));
    }
  };

  // Human readable count conversion
  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  return (
    <div
      onClick={handleVideoPress}
      className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden cursor-pointer"
    >
      {/* HTML5 Video element / Ambient Visualizer Fallback View */}
      {videoError ? (
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center overflow-hidden z-0">
          {/* Blurred Creator Avatar background */}
          <div 
            className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-30 scale-150 transition-all duration-1000"
            style={{ backgroundImage: `url(${currentVideo.creator.avatar})` }}
          />
          
          {/* Neon Gradient Layer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 via-purple-950/20 to-neutral-950/80 pointer-events-none" />
          
          {/* Pulsing visualizer circle */}
          <div className="relative flex items-center justify-center w-40 h-40">
            {/* Pulsing ring 1 */}
            <motion.div 
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-full h-full rounded-full border border-indigo-500/40"
            />
            {/* Pulsing ring 2 */}
            <motion.div 
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute w-5/6 h-5/6 rounded-full border border-pink-500/30"
            />
            {/* Pulsing ring 3 */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute w-2/3 h-2/3 rounded-full border border-purple-500/40 bg-purple-500/5"
            />
            
            {/* Creator Avatar center with active spin/pulse */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 flex items-center justify-center bg-neutral-900">
              <img 
                src={currentVideo.creator.avatar} 
                alt="" 
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Glowing neon music notes floating up */}
            <AnimatePresence>
              {isPlaying && [1, 2, 3].map((n) => (
                <motion.span
                  key={n}
                  initial={{ y: 20, x: (n - 2) * 15, opacity: 0, scale: 0.8 }}
                  animate={{ y: -70, x: (n - 2) * 25 + Math.sin(n) * 15, opacity: [0, 1, 0], scale: 1.2 }}
                  transition={{ duration: 3, repeat: Infinity, delay: n * 0.8, ease: "easeOut" }}
                  className="absolute text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                >
                  🎵
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Fallback label */}
          <div className="mt-6 text-center px-6 z-10 space-y-1.5 max-w-[280px]">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 inline-block animate-pulse">
              Ambient Audio Mode
            </span>
            <p className="text-xs text-neutral-300 font-medium">
              Playing soundtrack only due to browser video codec limits
            </p>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={currentVideo.url}
          loop
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover select-none"
          referrerPolicy="no-referrer"
          onError={(e) => {
            console.warn("Video failed to load, swapping to high-availability fallback:", currentVideo.url);
            const fallbackUrls = [
              'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K_30fps_300mb.mp4/Big_Buck_Bunny_4K_30fps_300mb.mp4.360p.vp9.webm',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
            ];
            
            if (errorCount < fallbackUrls.length) {
              const nextFallback = fallbackUrls[errorCount];
              setErrorCount(prev => prev + 1);
              setCurrentVideo(prev => ({
                ...prev,
                url: nextFallback
              }));
            } else {
              setVideoError(true);
            }
          }}
        />
      )}

      {/* Floating neon hearts from double-taps */}
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1], y: heart.y - 120 }}
            exit={{ scale: 0.5, opacity: 0, y: heart.y - 200 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onAnimationComplete={() => handleHeartAnimationComplete(heart.id)}
            style={{
              position: 'absolute',
              left: heart.x - 35,
              top: heart.y - 35,
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            <Heart size={70} className="fill-rose-500 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Quick single-tap mute overlay */}
      <AnimatePresence>
        {showMuteOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute bg-black/60 p-4 rounded-full z-20 pointer-events-none"
          >
            {isMuted ? (
              <VolumeX size={26} className="text-white" />
            ) : (
              <Volume2 size={26} className="text-white" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause state overlay */}
      <AnimatePresence>
        {showPlayStateOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute bg-black/60 p-4 rounded-full z-20 pointer-events-none"
          >
            {showPlayStateOverlay === 'play' ? (
              <Play size={26} className="text-white fill-white" />
            ) : (
              <Pause size={26} className="text-white fill-white" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom shadow overlay for subtitle readability */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-10" />

      {/* Left-aligned metadata (username, caption, music) */}
      <div className="absolute left-3 bottom-4 right-14 z-20 flex flex-col gap-2.5 text-white pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Avatar Click triggers profile view */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onCreatorClick(currentVideo.creator.username);
            }}
            className="relative shrink-0"
          >
            <img
              src={currentVideo.creator.avatar}
              alt={currentVideo.creator.displayName}
              className="w-9 h-9 rounded-full object-cover border-1.5 border-white shadow-md active:scale-95 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatorClick(currentVideo.creator.username);
                }}
                className="font-semibold text-xs text-white hover:underline truncate max-w-[120px]"
              >
                {currentVideo.creator.username}
              </span>
              {currentVideo.creator.isVerified && (
                <span className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-[7px] text-white shrink-0">
                  ✓
                </span>
              )}
              
              {/* Follow Button */}
              {currentVideo.creator.id !== 'current_user_1' && (
                <button
                  onClick={handleFollowClick}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                    currentVideo.creator.isFollowing
                      ? 'border-neutral-500 text-neutral-300 hover:bg-neutral-800'
                      : 'border-white bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {currentVideo.creator.isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            <span className="text-[9px] text-neutral-400 font-mono">{currentVideo.timestamp}</span>
          </div>
        </div>

        {/* Video Description */}
        <p className="text-xs text-neutral-150 leading-relaxed max-h-16 overflow-y-auto pr-2 scrollbar-none">
          {currentVideo.description}
        </p>

        {/* Tags */}
        {currentVideo.tags && currentVideo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[10px] text-indigo-300 font-medium">
            {currentVideo.tags.map(tag => (
              <span key={tag} className="hover:underline">#{tag}</span>
            ))}
          </div>
        )}

        {/* Rotating Music Disc & Track Details */}
        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full self-start max-w-[180px]">
          <Music size={11} className="text-neutral-300 animate-pulse shrink-0" />
          <span className="text-[10px] text-neutral-200 truncate font-mono">
            {currentVideo.musicArtist} • {currentVideo.musicName}
          </span>
        </div>
      </div>

      {/* Right-aligned floating sidebar (actions) */}
      <div className="absolute right-2 bottom-6 z-20 flex flex-col gap-4 items-center text-white pointer-events-auto">
        
        {/* Play/Pause control state button */}
        <button
          onClick={togglePlayback}
          className="w-10 h-10 rounded-full bg-neutral-900/60 backdrop-blur-sm border border-neutral-800 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-neutral-800"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
        </button>

        {/* Like action */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLikeClick}
            className={`w-11 h-11 rounded-full bg-neutral-950/45 backdrop-blur-sm flex items-center justify-center transition hover:scale-105 active:scale-90 ${
              currentVideo.isLiked ? 'text-rose-500' : 'text-white'
            }`}
          >
            <Heart
              size={22}
              className={currentVideo.isLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-white'}
            />
          </button>
          <span className="text-[10px] font-semibold text-neutral-200 mt-1 shadow-sm">
            {formatCount(currentVideo.likesCount)}
          </span>
        </div>

        {/* Comments action */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentsClick(currentVideo.id);
            }}
            className="w-11 h-11 rounded-full bg-neutral-950/45 backdrop-blur-sm flex items-center justify-center text-white transition hover:scale-105 active:scale-90"
          >
            <MessageCircle size={22} />
          </button>
          <span className="text-[10px] font-semibold text-neutral-200 mt-1">
            {formatCount(currentVideo.commentsCount)}
          </span>
        </div>

        {/* Share action */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShareClick(currentVideo);
            }}
            className="w-11 h-11 rounded-full bg-neutral-950/45 backdrop-blur-sm flex items-center justify-center text-white transition hover:scale-105 active:scale-90"
          >
            <Send size={20} />
          </button>
          <span className="text-[10px] font-semibold text-neutral-200 mt-1">
            {formatCount(currentVideo.sharesCount)}
          </span>
        </div>

        {/* Bookmark/Save action */}
        <button
          onClick={handleSaveClick}
          className={`w-11 h-11 rounded-full bg-neutral-950/45 backdrop-blur-sm flex items-center justify-center transition hover:scale-105 active:scale-90 ${
            currentVideo.isSaved ? 'text-amber-400' : 'text-white'
          }`}
        >
          <Bookmark size={20} className={currentVideo.isSaved ? 'fill-amber-400 stroke-amber-400' : 'stroke-white'} />
        </button>

        {/* Gift Sending action */}
        {currentVideo.creator.id !== 'current_user_1' && (
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsGiftSheetOpen(true);
              }}
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-500/80 via-rose-500/85 to-amber-500/85 backdrop-blur-sm flex items-center justify-center text-white transition hover:scale-110 active:scale-90 border border-pink-400/30 shadow-lg shadow-pink-500/10"
            >
              <Gift size={20} className="animate-pulse" />
            </button>
            <span className="text-[9px] font-bold text-neutral-200 mt-1 uppercase tracking-wider scale-90 leading-none">
              Gift
            </span>
          </div>
        )}

        {/* Rotating vinyl disk representing music playing */}
        <div className="w-9 h-9 rounded-full bg-neutral-800 border-2 border-neutral-700 overflow-hidden flex items-center justify-center relative mt-2 shrink-0">
          <div
            className={`w-full h-full rounded-full flex items-center justify-center bg-cover bg-center ${
              isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
            }`}
            style={{ backgroundImage: `url(${currentVideo.creator.avatar})` }}
          />
          <div className="absolute w-2 h-2 rounded-full bg-neutral-950 border border-neutral-700" />
        </div>
      </div>

      {/* Flying Gift Particles FX */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {flyingGifts.map((gift) => (
            <motion.div
              key={gift.id}
              initial={{ y: '100%', opacity: 0, scale: 0.5 }}
              animate={{ 
                y: '-20%', 
                opacity: [0, 1, 1, 0], 
                scale: [0.5, 1.5, 1],
                x: [`${gift.x}%`, `${gift.x + (Math.random() * 20 - 10)}%`] 
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2.2, 
                delay: gift.delay,
                ease: 'easeOut'
              }}
              className="absolute text-3xl filter drop-shadow-[0_4px_10px_rgba(244,63,94,0.5)] select-none"
            >
              {gift.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Gift Sheet Drawer Overlay */}
      <GiftSheet
        creatorId={currentVideo.creator.id}
        creatorUsername={currentVideo.creator.username}
        isOpen={isGiftSheetOpen}
        onClose={() => setIsGiftSheetOpen(false)}
        onGiftSent={triggerGiftFX}
      />
    </div>
  );
}

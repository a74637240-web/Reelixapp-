import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Play, Pause, ExternalLink, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface ReelsAdCardProps {
  ad: {
    id: string;
    adVideoUrl: string;
    title: string;
    desc: string;
    link: string;
    cta: string;
  };
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
}

export default function ReelsAdCard({
  ad,
  isActive,
  isMuted,
  onMuteToggle,
}: ReelsAdCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMuteOverlay, setShowMuteOverlay] = useState(false);
  const [adVideoError, setAdVideoError] = useState(false);
  
  // Skip ad countdown state
  const [skipSeconds, setSkipSeconds] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [adDismissed, setAdDismissed] = useState(false);

  // Synchronize playback with active tab and viewport visibility
  useEffect(() => {
    const videoEl = videoRef.current;
    if (adVideoError) {
      setIsPlaying(isActive && !adDismissed);
      return;
    }
    if (!videoEl) return;

    if (isActive && !adDismissed) {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Ad video playback was interrupted:", err);
            setIsPlaying(false);
          });
      }
    } else {
      videoEl.pause();
      videoEl.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, adDismissed, adVideoError]);

  // Handle countdown timer for skip
  useEffect(() => {
    if (!isActive || adDismissed) return;
    
    setSkipSeconds(5);
    setCanSkip(false);

    const timer = setInterval(() => {
      setSkipSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, adDismissed, ad.id]);

  const handleVideoPress = () => {
    onMuteToggle();
    setShowMuteOverlay(true);
    const timer = setTimeout(() => setShowMuteOverlay(false), 850);
    return () => clearTimeout(timer);
  };

  if (adDismissed) {
    return (
      <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center text-white p-6">
        <ShieldCheck size={48} className="text-indigo-400 mb-2 animate-bounce" />
        <h3 className="text-sm font-bold">Advertisement Dismissed</h3>
        <p className="text-[10px] text-neutral-400 mt-1 max-w-[200px] text-center leading-normal">
          You skipped this ad. Scroll up or down to continue watching reels.
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={handleVideoPress}
      className="w-full h-full relative bg-neutral-950 flex items-center justify-center overflow-hidden cursor-pointer"
    >
      {/* HTML5 Ad Video Element / Promo Graphic Fallback */}
      {adVideoError ? (
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center overflow-hidden z-0">
          {/* Blurred Indigo/Pink background block */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-neutral-950 to-purple-900/20" />
          
          {/* Decorative glowing background mesh */}
          <div className="absolute w-[280px] h-[280px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />

          {/* Centered Premium Promo Badge */}
          <div className="relative flex flex-col items-center justify-center p-6 text-center z-10 space-y-4 max-w-[280px]">
            {/* Pulsing brand circle */}
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/10 flex items-center justify-center">
              <span className="text-3xl font-black text-white select-none">
                {ad.title.charAt(0)}
              </span>
              
              {/* Dynamic rotating outer border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400/25 animate-[spin_10s_linear_infinite]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white tracking-tight">{ad.title.split(' - ')[0]}</h4>
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Premium Sponsor</p>
            </div>
            
            {/* Visualizer bars */}
            <div className="flex items-center gap-1.5 h-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: isPlaying ? [6, 20, 6] : 6 }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1 rounded-full bg-gradient-to-t from-indigo-500 to-pink-500"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={ad.adVideoUrl}
          loop
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover select-none brightness-[0.85]"
          referrerPolicy="no-referrer"
          onError={() => setAdVideoError(true)}
        />
      )}

      {/* Floating Skip Button in Top-Right Corner */}
      <div className="absolute top-16 right-4 z-30 pointer-events-auto">
        {canSkip ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAdDismissed(true);
            }}
            className="bg-black/80 hover:bg-black text-white font-semibold text-[10px] py-1.5 px-3.5 rounded-full border border-neutral-700/50 backdrop-blur-md active:scale-95 transition-all"
          >
            Skip Advertisement ➜
          </button>
        ) : (
          <div className="bg-black/85 text-neutral-300 font-mono text-[9px] py-1.5 px-3.5 rounded-full border border-neutral-800 backdrop-blur-md">
            Skip in {skipSeconds}s
          </div>
        )}
      </div>

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

      {/* Gradient shade overlays */}
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

      {/* Advertiser Credentials & Description */}
      <div className="absolute left-3 bottom-4 right-3 z-20 flex flex-col gap-3 text-white pointer-events-auto">
        
        {/* Advertiser Header */}
        <div className="flex items-center gap-2">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 border border-indigo-400/40 shadow-lg flex items-center justify-center font-black text-sm text-white shrink-0">
            {ad.title.charAt(0)}
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">
                {ad.title.split(' - ')[0]}
              </span>
              <span className="text-[7px] bg-amber-500 text-black font-extrabold px-1.5 py-0.2 rounded-sm tracking-wider uppercase font-sans">
                Ad
              </span>
            </div>
            
            <span className="text-[8px] text-neutral-400 flex items-center gap-1 mt-0.5 font-mono">
              <ShieldCheck size={9} className="text-green-400" /> Google AdMob Partner
            </span>
          </div>
        </div>

        {/* Ad Copy */}
        <p className="text-[11px] text-neutral-200 leading-relaxed font-normal bg-black/40 backdrop-blur-sm p-2.5 rounded-xl border border-neutral-800/40">
          {ad.desc}
        </p>

        {/* Floating pulse CTA Bar */}
        <a
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-600 font-bold text-xs py-3 px-4 rounded-xl text-white text-center flex items-center justify-center gap-1.5 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] border border-indigo-500/30 group mt-1"
        >
          <span>{ad.cta}</span>
          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

    </div>
  );
}

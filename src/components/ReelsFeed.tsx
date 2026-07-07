import React, { useState, useEffect, useRef } from 'react';
import { Video, FeedTab } from '../types';
import ReelsVideoCard from './ReelsVideoCard';
import ReelsAdCard from './ReelsAdCard';
import StoryTray from './StoryTray';
import { getVideos } from '../storageService';

interface ReelsFeedProps {
  activeAppTab: string;
  isMuted: boolean;
  onMuteToggle: () => void;
  onCommentsClick: (videoId: string) => void;
  onShareClick: (video: Video) => void;
  onCreatorClick: (creatorUsername: string) => void;
}

export default function ReelsFeed({
  activeAppTab,
  isMuted,
  onMuteToggle,
  onCommentsClick,
  onShareClick,
  onCreatorClick,
}: ReelsFeedProps) {
  const [feedTab, setFeedTab] = useState<FeedTab>('for-you');
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load videos when component mounts or tab becomes active
  useEffect(() => {
    if (activeAppTab === 'home') {
      const freshVideos = getVideos();
      setAllVideos((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(freshVideos)) {
          return prev;
        }
        return freshVideos;
      });
    }
  }, [activeAppTab, feedTab]);

  // Subscribe to real-time database updates
  useEffect(() => {
    const handleUpdate = () => {
      const freshVideos = getVideos();
      setAllVideos((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(freshVideos)) {
          return prev;
        }
        return freshVideos;
      });
    };
    window.addEventListener('reels-data-updated', handleUpdate);
    return () => window.removeEventListener('reels-data-updated', handleUpdate);
  }, []);

  // Filter videos based on tab selection (Memoized to prevent recreation on every render)
  const filteredVideos = React.useMemo(() => {
    return allVideos.filter((video) => {
      if (feedTab === 'following') {
        return video.creator.isFollowing === true;
      }
      return true; // For You shows everything
    });
  }, [allVideos, feedTab]);

  // Prepare items with AdMob interstitial video ads inserted every 4 videos
  const feedItems = React.useMemo(() => {
    const items: (Video | { isAd: true; id: string; adVideoUrl: string; title: string; desc: string; link: string; cta: string })[] = [];
    
    const adVideoUrls = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    ];
    
    const adCampaigns = [
      {
        title: 'Spotify Premium - Ad-Free Music',
        desc: 'AdMob Sponsor: Get offline playback, high-fidelity sound, and unlimited skips. Join millions of Premium subscribers now with 3 months free.',
        link: 'https://spotify.com',
        cta: 'Install Now',
      },
      {
        title: 'Clash of Clans - Play Free Now',
        desc: 'AdMob Sponsor: Build your fortress, assemble an unstoppable army of Barbarians, and compete in epic global Clan Wars. Join the action!',
        link: 'https://supercell.com',
        cta: 'Download Play',
      },
      {
        title: 'Figma - Collaborative Design Platform',
        desc: 'AdMob Sponsor: Design, mock up, prototype, and build production-ready frontends alongside teammates in real time. Create a free account.',
        link: 'https://figma.com',
        cta: 'Design Free',
      }
    ];

    filteredVideos.forEach((video, index) => {
      items.push(video);
      
      // Insert an ad after every 4th video
      if ((index + 1) % 4 === 0) {
        const adIdx = Math.floor(index / 4) % adCampaigns.length;
        const camp = adCampaigns[adIdx];
        items.push({
          isAd: true,
          id: `ad_${index}_${adIdx}`,
          adVideoUrl: adVideoUrls[adIdx % adVideoUrls.length],
          title: camp.title,
          desc: camp.desc,
          link: camp.link,
          cta: camp.cta,
        });
      }
    });

    return items;
  }, [filteredVideos]);

  // Track scroll position to update which video is currently active (Safeguarded)
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    
    if (clientHeight <= 0) return; // Prevent division by zero / NaN issues during initial render
    
    // Calculate index based on which card takes up the most space
    const index = Math.round(scrollTop / clientHeight);
    
    if (index !== activeVideoIndex && index >= 0 && index < feedItems.length) {
      setActiveVideoIndex(index);
    }
  };

  // Reset active index when feed tab changes
  useEffect(() => {
    setActiveVideoIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [feedTab]);

  // Pause playback when we navigate away from the Home tab
  const isTabActive = activeAppTab === 'home';

  return (
    <div className="w-full h-full relative flex flex-col bg-black">
      
      {/* Category Tabs: For You / Following (Transparent overlay) */}
      <div className="absolute top-0 inset-x-0 z-30 flex justify-center items-center gap-6 py-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <button
          onClick={() => setFeedTab('for-you')}
          className={`pointer-events-auto text-xs font-semibold tracking-wider transition-all duration-200 ${
            feedTab === 'for-you' 
              ? 'text-white scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' 
              : 'text-neutral-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
          }`}
        >
          For You
          {feedTab === 'for-you' && (
            <div className="w-5 h-0.5 bg-white rounded-full mx-auto mt-1" />
          )}
        </button>
        <button
          onClick={() => setFeedTab('following')}
          className={`pointer-events-auto text-xs font-semibold tracking-wider transition-all duration-200 ${
            feedTab === 'following' 
              ? 'text-white scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' 
              : 'text-neutral-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
          }`}
        >
          Following
          {feedTab === 'following' && (
            <div className="w-5 h-0.5 bg-white rounded-full mx-auto mt-1" />
          )}
        </button>
      </div>

      {/* Horizontal Story Tray overlay sitting underneath the Category Header */}
      <div className="absolute top-12 inset-x-0 z-20">
        <StoryTray onCreatorClick={onCreatorClick} />
      </div>

      {/* Vertical Scroll/Swipe Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-y-scroll scroll-snap-y-mandatory scrollbar-none select-none bg-neutral-950"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {feedItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <p className="font-semibold text-sm">No videos found</p>
            <p className="text-xs mt-1 text-neutral-500 max-w-[220px]">
              {feedTab === 'following' 
                ? "You aren't following anyone who posted yet. Go to 'For You' and hit follow on creators!"
                : "The feed is empty. Start by uploading a new video!"}
            </p>
            {feedTab === 'following' && (
              <button
                onClick={() => setFeedTab('for-you')}
                className="mt-4 bg-white text-black font-semibold text-xs py-2 px-4 rounded-full hover:bg-neutral-200 transition"
              >
                Explore For You
              </button>
            )}
          </div>
        ) : (
          feedItems.map((item, idx) => {
            const isAd = 'isAd' in item;
            return (
              <div
                key={item.id}
                className="w-full h-full scroll-snap-align-start shrink-0 relative"
                style={{ scrollSnapAlign: 'start' }}
              >
                {isAd ? (
                  <ReelsAdCard
                    ad={item as any}
                    isActive={isTabActive && idx === activeVideoIndex}
                    isMuted={isMuted}
                    onMuteToggle={onMuteToggle}
                  />
                ) : (
                  <ReelsVideoCard
                    video={item as Video}
                    isActive={isTabActive && idx === activeVideoIndex}
                    isMuted={isMuted}
                    onMuteToggle={onMuteToggle}
                    onCommentsClick={onCommentsClick}
                    onShareClick={onShareClick}
                    onCreatorClick={onCreatorClick}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

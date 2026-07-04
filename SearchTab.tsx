import React, { useState, useEffect } from 'react';
import { Search, Compass, Eye, TrendingUp, Sparkles, X, Layers, Flame } from 'lucide-react';
import { Video, User } from '../types';
import { getVideos, getUsers } from '../storageService';
import BannerAd from './BannerAd';

interface SearchTabProps {
  onCreatorClick: (username: string) => void;
  onVideoClick: (videoId: string) => void;
}

const CATEGORIES = [
  { id: 'all', name: 'All Discoveries', icon: '✨', tags: [], color: 'from-pink-500/10 to-indigo-500/10' },
  { id: 'neon', name: 'Neon & Cyberpunk', icon: '🌌', tags: ['cyberpunk', 'tokyonight', 'neonvibes', 'aesthetic', 'neonlight'], color: 'from-purple-500/10 to-fuchsia-500/10' },
  { id: 'skate', name: 'Skate & Streetwear', icon: '🛹', tags: ['skater', 'streetwear', 'skateparks', 'lifestyle'], color: 'from-amber-500/10 to-orange-500/10' },
  { id: 'dance', name: 'Dance & Movement', icon: '🕺', tags: ['dance', 'freestyle', 'streetdance'], color: 'from-emerald-500/10 to-teal-500/10' },
  { id: 'lofi', name: 'Lo-Fi & Synthesizers', icon: '🎛️', tags: ['synthesizer', 'ambientmusic', 'modular', 'lofivibes'], color: 'from-cyan-500/10 to-blue-500/10' },
  { id: 'wellness', name: 'Wellness & Fitness', icon: '🏃‍♀️', tags: ['running', 'sunset', 'wellness', 'cardio', 'health'], color: 'from-red-500/10 to-rose-500/10' },
];

export default function SearchTab({ onCreatorClick, onVideoClick }: SearchTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    setVideos(getVideos());
    setUsers(getUsers());
    
    // Extract unique tags for the trending panel
    const allTags = getVideos().reduce((acc: string[], curr) => {
      if (curr.tags) {
        curr.tags.forEach(t => {
          if (!acc.includes(t)) acc.push(t);
        });
      }
      return acc;
    }, []);
    setTrendingTags(allTags.slice(0, 6));
  }, []);

  // Filter content in real time
  const filteredVideos = videos.filter(
    (v) =>
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Discover feed filtered by chosen Category when not searching
  const exploreVideos = activeCategory === 'all'
    ? videos
    : videos.filter(video => {
        const cat = CATEGORIES.find(c => c.id === activeCategory);
        if (!cat) return true;
        return video.tags.some(t => cat.tags.includes(t.toLowerCase())) ||
               cat.tags.some(t => video.description.toLowerCase().includes(t.toLowerCase()));
      });

  return (
    <div className="w-full h-full bg-neutral-950 flex flex-col text-white">
      {/* Sticky Header with Search Input */}
      <div className="p-4 border-b border-neutral-900 bg-neutral-950 shrink-0">
        <div className="relative flex items-center bg-neutral-900 rounded-xl px-3 py-2.5">
          <Search size={16} className="text-neutral-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators, tags, or music..."
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-neutral-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* If searching - show list-based results */}
        {searchQuery ? (
          <div className="space-y-6">
            {/* Creators Results */}
            {filteredUsers.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Flame size={10} className="text-amber-500" /> Creators
                </h3>
                <div className="space-y-3 bg-neutral-900/40 p-3 rounded-2xl border border-neutral-900">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => onCreatorClick(user.username)}
                      className="flex items-center gap-3 cursor-pointer p-1 hover:bg-neutral-800/40 rounded-lg transition"
                    >
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover border border-neutral-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-white">@{user.username}</span>
                          {user.isVerified && (
                            <span className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-[7px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate">{user.displayName}</p>
                      </div>
                      <span className="text-[9px] text-neutral-500 shrink-0">
                        {user.followersCount >= 1000 
                          ? `${(user.followersCount / 1000).toFixed(1)}k followers` 
                          : `${user.followersCount} followers`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos/Tags Results */}
            <div>
              <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Compass size={10} className="text-indigo-400" /> Videos
              </h3>
              {filteredVideos.length === 0 ? (
                <p className="text-xs text-neutral-500">No matching videos or tags found.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => onVideoClick(video.id)}
                      className="aspect-[9/16] relative rounded-lg overflow-hidden bg-neutral-900 group cursor-pointer border border-neutral-900"
                    >
                      <video
                        src={video.url}
                        className="w-full h-full object-cover pointer-events-none"
                        muted
                        playsInline
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const fallbackUrls = [
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
                          ];
                          const target = e.currentTarget;
                          if (!fallbackUrls.includes(target.src)) {
                            target.src = fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)];
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-2">
                        <span className="text-[9px] text-white font-medium truncate">
                          @{video.creator.username}
                        </span>
                        <div className="flex items-center gap-1 text-[8px] text-rose-400 mt-0.5">
                          <Eye size={8} />
                          <span>{video.viewsCount} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Explore Page Default View */
          <>
            {/* Discover by Category Selection Slider */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-neutral-300">Discover by Category</h3>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {CATEGORIES.map((cat) => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`shrink-0 flex items-center gap-2 p-3 rounded-2xl border text-xs font-semibold w-36 transition-all duration-300 text-left relative overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600/20 to-pink-600/10 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                          : 'bg-neutral-900/50 border-neutral-800/80 hover:border-neutral-700 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="text-lg relative z-10">{cat.icon}</span>
                      <span className="truncate relative z-10 leading-none">{cat.name}</span>
                      
                      {/* Ambient background glow if selected */}
                      {isSelected && (
                        <span className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent blur-md pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trending Tags Row */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={13} className="text-pink-500 animate-bounce" />
                <h3 className="text-xs font-bold text-neutral-300">Trending Hashtags</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {trendingTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="bg-neutral-900/80 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 text-[10px] font-semibold py-1.5 px-3.5 rounded-full transition whitespace-nowrap active:scale-95"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Explore Bento Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Compass size={13} className="text-indigo-400" />
                  <h3 className="text-xs font-bold text-neutral-300">
                    {CATEGORIES.find(c => c.id === activeCategory)?.name || 'Explore Feed'}
                  </h3>
                </div>
                {activeCategory !== 'all' && (
                  <button 
                    onClick={() => setActiveCategory('all')} 
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {exploreVideos.length === 0 ? (
                <div className="text-center py-16 bg-neutral-900/20 border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-4">
                  <Sparkles size={18} className="text-neutral-600 mb-2" />
                  <p className="text-xs text-neutral-400 font-semibold">No category posts yet</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Check back later or upload your own!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Visual grid layout similar to Instagram Reels explore grid */}
                  {exploreVideos.map((video, idx) => {
                    const isDoubleHeight = idx === 1 || idx === 4; // creates a dynamic asymmetry
                    return (
                      <div
                        key={video.id}
                        onClick={() => onVideoClick(video.id)}
                        className={`relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-900 cursor-pointer transition hover:scale-[1.01] hover:shadow-xl ${
                          isDoubleHeight ? 'row-span-2 aspect-[9/16]' : 'aspect-[9/16]'
                        }`}
                      >
                        <video
                          src={video.url}
                          className="w-full h-full object-cover pointer-events-none"
                          muted
                          playsInline
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const fallbackUrls = [
                              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
                            ];
                            const target = e.currentTarget;
                            if (!fallbackUrls.includes(target.src)) {
                              target.src = fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)];
                            }
                          }}
                        />
                        {/* Grid overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                          <div className="flex items-center gap-1">
                            <img
                              src={video.creator.avatar}
                              className="w-3.5 h-3.5 rounded-full object-cover border border-white/60"
                              alt={video.creator.username}
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[8px] text-neutral-200 truncate font-semibold">
                              @{video.creator.username}
                            </span>
                          </div>
                          <p className="text-[8px] text-neutral-400 truncate mt-0.5">
                            {video.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {/* Google AdMob Banner Ad placement */}
      <BannerAd placement="search" />
    </div>
  );
}

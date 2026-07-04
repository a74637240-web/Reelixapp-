import React, { useState, useEffect } from 'react';
import { Grid, Bookmark, Edit2, LogOut, Check, Heart, Eye, ArrowLeft, BarChart3, Award, Activity, Share2, TrendingUp, Sparkles, X, Flame, MessageCircle, Calendar, Coins, Gift } from 'lucide-react';
import { User, Video } from '../types';
import { getCurrentUser, getVideos, updateProfile, toggleFollowUser, rechargeWallet } from '../storageService';
import BannerAd from './BannerAd';

interface ProfileTabProps {
  creatorUsername?: string | null; // If provided, shows another user's profile, else shows current logged-in user!
  onBackClick?: () => void;
  onVideoClick: (videoId: string) => void;
  onLogout: () => void;
  onMessageClick?: (creatorId: string) => void;
}

export default function ProfileTab({
  creatorUsername,
  onBackClick,
  onVideoClick,
  onLogout,
  onMessageClick,
}: ProfileTabProps) {
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'saved' | 'wallet'>('posts');
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  // Analytics Dashboard States
  const [isShowingAnalytics, setIsShowingAnalytics] = useState(false);
  const [analyticsSortBy, setAnalyticsSortBy] = useState<'views' | 'likes' | 'shares'>('views');

  const loadProfileData = () => {
    const allVideos = getVideos();
    
    if (creatorUsername) {
      // Find requested creator in videos
      const matchingVideo = allVideos.find(v => v.creator.username === creatorUsername);
      if (matchingVideo) {
        setUser(matchingVideo.creator);
        // Load videos posted by this creator
        setVideos(allVideos.filter(v => v.creator.id === matchingVideo.creator.id));
      }
    } else {
      // Load current user
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setVideos(allVideos.filter(v => v.creator.id === currentUser.id));
      setSavedVideos(allVideos.filter(v => v.isSaved));
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [creatorUsername]);

  const handleEditClick = () => {
    if (!user) return;
    setEditDisplayName(user.displayName);
    setEditBio(user.bio);
    setEditAvatar(user.avatar);
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateProfile(editDisplayName, editBio, editAvatar);
    setUser(updated);
    setIsEditing(false);
    loadProfileData(); // Reload listings
  };

  const handleFollowToggle = async () => {
    if (!user) return;
    const updated = await toggleFollowUser(user.id);
    if (updated) {
      setUser(updated);
    }
  };

  const handleMessageClick = () => {
    if (!user || !onMessageClick) return;
    onMessageClick(user.id);
  };

  if (!user) {
    return (
      <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center text-white">
        <p className="text-xs text-neutral-500">Loading profile...</p>
      </div>
    );
  }

  const isOwnProfile = !creatorUsername || user.id === 'current_user_1';

  return (
    <div className="w-full h-full bg-neutral-950 flex flex-col text-white">
      {/* Top Navigation Row */}
      <div className="p-4 border-b border-neutral-900 bg-neutral-950 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {creatorUsername && onBackClick && (
            <button
              onClick={onBackClick}
              className="mr-1.5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="text-xs font-bold font-mono text-neutral-100">@{user.username}</span>
          {user.isVerified && (
            <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white">
              ✓
            </span>
          )}
        </div>
        
        {isOwnProfile && (
          <button
            onClick={onLogout}
            className="p-1.5 rounded-full text-red-400 hover:text-red-500 hover:bg-red-500/10 transition"
            title="Log out / Switch profile"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Profile Details Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          
          {/* Main User Statistics Section */}
          <div className="flex items-center gap-5">
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/30"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 grid grid-cols-3 gap-1 text-center">
              <div>
                <span className="text-xs font-bold block">{videos.length}</span>
                <span className="text-[9px] text-neutral-500 uppercase">Posts</span>
              </div>
              <div>
                <span className="text-xs font-bold block">
                  {user.followersCount >= 1000 
                    ? `${(user.followersCount / 1000).toFixed(1)}K` 
                    : user.followersCount}
                </span>
                <span className="text-[9px] text-neutral-500 uppercase">Followers</span>
              </div>
              <div>
                <span className="text-xs font-bold block">
                  {user.followingCount >= 1000 
                    ? `${(user.followingCount / 1000).toFixed(1)}K` 
                    : user.followingCount}
                </span>
                <span className="text-[9px] text-neutral-500 uppercase">Following</span>
              </div>
            </div>
          </div>

          {/* User Bio Information */}
          <div className="space-y-1">
            <h1 className="text-xs font-bold text-white">{user.displayName}</h1>
            <p className="text-[11px] text-neutral-300 whitespace-pre-line leading-relaxed">
              {user.bio}
            </p>
          </div>

          {/* Action buttons (Edit Profile & Insights) */}
          {isOwnProfile ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleEditClick}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs py-2 px-3 rounded-xl border border-neutral-800/80 transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Edit2 size={11} />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setIsShowingAnalytics(true)}
                className="bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-300 font-semibold text-xs py-2 px-3 rounded-xl border border-indigo-500/30 transition flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-indigo-500/5"
              >
                <BarChart3 size={11} className="text-indigo-400" />
                <span>Insights Studio</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleFollowToggle}
                className={`font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 border ${
                  user.isFollowing
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
                }`}
              >
                <span>{user.isFollowing ? 'Following' : 'Follow'}</span>
              </button>
              <button
                onClick={handleMessageClick}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs py-2 px-3 rounded-xl border border-neutral-800/80 transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <MessageCircle size={11} className="text-indigo-400" />
                <span>Message</span>
              </button>
            </div>
          )}
        </div>

        {/* Dynamic tabs for Own profile: Posts vs Saved */}
        <div className="border-t border-neutral-900 flex">
          <button
            onClick={() => setActiveSubTab('posts')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeSubTab === 'posts' ? 'border-white text-white' : 'border-transparent text-neutral-500'
            }`}
          >
            <Grid size={14} />
            <span>Posts</span>
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveSubTab('saved')}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
                activeSubTab === 'saved' ? 'border-white text-white' : 'border-transparent text-neutral-500'
              }`}
            >
              <Bookmark size={14} />
              <span>Saved</span>
            </button>
          )}
          {isOwnProfile && (
            <button
              onClick={() => setActiveSubTab('wallet')}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
                activeSubTab === 'wallet' ? 'border-white text-white' : 'border-transparent text-neutral-500'
              }`}
            >
              <Coins size={14} className="text-amber-400 animate-pulse" />
              <span>Wallet</span>
            </button>
          )}
        </div>

        {/* Thumbnail Feed Grid */}
        <div className="p-1">
          {activeSubTab === 'posts' ? (
            videos.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-xs">
                No videos posted yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => onVideoClick(video.id)}
                    className="aspect-[9/16] bg-neutral-900 relative rounded-md overflow-hidden group cursor-pointer border border-neutral-950"
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
                    {/* Hover Stats Grid overlay */}
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition">
                      <div className="flex items-center gap-0.5 text-[10px] font-bold">
                        <Heart size={10} className="fill-white" />
                        <span>{video.likesCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-[10px] font-bold">
                        <Eye size={10} />
                        <span>{video.viewsCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeSubTab === 'saved' ? (
            savedVideos.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-xs">
                No saved videos yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {savedVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => onVideoClick(video.id)}
                    className="aspect-[9/16] bg-neutral-900 relative rounded-md overflow-hidden group cursor-pointer border border-neutral-950"
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
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition">
                      <div className="flex items-center gap-0.5 text-[10px] font-bold">
                        <Heart size={10} className="fill-white" />
                        <span>{video.likesCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* ================= CREATOR MONETIZATION WALLET HUB ================= */
            <div className="p-3 space-y-4 animate-fade-in text-white font-sans pb-10">
              
              {/* Wallet Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-neutral-900 border border-indigo-500/30 rounded-2xl p-4 shadow-xl shadow-indigo-500/5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest block leading-none">
                      Creator Coin Wallet
                    </span>
                    <h2 className="text-xl font-black mt-2 text-white flex items-center gap-1.5">
                      🪙 {user?.coinsBalance || 0} <span className="text-[11px] text-indigo-300 font-medium">Coins</span>
                    </h2>
                  </div>
                  <Coins size={24} className="text-amber-400 animate-pulse" />
                </div>

                <div className="mt-4 border-t border-indigo-950/40 pt-2.5 flex justify-between text-neutral-400 text-[9px] font-bold">
                  <span>Estimated Payout Value:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    ₹{((user?.coinsBalance || 0) * 0.9).toFixed(2)} INR
                  </span>
                </div>
              </div>

              {/* Earned Gifts Grid */}
              <div className="bg-neutral-900/60 border border-neutral-800/85 p-3.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-neutral-100 flex items-center gap-1.5">
                    <Gift size={12} className="text-pink-400" />
                    <span>Gifts Received Summary</span>
                  </h3>
                  <span className="text-[8px] text-neutral-500 font-mono">Live Sync</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'rose', name: 'Rose', icon: '🌹', value: 5 },
                    { id: 'trophy', name: 'Trophy', icon: '🏆', value: 50 },
                    { id: 'diamond', name: 'Diamond', icon: '💎', value: 100 },
                    { id: 'crown', name: 'Crown', icon: '👑', value: 500 },
                  ].map((g) => {
                    const count = user?.earnedGifts?.[g.id] || 0;
                    return (
                      <div
                        key={g.id}
                        className="bg-neutral-950/40 border border-neutral-800/80 p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center"
                      >
                        <span className="text-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                          {g.icon}
                        </span>
                        <span className="text-[8px] font-bold text-neutral-300">
                          {g.name}
                        </span>
                        <span className="text-[10px] font-black text-pink-400 font-mono mt-0.5">
                          x{count}
                        </span>
                        <span className="text-[7px] text-neutral-500 font-mono leading-none scale-90">
                          +{count * g.value} coins
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recharge Plans Panel */}
              <div className="bg-neutral-900/60 border border-neutral-800/85 p-3.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-neutral-100 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span>Quick Coin Top-up (Recharge)</span>
                  </h3>
                  <span className="text-[7px] bg-indigo-500/15 text-indigo-300 font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    Secure
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { coins: 100, price: '₹99' },
                    { coins: 500, price: '₹449' },
                    { coins: 1000, price: '₹899' },
                    { coins: 5000, price: '₹3,999' },
                  ].map((plan) => (
                    <button
                      key={plan.coins}
                      onClick={async () => {
                        const confirmPurchase = window.confirm(`Simulate purchase of 🪙 ${plan.coins} Coins for ${plan.price}?`);
                        if (confirmPurchase) {
                          try {
                            const updatedUser = await rechargeWallet(plan.coins);
                            setUser(updatedUser);
                            alert(`Success! Recharged 🪙 ${plan.coins} Coins.`);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="bg-neutral-950/50 border border-neutral-800/80 hover:border-indigo-500/40 hover:bg-indigo-500/5 p-2 rounded-xl flex items-center justify-between transition-all active:scale-[0.97] text-left group"
                    >
                      <div>
                        <span className="text-[10px] font-black block text-neutral-100">
                          🪙 {plan.coins}
                        </span>
                        <span className="text-[8px] text-neutral-500 font-bold block mt-0.5">
                          Coins
                        </span>
                      </div>
                      <span className="text-[8px] font-black bg-neutral-900 border border-neutral-800 px-1.5 py-1 rounded-lg text-amber-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-colors">
                        {plan.price}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal Dialog Overlay */}
      {isEditing && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[320px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden p-4 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Edit2 size={14} className="text-indigo-400" />
              Edit Profile Info
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              {/* Display name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-neutral-950 border-none outline-none text-xs text-white p-2.5 rounded-xl placeholder:text-neutral-700 focus:ring-1 focus:ring-neutral-700"
                />
              </div>

              {/* Avatar field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Avatar Image URL
                </label>
                <input
                  type="text"
                  required
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full bg-neutral-950 border-none outline-none text-xs text-white p-2.5 rounded-xl placeholder:text-neutral-700 focus:ring-1 focus:ring-neutral-700 font-mono"
                />
              </div>

              {/* Bio field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Bio Description
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  maxLength={100}
                  className="w-full bg-neutral-950 border-none outline-none text-xs text-white p-2.5 rounded-xl placeholder:text-neutral-700 resize-none focus:ring-1 focus:ring-neutral-700"
                />
              </div>

              {/* Actions row */}
              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-neutral-800 text-neutral-400 font-semibold text-xs py-2 px-3 rounded-xl hover:bg-neutral-700 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1"
                >
                  <Check size={12} />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creator Trends Analytics Dashboard Modal */}
      {isShowingAnalytics && (
        <div className="absolute inset-0 bg-neutral-950 z-50 flex flex-col text-white animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-neutral-900 bg-neutral-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg">
                <BarChart3 size={16} />
              </div>
              <div>
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-200">Insights Studio</h2>
                <p className="text-[9px] text-neutral-500">Real-time creator analytics & video trends</p>
              </div>
            </div>
            <button
              onClick={() => setIsShowingAnalytics(false)}
              className="p-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition active:scale-95"
            >
              <X size={14} />
            </button>
          </div>

          {/* Scrollable Dashboard Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Overview Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Total Views */}
              <div className="bg-neutral-900/60 p-3 rounded-2xl border border-neutral-900 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Total Views</span>
                  <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-md text-[8px] font-bold flex items-center gap-0.5">
                    <TrendingUp size={8} /> +12.4%
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg font-bold font-mono tracking-tight">
                    {videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] text-neutral-500 block mt-0.5">Organic impressions</span>
                </div>
              </div>

              {/* Total Likes */}
              <div className="bg-neutral-900/60 p-3 rounded-2xl border border-neutral-900 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Total Likes</span>
                  <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-md text-[8px] font-bold flex items-center gap-0.5">
                    <TrendingUp size={8} /> +8.1%
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg font-bold font-mono tracking-tight text-rose-400">
                    {videos.reduce((acc, v) => acc + (v.likesCount || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] text-neutral-500 block mt-0.5">Appreciation rate</span>
                </div>
              </div>

              {/* Total Shares */}
              <div className="bg-neutral-900/60 p-3 rounded-2xl border border-neutral-900 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Total Shares</span>
                  <div className="p-1 bg-indigo-500/10 text-indigo-400 rounded-md text-[8px] font-bold flex items-center gap-0.5">
                    <TrendingUp size={8} /> +15.3%
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg font-bold font-mono tracking-tight text-indigo-400">
                    {videos.reduce((acc, v) => acc + (v.sharesCount || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] text-neutral-500 block mt-0.5">Virality velocity</span>
                </div>
              </div>

              {/* Avg Engagement Rate */}
              <div className="bg-neutral-900/60 p-3 rounded-2xl border border-neutral-900 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Engagement</span>
                  <span className="text-[8px] text-indigo-400 font-bold bg-indigo-500/10 px-1 py-0.5 rounded-md">Excellent</span>
                </div>
                <div className="mt-3">
                  <span className="text-lg font-bold font-mono tracking-tight text-amber-400">
                    {(() => {
                      const totalViews = videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
                      const totalActions = videos.reduce((acc, v) => acc + (v.likesCount || 0) + (v.sharesCount || 0) + (v.commentsCount || 0), 0);
                      return totalViews > 0 ? ((totalActions / totalViews) * 100).toFixed(1) : '0.0';
                    })()}%
                  </span>
                  <span className="text-[8px] text-neutral-500 block mt-0.5">Action per impression</span>
                </div>
              </div>
            </div>

            {/* Weekly Views Trend Visual Chart */}
            <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-900 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-indigo-400" />
                  <h3 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">Weekly Views Trend</h3>
                </div>
                <span className="text-[8px] text-neutral-500 font-mono flex items-center gap-1">
                  <Calendar size={8} /> Last 7 Days (June 21 - June 27)
                </span>
              </div>

              {/* GORGEOUS HIGHLY DETAILED GLOWING AREA CHART */}
              <div className="relative pt-2 h-28 w-full flex flex-col justify-end">
                {/* SVG Line & Area Graph */}
                <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <defs>
                    {/* Glowing Purple Gradient */}
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="5" x2="100" y2="5" stroke="#262626" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="0" y1="15" x2="100" y2="15" stroke="#262626" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#262626" strokeWidth="0.1" strokeDasharray="1,1" />

                  {/* Filled Area Path */}
                  <path
                    d="M 0 30 L 0 25 L 16 22 L 33 14 L 50 18 L 66 11 L 83 5 L 100 2 L 100 30 Z"
                    fill="url(#chartGradient)"
                  />

                  {/* Top Glowing Stroke Line */}
                  <path
                    d="M 0 25 L 16 22 L 33 14 L 50 18 L 66 11 L 83 5 L 100 2"
                    fill="none"
                    stroke="url(#lineGlow)"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                  />

                  {/* Intersecting dots */}
                  <circle cx="0" cy="25" r="0.7" fill="#818cf8" stroke="#000" strokeWidth="0.2" />
                  <circle cx="16" cy="22" r="0.7" fill="#818cf8" stroke="#000" strokeWidth="0.2" />
                  <circle cx="33" cy="14" r="0.7" fill="#ec4899" stroke="#000" strokeWidth="0.2" />
                  <circle cx="50" cy="18" r="0.7" fill="#ec4899" stroke="#000" strokeWidth="0.2" />
                  <circle cx="66" cy="11" r="0.7" fill="#6366f1" stroke="#000" strokeWidth="0.2" />
                  <circle cx="83" cy="5" r="0.7" fill="#6366f1" stroke="#000" strokeWidth="0.2" />
                  <circle cx="100" cy="2" r="0.8" fill="#6366f1" className="animate-pulse" stroke="#fff" strokeWidth="0.3" />
                </svg>

                {/* Legend Columns overlay */}
                <div className="absolute inset-x-0 bottom-0 flex justify-between px-0.5 text-[8px] font-semibold text-neutral-500 font-mono">
                  <div className="flex flex-col items-center">
                    <span>12k</span>
                    <span className="text-[7px] text-neutral-600 font-normal mt-0.5">Mon</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>18k</span>
                    <span className="text-[7px] text-neutral-600 font-normal mt-0.5">Tue</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>34k</span>
                    <span className="text-[7px] text-neutral-600 font-normal mt-0.5">Wed</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>28k</span>
                    <span className="text-[7px] text-neutral-600 font-normal mt-0.5">Thu</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>42k</span>
                    <span className="text-[7px] text-neutral-600 font-normal mt-0.5">Fri</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>58k</span>
                    <span className="text-[7px] text-neutral-600 font-normal mt-0.5">Sat</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-indigo-400 font-bold">85k</span>
                    <span className="text-[7px] text-indigo-400/80 font-bold mt-0.5">Today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spotlight Banner Card */}
            {videos.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-indigo-600/10 to-indigo-500/5 border border-amber-500/20 p-3.5 rounded-2xl relative overflow-hidden space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] tracking-wider uppercase">
                  <Award size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                  <span>Top Performing Spotlight</span>
                </div>
                {(() => {
                  const topVideo = [...videos].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0];
                  if (!topVideo) return null;
                  return (
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-20 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 shrink-0 relative">
                        <video
                          src={topVideo.url}
                          className="w-full h-full object-cover pointer-events-none"
                          muted
                          playsInline
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
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Sparkles size={10} className="text-amber-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[10px] text-neutral-300 font-medium line-clamp-2 italic leading-relaxed">
                          "{topVideo.description}"
                        </p>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-neutral-400 font-mono">
                          <span className="text-amber-300 font-bold">★ {(topVideo.viewsCount || 0).toLocaleString()} Views</span>
                          <span>•</span>
                          <span>{topVideo.likesCount} Likes</span>
                          <span>•</span>
                          <span className="text-indigo-300">{topVideo.sharesCount} Shares</span>
                        </div>
                        <p className="text-[8px] text-neutral-500 font-semibold bg-white/5 py-0.5 px-1.5 rounded-md inline-block">
                          💡 Share velocity is 3.5x higher than average posts!
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Video-by-Video Breakdown Listing */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Posts Breakdown</h3>
                  <span className="text-[9px] text-neutral-500 font-semibold">{videos.length} videos uploaded</span>
                </div>

                {/* Dynamic sorting tabs */}
                <div className="grid grid-cols-3 gap-1 bg-neutral-900/60 p-0.5 rounded-xl border border-neutral-800/60 shrink-0 text-[10px] font-semibold">
                  {(['views', 'likes', 'shares'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAnalyticsSortBy(mode)}
                      className={`py-1.5 px-2 rounded-lg text-center transition capitalize ${
                        analyticsSortBy === mode
                          ? 'bg-neutral-800 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {videos.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-6">No videos found to analyze.</p>
              ) : (
                <div className="space-y-2">
                  {[...videos]
                    .sort((a, b) => {
                      if (analyticsSortBy === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
                      if (analyticsSortBy === 'shares') return (b.sharesCount || 0) - (a.sharesCount || 0);
                      return (b.viewsCount || 0) - (a.viewsCount || 0);
                    })
                    .map((vid) => {
                      const indRate = vid.viewsCount > 0 
                        ? (((vid.likesCount + vid.commentsCount + vid.sharesCount) / vid.viewsCount) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <div
                          key={vid.id}
                          onClick={() => {
                            setIsShowingAnalytics(false);
                            onVideoClick(vid.id);
                          }}
                          className="flex items-center gap-3 p-2 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800/80 rounded-2xl transition cursor-pointer group"
                        >
                          {/* Mini Video Thumbnail */}
                          <div className="w-10 h-16 bg-neutral-950 rounded-xl overflow-hidden shrink-0 border border-neutral-800 relative">
                            <video
                              src={vid.url}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
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
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <Eye size={10} className="text-white" />
                            </div>
                          </div>

                          {/* Data columns */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-[10px] font-medium text-neutral-200 truncate pr-2">
                              {vid.description || 'No description provided'}
                            </p>
                            <div className="flex items-center gap-2.5 text-[9px] text-neutral-500 font-mono">
                              <span className="flex items-center gap-0.5 text-neutral-400">
                                <Eye size={9} /> {vid.viewsCount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-0.5 text-rose-500/80">
                                <Heart size={9} /> {vid.likesCount}
                              </span>
                              <span className="flex items-center gap-0.5 text-indigo-400/80">
                                <Share2 size={9} /> {vid.sharesCount}
                              </span>
                              <span className="flex items-center gap-0.5 text-neutral-400">
                                <MessageCircle size={9} /> {vid.commentsCount}
                              </span>
                            </div>
                          </div>

                          {/* Right Side Engagement Score Badge */}
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold font-mono text-amber-400 block">{indRate}%</span>
                            <span className="text-[7px] text-neutral-500 uppercase font-bold block mt-0.5">Engage</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Google AdMob Banner Ad placement */}
      <BannerAd placement="profile" />
    </div>
  );
}

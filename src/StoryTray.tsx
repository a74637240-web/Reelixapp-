import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Image, Film, Sparkles, ChevronLeft, ChevronRight, Eye, Send, Play, Pause, AlertCircle, Trash2 } from 'lucide-react';
import { User, Story, UserStories } from '../types';
import {
  getCurrentUser,
  getUserStories,
  addStory,
  markStoryAsViewed,
  getUsers,
  sendDirectMessage,
  deleteStory,
} from '../storageService';

interface StoryTrayProps {
  onCreatorClick: (username: string) => void;
}

export default function StoryTray({ onCreatorClick }: StoryTrayProps) {
  const [userStoriesList, setUserStoriesList] = useState<UserStories[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Modal & Viewer States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeUserStories, setActiveUserStories] = useState<UserStories | null>(null);
  const [activeStoriesIndex, setActiveStoriesIndex] = useState(0); // Index of UserStories in list
  const [activeStoryItemIndex, setActiveStoryItemIndex] = useState(0); // Index of Story inside user's stories

  // Upload States
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'video' | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string>('');
  const [storyCaption, setStoryCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Story Viewer Auto-Advance / Progress Timer
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressTimerRef = useRef<number | null>(null);

  // Quick Reply State
  const [quickReplyText, setQuickReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  // Load Stories & User
  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to real-time database updates
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('reels-data-updated', handleUpdate);
    return () => window.removeEventListener('reels-data-updated', handleUpdate);
  }, []);

  const loadData = () => {
    const freshUser = getCurrentUser();
    setCurrentUser((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(freshUser)) {
        return prev;
      }
      return freshUser;
    });

    const freshStories = getUserStories();
    setUserStoriesList((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(freshStories)) {
        return prev;
      }
      return freshStories;
    });
  };

  // Timer for progressing the active story
  useEffect(() => {
    if (!activeUserStories) {
      setProgress(0);
      return;
    }

    if (isPaused) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

        // Mark current story as viewed only if not already viewed by current user
    const currentStory = activeUserStories.stories[activeStoryItemIndex];
    if (currentStory && currentUser) {
      const alreadyViewed = currentStory.views?.includes(currentUser.id);
      if (!alreadyViewed) {
        markStoryAsViewed(currentStory.id);
        if (!currentStory.views) {
          currentStory.views = [];
        }
        currentStory.views.push(currentUser.id);
        // Reload underlying data quietly
        const freshStories = getUserStories();
        setUserStoriesList((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(freshStories)) {
            return prev;
          }
          return freshStories;
        });
      }
    }

    const duration = 5000; // 5 seconds per story
    const intervalTime = 50; // Update progress every 50ms
    const step = (intervalTime / duration) * 100;

    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [activeUserStories, activeStoryItemIndex, isPaused]);

  const handlePrevStory = () => {
    if (!activeUserStories) return;
    setProgress(0);

    if (activeStoryItemIndex > 0) {
      // Go to previous story of same user
      setActiveStoryItemIndex(activeStoryItemIndex - 1);
    } else if (activeStoriesIndex > 0) {
      // Go to previous user's last story
      const prevUserStories = userStoriesList[activeStoriesIndex - 1];
      setActiveStoriesIndex(activeStoriesIndex - 1);
      setActiveUserStories(prevUserStories);
      setActiveStoryItemIndex(prevUserStories.stories.length - 1);
    }
  };

  const handleNextStory = () => {
    if (!activeUserStories) return;
    setProgress(0);

    if (activeStoryItemIndex < activeUserStories.stories.length - 1) {
      // Go to next story of same user
      setActiveStoryItemIndex(activeStoryItemIndex + 1);
    } else if (activeStoriesIndex < userStoriesList.length - 1) {
      // Go to next user's first story
      const nextUserStories = userStoriesList[activeStoriesIndex + 1];
      setActiveStoriesIndex(activeStoriesIndex + 1);
      setActiveUserStories(nextUserStories);
      setActiveStoryItemIndex(0);
    } else {
      // End of all stories, close viewer
      closeStoryViewer();
    }
  };

  const closeStoryViewer = () => {
    setActiveUserStories(null);
    setProgress(0);
    setIsPaused(false);
    setQuickReplyText('');
    setReplySent(false);
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // Handle local story file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setUploadError('Unsupported file type. Please select an image or video file.');
      return;
    }

    // Set file type
    setSelectedFileType(isImage ? 'image' : 'video');

    // To survive page reloads and adhere to "No Mock Data", we will convert images to Base64.
    // However, if the file is too large, we might exceed localStorage quota (5MB).
    // Let's implement a size check. If file is < 1.5MB, convert to base64. Else, use objectURL
    // and let them know it is a transient session-only story due to local browser storage limits.
    if (file.size > 1.5 * 1024 * 1024) {
      const tempUrl = URL.createObjectURL(file);
      setSelectedFileUrl(tempUrl);
      if (isVideo) {
        // Videos are typically larger, warn gently
        setUploadError('Larger video loaded. Note: Large files persist for the current browser session only due to sandboxed storage limits.');
      } else {
        setUploadError('Large image loaded. Persistent for the current session only.');
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedFileUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Publish temporary story
  const handlePublishStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileUrl || !selectedFileType) return;

    setIsPublishing(true);

    try {
      addStory(selectedFileType, selectedFileUrl, storyCaption.trim() || undefined);
      
      // Clean states & reload
      setIsUploadOpen(false);
      setSelectedFileUrl('');
      setSelectedFileType(null);
      setStoryCaption('');
      setUploadError('');
      loadData();
    } catch (err) {
      console.error(err);
      setUploadError('Quota exceeded or storage failure. Try uploading a smaller image.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Open active viewer
  const handleOpenViewer = (userStories: UserStories, listIndex: number) => {
    setActiveStoriesIndex(listIndex);
    setActiveUserStories(userStories);
    setActiveStoryItemIndex(0);
    setProgress(0);
    setIsPaused(false);
  };

  // Send Story Quick Reply
  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUserStories || !quickReplyText.trim()) return;

    const currentStory = activeUserStories.stories[activeStoryItemIndex];
    const replyMsg = `Replied to your story: "${quickReplyText.trim()}"`;

    try {
      sendDirectMessage(activeUserStories.userId, replyMsg);
      setReplySent(true);
      setQuickReplyText('');
      setTimeout(() => setReplySent(false), 2000);
    } catch (err) {
      console.error('Failed to send quick reply:', err);
    }
  };

  // Find if current user has an active story
  const ownStoriesObj = userStoriesList.find(us => us.userId === currentUser?.id);

  // Time formatter
  const formatTimeAgo = (epochMs: number) => {
    const diffMs = Date.now() - epochMs;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    return `${diffHrs}h ago`;
  };

  return (
    <div className="w-full shrink-0 py-3.5 px-4 bg-gradient-to-b from-black/80 to-black/10 flex items-center gap-3 overflow-x-auto scrollbar-none z-30 select-none border-b border-neutral-900/30">
      
      {/* 1. CURRENT USER STORY AVATAR */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative">
          {ownStoriesObj ? (
            // User has active stories
            <button
              onClick={() => handleOpenViewer(ownStoriesObj, userStoriesList.findIndex(u => u.userId === currentUser?.id))}
              className="w-13 h-13 rounded-full p-[2.5px] bg-gradient-to-tr from-yellow-500 via-pink-500 to-indigo-600 active:scale-95 transition"
            >
              <img
                src={currentUser?.avatar}
                alt="Your Story"
                className="w-full h-full rounded-full object-cover border-2 border-black"
                referrerPolicy="no-referrer"
              />
            </button>
          ) : (
            // User has no active stories, show trigger to upload
            <button
              onClick={() => setIsUploadOpen(true)}
              className="w-13 h-13 rounded-full p-[1px] bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition relative"
            >
              <img
                src={currentUser?.avatar}
                alt="Add Story"
                className="w-full h-full rounded-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1 rounded-full border-2 border-black flex items-center justify-center scale-90">
                <Plus size={10} className="stroke-[3.5px]" />
              </div>
            </button>
          )}
        </div>
        <span className="text-[9px] font-semibold text-neutral-300 tracking-tight">Your Story</span>
      </div>

      {/* 2. OTHER USERS WITH STORIES LIST */}
      {userStoriesList
        .filter((us) => us.userId !== currentUser?.id)
        .map((us, idx) => {
          // Adjust overall index in list for the click handler since we excluded currentUser
          const listIdx = userStoriesList.findIndex((item) => item.userId === us.userId);
          
          return (
            <div key={us.userId} className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => handleOpenViewer(us, listIdx)}
                className={`w-13 h-13 rounded-full p-[2.5px] active:scale-95 transition ${
                  us.hasUnread
                    ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-indigo-600'
                    : 'bg-neutral-800'
                }`}
              >
                <img
                  src={us.user.avatar}
                  alt={us.user.displayName}
                  className="w-full h-full rounded-full object-cover border-2 border-black"
                  referrerPolicy="no-referrer"
                />
              </button>
              <span className="text-[9px] font-medium text-neutral-400 truncate w-14 text-center">
                {us.user.username}
              </span>
            </div>
          );
        })}

      {/* ================= ADD STORY MODAL ================= */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-900 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90%]">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles size={16} />
                <h3 className="text-sm font-bold tracking-wider">Create Temporary Story</h3>
              </div>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setSelectedFileUrl('');
                  setSelectedFileType(null);
                  setStoryCaption('');
                  setUploadError('');
                }}
                className="p-1.5 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white transition active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handlePublishStory} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* Media Selection Area */}
              {selectedFileUrl ? (
                <div className="w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border border-neutral-850 flex items-center justify-center shadow-lg group">
                  {selectedFileType === 'image' ? (
                    <img src={selectedFileUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={selectedFileUrl} className="w-full h-full object-cover" controls playsInline autoPlay muted loop />
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileUrl('');
                      setSelectedFileType(null);
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-red-600 rounded-full text-white transition active:scale-95 opacity-80 hover:opacity-100"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[9/16] bg-neutral-900/40 border border-dashed border-neutral-800 hover:border-indigo-500/50 hover:bg-neutral-900/70 rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer group transition"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-4 bg-indigo-600/10 rounded-full text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600/20 transition duration-300 mb-3">
                    <Image size={24} className="group-hover:hidden" />
                    <Film size={24} className="hidden group-hover:block" />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-200">Upload Image or Video Story</h4>
                  <p className="text-[10px] text-neutral-500 max-w-[180px] leading-relaxed mt-1">
                    Temporary posts that automatically disappear in 24 hours.
                  </p>
                </div>
              )}

              {/* Error Warning Block */}
              {uploadError && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-900/35 rounded-xl flex items-start gap-2 text-[10px] text-indigo-300">
                  <AlertCircle size={14} className="shrink-0 text-indigo-400" />
                  <p className="leading-normal">{uploadError}</p>
                </div>
              )}

              {/* Caption Entry */}
              {selectedFileUrl && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={storyCaption}
                    onChange={(e) => setStoryCaption(e.target.value)}
                    placeholder="Add a witty thought or status..."
                    className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-800 focus:border-neutral-700 outline-none text-xs text-white py-2.5 px-3.5 rounded-xl placeholder:text-neutral-600 transition"
                    maxLength={100}
                  />
                </div>
              )}

              {/* Actions */}
              {selectedFileUrl && (
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="w-full mt-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-450 text-white font-semibold text-xs py-3 rounded-xl transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Sparkles size={12} />
                  <span>{isPublishing ? 'Sharing Story...' : 'Share to Story'}</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ================= INSTAGRAM-LIKE STORY VIEWER ================= */}
      {activeUserStories && (() => {
        const activeStory = activeUserStories.stories[activeStoryItemIndex];
        if (!activeStory) return null;

        return (
          <div className="fixed inset-0 z-[9999] bg-[#000000] flex flex-col justify-between h-full w-full select-none animate-fade-in font-sans" style={{ backgroundColor: '#000000' }}>
            
            {/* Top Area: Progress Segments & User Profile Info */}
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-50 flex flex-col gap-3">
              
              {/* Progress Bar Segments */}
              <div className="flex gap-1.5 w-full">
                {activeUserStories.stories.map((storyItem, idx) => {
                  let filledPercent = 0;
                  if (idx < activeStoryItemIndex) filledPercent = 100; // Completed
                  else if (idx === activeStoryItemIndex) filledPercent = progress; // Currently filling
                  else filledPercent = 0; // Upcoming

                  return (
                    <div key={storyItem.id} className="flex-1 h-[3px] bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-75"
                        style={{ width: `${filledPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* User details & Close Button */}
              <div className="flex items-center justify-between">
                <div
                  onClick={() => {
                    closeStoryViewer();
                    onCreatorClick(activeUserStories.user.username);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <img
                    src={activeUserStories.user.avatar}
                    alt={activeUserStories.user.displayName}
                    className="w-9 h-9 rounded-full object-cover border-1.5 border-white shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none flex items-center gap-1 group-hover:text-indigo-400 transition">
                      {activeUserStories.user.displayName}
                      {activeUserStories.user.isVerified && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1 py-0.2 rounded-md">✓</span>}
                    </h4>
                    <span className="text-[9px] text-neutral-300 font-mono mt-0.5 block">
                      @{activeUserStories.user.username} • {formatTimeAgo(activeStory.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeUserStories.userId === currentUser?.id && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmDelete = window.confirm("Are you sure you want to delete this story?");
                        if (confirmDelete) {
                          setIsPaused(true);
                          const success = await deleteStory(activeStory.id);
                          if (success) {
                            // Fetch fresh user stories and refresh the screen
                            const updatedList = getUserStories();
                            setUserStoriesList(updatedList);
                            
                            // Find current index
                            const selfStories = updatedList.find(us => us.userId === currentUser?.id);
                            if (selfStories && selfStories.stories.length > 0) {
                              setActiveUserStories(selfStories);
                              setActiveStoryItemIndex(0);
                            } else {
                              closeStoryViewer();
                            }
                          } else {
                            alert("Failed to delete story. Please try again.");
                          }
                        }
                      }}
                      className="p-1.5 rounded-full bg-red-600/30 hover:bg-red-600/80 text-red-300 hover:text-white transition active:scale-95"
                      title="Delete Story"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-neutral-900/60 text-white transition active:scale-95"
                    title={isPaused ? 'Resume Play' : 'Pause Play'}
                  >
                    {isPaused ? <Play size={14} className="fill-white" /> : <Pause size={14} />}
                  </button>
                  <button
                    onClick={closeStoryViewer}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-neutral-900/60 text-white transition active:scale-95"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Media Area & Invisible Tap Targets */}
            <div className="flex-1 w-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
              {/* Active Story Media */}
              {activeStory.mediaType === 'image' ? (
                <img src={activeStory.mediaUrl} alt="Story content" className="w-full h-full object-contain pointer-events-none" />
              ) : (
                <video
                  src={activeStory.mediaUrl}
                  className="w-full h-full object-contain pointer-events-none"
                  autoPlay
                  playsInline
                  muted={false} // Allow audio in stories
                  onPlay={() => setIsPaused(false)}
                  onPause={() => setIsPaused(true)}
                  onError={(e) => {
                    const fallbackUrls = [
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
                    ];
                    const target = e.currentTarget;
                    if (!fallbackUrls.includes(target.src)) {
                      target.src = fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)];
                    }
                  }}
                />
              )}

              {/* Left Side Tap Target for Previous */}
              <div
                onClick={handlePrevStory}
                className="absolute left-0 top-16 bottom-20 w-1/4 cursor-pointer z-40 active:bg-white/5 transition-colors duration-100"
              />

              {/* Right Side Tap Target for Next */}
              <div
                onClick={handleNextStory}
                className="absolute right-0 top-16 bottom-20 w-1/4 cursor-pointer z-40 active:bg-white/5 transition-colors duration-100"
              />

              {/* Overlay Navigation Chevrons (only show if helpful) */}
              <button
                onClick={handlePrevStory}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 border border-neutral-800/40 text-neutral-400 hover:text-white transition active:scale-90 hidden md:block z-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextStory}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 border border-neutral-800/40 text-neutral-400 hover:text-white transition active:scale-90 hidden md:block z-50"
              >
                <ChevronRight size={16} />
              </button>

              {/* Caption Overlay at the Bottom of Media */}
              {activeStory.caption && (
                <div className="absolute bottom-20 left-4 right-4 bg-black/75 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-900/50 text-xs text-neutral-100 text-center leading-relaxed animate-fade-in shadow-xl z-40 max-h-24 overflow-y-auto">
                  "{activeStory.caption}"
                </div>
              )}
            </div>

            {/* Bottom Area: Quick DM Reply or Viewer Statistics */}
            <div className="p-4 bg-gradient-to-t from-black to-black/60 shrink-0 border-t border-neutral-900/30 z-50">
              {activeUserStories.userId === currentUser?.id ? (
                /* Stats and Viewers list if viewing own story */
                <div className="flex items-center justify-between text-neutral-400 text-[10px] font-medium py-1">
                  <span className="flex items-center gap-1">
                    <Eye size={12} className="text-indigo-400" />
                    <span>Viewed by {activeStory.views.length} creators</span>
                  </span>
                  
                  {activeStory.views.length > 0 && (
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {activeStory.views.map((viewerId) => {
                        const targetUser = getUsers().find((u) => u.id === viewerId);
                        if (!targetUser) return null;
                        return (
                          <img
                            key={viewerId}
                            src={targetUser.avatar}
                            alt=""
                            className="inline-block h-4 w-4 rounded-full ring-1 ring-black object-cover"
                            title={`@${targetUser.username}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Dynamic Interactive Direct Messaging quick reply box */
                <form onSubmit={handleSendQuickReply} className="flex gap-2.5 items-center relative">
                  <input
                    type="text"
                    value={quickReplyText}
                    onChange={(e) => setQuickReplyText(e.target.value)}
                    placeholder={`Reply to @${activeUserStories.user.username}...`}
                    className="flex-1 bg-neutral-900/90 border border-neutral-800 focus:border-neutral-700 outline-none text-xs text-white py-2.5 px-4 rounded-full placeholder:text-neutral-500 transition"
                  />
                  
                  {quickReplyText.trim() && (
                    <button
                      type="submit"
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition active:scale-95 flex items-center justify-center shrink-0"
                    >
                      <Send size={11} />
                    </button>
                  )}

                  {/* Reply Success Badge popup overlay */}
                  {replySent && (
                    <div className="absolute inset-0 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold text-white animate-fade-in">
                      Reply shared directly to direct messages! ✨
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

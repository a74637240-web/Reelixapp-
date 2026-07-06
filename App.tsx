import React, { useState, useEffect } from 'react';
import { Home, Search, PlusSquare, Bell, MessageCircle, User as UserIcon } from 'lucide-react';
import PhoneFrame from './components/phoneFrame.tsx';
import ReelsFeed from './components/ReelsFeed.tsx';
import SearchTab from './components/SearchTab';
import UploadTab from './components/UploadTab';
import ProfileTab from './components/ProfileTab';
import NotificationsTab from './components/NotificationsTab';
import ChatTab from './components/ChatTab';
import LoginModal from './components/LoginModal';
import CommentSheet from './components/CommentSheet';
import ShareSheet from './components/ShareSheet';
import { initStorage, getCurrentUser, getVideos, saveVideos, getOrCreateFirestoreUser, startFirestoreSync, stopFirestoreSync } from './storageService';
import { AppTab, Video, User } from './types';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [isMuted, setIsMuted] = useState(true); // Default to muted for auto-play policy compatibility
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Bottom drawer sheets state
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  // Selected creator profile view state (null means own profile)
  const [selectedCreatorUsername, setSelectedCreatorUsername] = useState<string | null>(null);

  // Selected DM chat target state
  const [selectedChatCreatorId, setSelectedChatCreatorId] = useState<string | null>(null);

  // Initialize storage and check login session with Firebase Auth
  useEffect(() => {
    initStorage();
    
    // Check if we are already logged in locally
    const authMode = localStorage.getItem('reels_auth_mode');
    const localUserJson = localStorage.getItem('reels_current_user');
    if (authMode === 'local' && localUserJson) {
      try {
        const localUser = JSON.parse(localUserJson);
        setCurrentUser(localUser);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('reels_auth_mode');
        localStorage.removeItem('reels_current_user');
      }
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentAuthMode = localStorage.getItem('reels_auth_mode');
      if (user) {
        localStorage.setItem('reels_auth_mode', 'firebase');
        startFirestoreSync();
        try {
          const userData = await getOrCreateFirestoreUser(user);
          setCurrentUser(userData);
          setIsLoggedIn(true);
        } catch (error) {
          console.warn('Firebase sync failed on auth change, using local fallback:', error);
          const fallbackUser: User = {
            id: user.uid,
            username: user.email ? user.email.split('@')[0] : `user_${user.uid.slice(0, 6)}`,
            displayName: user.displayName || 'Firebase User',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            bio: 'Firebase user (local sync)',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            isFollowing: false,
          };
          setCurrentUser(fallbackUser);
          setIsLoggedIn(true);
        }
      } else {
        // Only log out if we are not actively in local auth mode
        if (currentAuthMode !== 'local') {
          stopFirestoreSync();
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      }
    });

    return () => {
      unsubscribe();
      stopFirestoreSync();
    };
  }, []);

  // Sync state when data updates on Firestore
  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('reels-data-updated', handleUpdate);
    return () => window.removeEventListener('reels-data-updated', handleUpdate);
  }, []);

  // Sync avatar changes when editing profile
  const handleProfileRefresh = () => {
    setCurrentUser(getCurrentUser());
  };

  // Switch to home and trigger specific video play if clicked from search/profile
  const playSpecificVideo = (videoId: string) => {
    // Reorder videos to make the clicked video the first item in the list
    const allVideos = getVideos();
    const clickedIdx = allVideos.findIndex(v => v.id === videoId);
    
    if (clickedIdx !== -1) {
      const clickedVideo = allVideos[clickedIdx];
      const remainingVideos = allVideos.filter(v => v.id !== videoId);
      // Place clicked video at top
      saveVideos([clickedVideo, ...remainingVideos]);
    }
    
    setSelectedCreatorUsername(null);
    setActiveTab('home');
  };

  const handleCommentsUpdated = (newCount: number) => {
    // Comments count update will sync automatically via storage, but we can trigger a re-render
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut failed:', err);
    }
    stopFirestoreSync();
    localStorage.removeItem('reels_current_user');
    localStorage.removeItem('reels_auth_mode');
    setIsLoggedIn(false);
    setActiveTab('home');
    setSelectedCreatorUsername(null);
  };

  // Main page/tab router
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ReelsFeed
            activeAppTab={activeTab}
            isMuted={isMuted}
            onMuteToggle={() => setIsMuted(prev => !prev)}
            onCommentsClick={(videoId) => setCommentVideoId(videoId)}
            onShareClick={(video) => setShareVideo(video)}
            onCreatorClick={(username) => {
              setSelectedCreatorUsername(username);
              setActiveTab('profile');
            }}
          />
        );
      case 'search':
        return (
          <SearchTab
            onCreatorClick={(username) => {
              setSelectedCreatorUsername(username);
              setActiveTab('profile');
            }}
            onVideoClick={playSpecificVideo}
          />
        );
      case 'upload':
        return <UploadTab onUploadSuccess={() => setActiveTab('home')} />;
      case 'notifications':
        return <NotificationsTab />;
      case 'chat':
        return (
          <ChatTab
            onVideoClick={playSpecificVideo}
            onCreatorClick={(username) => {
              setSelectedCreatorUsername(username);
              setActiveTab('profile');
            }}
            initialActiveCreatorId={selectedChatCreatorId}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            creatorUsername={selectedCreatorUsername}
            onBackClick={() => {
              setSelectedCreatorUsername(null);
              setActiveTab('home');
            }}
            onVideoClick={playSpecificVideo}
            onLogout={handleLogout}
            onMessageClick={(creatorId) => {
              setSelectedChatCreatorId(creatorId);
              setActiveTab('chat');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PhoneFrame>
      {!isLoggedIn ? (
        <LoginModal onLoginSuccess={() => setIsLoggedIn(true)} />
      ) : (
        <div className="w-full h-full flex flex-col relative select-none bg-black">
          {/* Active Tab Screen */}
          <div className="flex-1 w-full relative overflow-hidden">
            {renderTabContent()}
          </div>

          {/* Bottom App Navigation Bar */}
          <div className="h-12 bg-black border-t border-neutral-900 flex justify-around items-center shrink-0 z-30 px-2 select-none">
            <button
              onClick={() => {
                setSelectedCreatorUsername(null);
                setActiveTab('home');
              }}
              className={`p-2 rounded-full transition-colors ${
                activeTab === 'home' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Home size={20} className={activeTab === 'home' ? 'stroke-[2.5px]' : 'stroke-2'} />
            </button>

            <button
              onClick={() => {
                setSelectedCreatorUsername(null);
                setActiveTab('search');
              }}
              className={`p-2 rounded-full transition-colors ${
                activeTab === 'search' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Search size={20} className={activeTab === 'search' ? 'stroke-[2.5px]' : 'stroke-2'} />
            </button>

            <button
              onClick={() => {
                setSelectedCreatorUsername(null);
                setActiveTab('upload');
              }}
              className={`p-2 rounded-full transition-colors ${
                activeTab === 'upload' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <PlusSquare size={20} className={activeTab === 'upload' ? 'stroke-[2.5px]' : 'stroke-2'} />
            </button>

            <button
              onClick={() => {
                setSelectedCreatorUsername(null);
                setActiveTab('notifications');
              }}
              className={`p-2 rounded-full transition-colors relative ${
                activeTab === 'notifications' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Bell size={20} className={activeTab === 'notifications' ? 'stroke-[2.5px]' : 'stroke-2'} />
              {/* Unread indicator dot */}
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </button>

            <button
              onClick={() => {
                setSelectedCreatorUsername(null);
                setSelectedChatCreatorId(null); // Reset to view conversations list
                setActiveTab('chat');
              }}
              className={`p-2 rounded-full transition-colors relative ${
                activeTab === 'chat' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              id="dm-chat-nav-btn"
            >
              <MessageCircle size={20} className={activeTab === 'chat' ? 'stroke-[2.5px]' : 'stroke-2'} />
              {/* Unread dot indicator for total unread DMs */}
              {(() => {
                const unreadDMs = JSON.parse(localStorage.getItem('reels_messages') || '[]')
                  .filter((m: any) => m.receiverId === 'current_user_1' && !m.isRead).length;
                return unreadDMs > 0 ? (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                ) : null;
              })()}
            </button>

            <button
              onClick={() => {
                setSelectedCreatorUsername(null);
                setActiveTab('profile');
              }}
              className={`p-1.5 rounded-full transition-all flex items-center justify-center border-1.5 ${
                activeTab === 'profile' && !selectedCreatorUsername
                  ? 'border-white scale-105'
                  : 'border-transparent'
              }`}
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="Profile"
                  className="w-5 h-5 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon size={18} className="text-neutral-500" />
              )}
            </button>
          </div>

          {/* Bottom Sheet Drawer: Comments */}
          <CommentSheet
            videoId={commentVideoId || ''}
            isOpen={!!commentVideoId}
            onClose={() => setCommentVideoId(null)}
            onCommentsUpdated={handleCommentsUpdated}
          />

          {/* Bottom Sheet Drawer: Share options */}
          {shareVideo && (
            <ShareSheet
              video={shareVideo}
              isOpen={!!shareVideo}
              onClose={() => setShareVideo(null)}
            />
          )}
        </div>
      )}
    </PhoneFrame>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Volume2, 
  VolumeX,
  Send
} from 'lucide-react';

// सीधे src फोल्डर से इम्पोर्ट (बिना components/ के)
import ReelsFeed from "./ReelsFeed";
import ChatTab from "./ChatTab";
import UploadTab from "./UploadTab";
import SearchTab from "./SearchTab";
import ProfileTab from "./ProfileTab";
import NotificationsTab from "./NotificationsTab";

function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between select-none">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-16">
        {activeTab === 'home' && <ReelsFeed />}
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'upload' && <UploadTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 h-16 flex items-center justify-around z-50">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === 'home' ? 'text-white' : 'text-zinc-500'}`}
        >
          <Home size={24} />
        </button>

        <button 
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === 'search' ? 'text-white' : 'text-zinc-500'}`}
        >
          <Search size={24} />
        </button>

        <button 
          onClick={() => setActiveTab('upload')}
          className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === 'upload' ? 'text-white' : 'text-zinc-500'}`}
        >
          <PlusSquare size={24} />
        </button>

        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === 'notifications' ? 'text-white' : 'text-zinc-500'}`}
        >
          <Heart size={24} />
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === 'profile' ? 'text-white' : 'text-zinc-500'}`}
        >
          <User size={24} />
        </button>
      </div>
    </div>
  );
}

export default App;

              

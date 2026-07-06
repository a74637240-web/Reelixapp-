import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-0 md:p-6 select-none font-sans overflow-hidden">
      {/* Outer Phone Shell - Only visible on desktop/tablet */}
      <div className="w-full h-screen md:h-[840px] md:w-[400px] md:rounded-[48px] md:border-8 md:border-neutral-800 bg-black relative flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* Notch - Screen Punchhole (Desktop only) */}
        <div className="hidden md:block absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-neutral-900 border border-neutral-800 absolute right-4"></div>
        </div>

        {/* Status Bar */}
        <div className="h-11 bg-black px-6 pt-2 flex justify-between items-center text-xs text-white z-40 shrink-0 font-medium select-none">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5">
            <Signal size={14} className="text-white" />
            <Wifi size={14} className="text-white" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] mr-0.5">85%</span>
              <Battery size={16} className="text-white rotate-0" />
            </div>
          </div>
        </div>

        {/* Main App Container */}
        <div className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col bg-neutral-950">
          {children}
        </div>

        {/* Home Indicator bar (Desktop only) */}
        <div className="hidden md:flex h-6 bg-black justify-center items-center shrink-0 z-40">
          <div className="w-32 h-1 bg-neutral-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

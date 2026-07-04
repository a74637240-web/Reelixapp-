import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface BannerAdProps {
  placement?: string;
}

export default function BannerAd({ placement = 'general' }: BannerAdProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  // Real-looking sample AdMob campaigns
  const campaigns = [
    {
      title: 'Hostinger India - Fast Web Hosting',
      description: 'Get high-speed hosting starting at ₹149/mo with free domain & SSL.',
      cta: 'Get Offer',
      link: 'https://hostinger.in',
    },
    {
      title: 'Gemini Advanced - Write, plan, learn',
      description: 'Access Google\'s most capable AI models. Try for 2 months free.',
      cta: 'Try Now',
      link: 'https://gemini.google.com',
    },
    {
      title: 'Zomato - Flat 50% Off First Order',
      description: 'Hungry? Order hot & fresh food delivered to your doorstep in minutes.',
      cta: 'Order Now',
      link: 'https://zomato.com',
    },
    {
      title: 'Figma - Build Better Products Together',
      description: 'Design, prototype, and gather feedback in one collaborative space.',
      cta: 'Sign Up',
      link: 'https://figma.com',
    }
  ];

  // Pick ad based on placement or index
  const adIndex = placement === 'search' ? 1 : placement === 'profile' ? 2 : 0;
  const ad = campaigns[adIndex % campaigns.length];

  return (
    <div className="w-full bg-neutral-900 border-t border-b border-neutral-800 p-2.5 flex items-center justify-between gap-3 relative animate-fade-in shrink-0 z-10">
      
      {/* Google AdMob badge */}
      <div className="absolute top-1 left-2.5 flex items-center gap-1">
        <span className="text-[7px] bg-amber-500 text-black font-extrabold px-1 rounded-[2px] tracking-wide uppercase">
          Ad
        </span>
        <span className="text-[7px] text-neutral-500 font-mono">
          Google AdMob
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2 w-full">
        {/* Placeholder Google Play/App icon */}
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-inner">
          {ad.title.charAt(0)}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-[10px] font-bold text-neutral-100 truncate flex items-center gap-1 leading-none">
            {ad.title}
            <ExternalLink size={8} className="text-neutral-500 shrink-0" />
          </h4>
          <p className="text-[8px] text-neutral-400 truncate mt-0.5 leading-relaxed">
            {ad.description}
          </p>
        </div>

        {/* CTA Button */}
        <a
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-[9px] font-bold py-1.5 px-3 rounded-full text-white transition-all shadow-md shrink-0 border border-indigo-500/20"
        >
          {ad.cta}
        </a>
      </div>

      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="text-neutral-500 hover:text-white p-0.5 hover:bg-neutral-800 rounded-full transition absolute top-1 right-2.5"
        title="Hide Advertisement"
      >
        <X size={10} />
      </button>
    </div>
  );
}

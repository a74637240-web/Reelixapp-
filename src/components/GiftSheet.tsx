import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gift, Coins, ChevronRight, Check, Sparkles, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { getCurrentUser, rechargeWallet, sendGiftToCreator } from '../storageService';

interface GiftSheetProps {
  creatorId: string;
  creatorUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onGiftSent: (giftType: string) => void; // Trigger flying visual FX in parent
}

export default function GiftSheet({
  creatorId,
  creatorUsername,
  isOpen,
  onClose,
  onGiftSent,
}: GiftSheetProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedGift, setSelectedGift] = useState<{ id: string; name: string; cost: number; icon: string } | null>(null);
  const [isRecharging, setIsRecharging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Available gifts to send
  const gifts = [
    { id: 'rose', name: 'Rose', cost: 5, icon: '🌹' },
    { id: 'trophy', name: 'Trophy', cost: 50, icon: '🏆' },
    { id: 'diamond', name: 'Diamond', cost: 100, icon: '💎' },
    { id: 'crown', name: 'Crown', cost: 500, icon: '👑' },
  ];

  // Available recharge plans
  const rechargePlans = [
    { coins: 100, price: '₹99', desc: 'Starter pack' },
    { coins: 500, price: '₹449', desc: 'Popular choice', badge: 'Best Value' },
    { coins: 1000, price: '₹899', desc: 'Power user' },
    { coins: 5000, price: '₹3,999', desc: 'Creator MVP', badge: 'Hot' },
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentUser(getCurrentUser());
      setSelectedGift(gifts[0]); // default select rose
      setErrorMessage('');
      setSuccessMessage('');
      setIsRecharging(false);
    }
  }, [isOpen]);

  // Subscribe to profile changes so balance reflects updates
  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('reels-data-updated', handleUpdate);
    return () => window.removeEventListener('reels-data-updated', handleUpdate);
  }, []);

  const handleSendGift = async () => {
    if (!selectedGift || !currentUser) return;
    
    setIsSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    if ((currentUser.coinsBalance || 0) < selectedGift.cost) {
      setErrorMessage('Insufficient balance! Please recharge below.');
      setIsSending(false);
      return;
    }

    try {
      const res = await sendGiftToCreator(creatorId, selectedGift.id, selectedGift.cost);
      if (res.success) {
        setSuccessMessage(`Sent a ${selectedGift.name} to @${creatorUsername}! 🎉`);
        onGiftSent(selectedGift.id);
        
        // Auto-close sheet after 1.5 seconds on success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.error || 'Failed to send gift. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('A network error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRecharge = async (coins: number) => {
    try {
      setErrorMessage('');
      const updatedUser = await rechargeWallet(coins);
      setCurrentUser(updatedUser);
      setSuccessMessage(`Successfully recharged 🪙 ${coins} Coins! ✨`);
      setIsRecharging(false);
      
      // Clear success banner after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('Recharge failed. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black z-40 cursor-pointer"
          />

          {/* Bottom Gifting Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 210 }}
            className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl z-50 flex flex-col max-h-[90%] p-4 select-none font-sans overflow-hidden"
          >
            {/* Grabber indicator & Header */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-1 bg-neutral-700 rounded-full mb-3" />
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-1.5">
                  <Gift size={16} className="text-pink-500 animate-pulse" />
                  <span className="text-white font-bold text-sm">Send Gift to @{creatorUsername}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Success and Error Banners */}
            {successMessage && (
              <div className="mt-3 bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 p-2 text-[10px] rounded-lg font-medium flex items-center gap-1.5 animate-fade-in">
                <Sparkles size={11} className="shrink-0 text-emerald-300 animate-spin" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 bg-red-600/15 border border-red-500/20 text-red-400 p-2 text-[10px] rounded-lg font-medium flex items-center gap-1.5 animate-fade-in">
                <AlertCircle size={11} className="shrink-0 text-red-300" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!isRecharging ? (
              /* ================= MAIN GIFTING INTERFACE ================= */
              <div className="flex flex-col space-y-4 mt-3 overflow-y-auto max-h-[380px] pb-4">
                
                {/* User Current Balance Status */}
                <div className="bg-neutral-950/60 border border-neutral-800/80 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-amber-400 animate-pulse" />
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider block leading-none font-bold">
                        Wallet Balance
                      </span>
                      <span className="text-white font-black text-xs mt-1 block">
                        🪙 {currentUser?.coinsBalance || 0} Coins
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsRecharging(true)}
                    className="bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold py-1.5 px-3 rounded-full transition active:scale-95"
                  >
                    + Buy Coins
                  </button>
                </div>

                {/* Gifts Grid */}
                <div>
                  <span className="text-neutral-400 text-[9px] font-bold uppercase tracking-wider block mb-2">
                    Choose a Premium Gift
                  </span>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {gifts.map((g) => {
                      const isSelected = selectedGift?.id === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGift(g)}
                          className={`border rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 relative overflow-hidden ${
                            isSelected
                              ? 'bg-pink-500/10 border-pink-500 text-white shadow-lg shadow-pink-500/5'
                              : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                          }`}
                        >
                          <span className="text-2xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] select-none">
                            {g.icon}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-200">
                            {g.name}
                          </span>
                          <span className="text-[8px] font-mono text-amber-400 font-bold bg-neutral-950/80 px-1.5 py-0.5 rounded-full leading-none">
                            🪙 {g.cost}
                          </span>
                          
                          {/* Selection Check Circle */}
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-pink-500 text-white rounded-full p-0.5">
                              <Check size={6} className="stroke-[4px]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confirm Action Button */}
                <button
                  onClick={handleSendGift}
                  disabled={isSending || !selectedGift}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 text-white font-black text-xs py-3 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Gift size={13} />
                  <span>
                    {isSending
                      ? 'Sending...'
                      : `Send ${selectedGift?.name} (🪙 ${selectedGift?.cost} Coins)`}
                  </span>
                </button>
              </div>
            ) : (
              /* ================= COIN RECHARGE INTERFACE ================= */
              <div className="flex flex-col space-y-4 mt-3 overflow-y-auto max-h-[380px] pb-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold text-neutral-200">Recharge Coins Wallet</span>
                  <button
                    onClick={() => setIsRecharging(false)}
                    className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold"
                  >
                    ← Back
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {rechargePlans.map((plan) => (
                    <div
                      key={plan.coins}
                      onClick={() => handleRecharge(plan.coins)}
                      className="bg-neutral-950/60 border border-neutral-800/80 hover:border-indigo-500/50 hover:bg-indigo-500/5 p-3 rounded-xl flex flex-col justify-between gap-2.5 cursor-pointer relative transition active:scale-95 group overflow-hidden"
                    >
                      {plan.badge && (
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white font-sans text-[7px] font-extrabold px-1.5 py-0.5 rounded-bl-lg uppercase tracking-wide">
                          {plan.badge}
                        </div>
                      )}

                      <div>
                        <span className="text-[8px] text-neutral-500 uppercase tracking-wider block font-bold leading-none">
                          {plan.desc}
                        </span>
                        <span className="text-white font-black text-sm block mt-1 leading-none flex items-center gap-1">
                          🪙 {plan.coins} <span className="text-[10px] text-neutral-400 font-normal">Coins</span>
                        </span>
                      </div>

                      <div className="bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg text-center font-bold text-[10px] text-amber-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-colors">
                        Buy {plan.price}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[8px] text-neutral-500 leading-normal text-center bg-neutral-950/20 p-2 rounded-lg border border-neutral-800/30">
                  Transaction details: Payments are securely simulated for sandbox testing. Your coin wallet balance will reflect updates instantly on purchase.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

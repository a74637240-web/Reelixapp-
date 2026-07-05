import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Film, User, ShieldCheck, Sparkles, HelpCircle, Lock, Mail, AtSign, ArrowRight } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { getOrCreateFirestoreUser } from '../storageService';
import { User as UserType } from '../types';

interface LoginModalProps {
  onLoginSuccess: () => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);
  const [customAvatar, setCustomAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const defaultAvatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', // Developer Guy
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', // Lofi Synth Girl
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', // Skate Bro
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', // Fitness Girl
  ];

  const handleGuestSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      console.log('Attempting Firebase Anonymous Sign-In...');
      const userCredential = await signInAnonymously(auth);
      await getOrCreateFirestoreUser(userCredential.user, {
        username: `guest_${Math.floor(1000 + Math.random() * 9000)}`,
        avatar: defaultAvatars[0],
      });
      localStorage.setItem('reels_auth_mode', 'firebase');
      onLoginSuccess();
    } catch (err: any) {
      console.warn('Firebase Anonymous login failed or restricted. Falling back to secure local Guest Mode:', err);
      
      // Local fallback: create a local user and save to localStorage
      const randomId = `local_guest_${Math.floor(100000 + Math.random() * 900000)}`;
      const guestUser: UserType = {
        id: randomId,
        username: `guest_${Math.floor(1000 + Math.random() * 9000)}`,
        displayName: 'Guest Explorer',
        avatar: defaultAvatars[0],
        bio: 'Exploring short videos in offline/guest mode 🌟',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
        coinsBalance: 1000,
        earnedGifts: {},
      };
      
      // Save locally
      localStorage.setItem('reels_current_user', JSON.stringify(guestUser));
      localStorage.setItem('reels_auth_mode', 'local');
      
      // Ensure the user is present in local users list
      const localUsersJson = localStorage.getItem('reels_users');
      if (localUsersJson) {
        try {
          const users: UserType[] = JSON.parse(localUsersJson);
          if (!users.some(u => u.id === guestUser.id)) {
            users.push(guestUser);
            localStorage.setItem('reels_users', JSON.stringify(users));
          }
        } catch (e) {
          console.error(e);
        }
      }
      onLoginSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await getOrCreateFirestoreUser(userCredential.user);
      localStorage.setItem('reels_auth_mode', 'firebase');
      onLoginSuccess();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      let errorMsg = err.message || 'Google Sign-In failed';
      
      const isUnauthorizedDomain = err.code === 'auth/unauthorized-domain' || 
                                  (err.message && err.message.includes('unauthorized-domain'));
      
      if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'auth/operation-not-allowed';
      } else if (isUnauthorizedDomain) {
        console.warn('Unauthorized domain detected for Google Auth. Attempting guest sign-in fallback...');
        try {
          const guestCredential = await signInAnonymously(auth);
          await getOrCreateFirestoreUser(guestCredential.user, {
            username: `google_fallback_${Math.floor(1000 + Math.random() * 9000)}`,
            avatar: defaultAvatars[1],
          });
          localStorage.setItem('reels_auth_mode', 'firebase');
          onLoginSuccess();
          return;
        } catch (fallbackErr: any) {
          console.error('Anonymous fallback authentication also failed. Using pure local Guest login:', fallbackErr);
          // Local fallback
          const randomId = `local_google_${Math.floor(100000 + Math.random() * 900000)}`;
          const fallbackUser: UserType = {
            id: randomId,
            username: `google_guest_${Math.floor(1000 + Math.random() * 9000)}`,
            displayName: 'Google Guest',
            avatar: defaultAvatars[1],
            bio: 'Google Guest Fallback Mode 🌟',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            isFollowing: false,
            coinsBalance: 1000,
            earnedGifts: {},
          };
          localStorage.setItem('reels_current_user', JSON.stringify(fallbackUser));
          localStorage.setItem('reels_auth_mode', 'local');
          
          const localUsersJson = localStorage.getItem('reels_users');
          if (localUsersJson) {
            try {
              const users: UserType[] = JSON.parse(localUsersJson);
              if (!users.some(u => u.id === fallbackUser.id)) {
                users.push(fallbackUser);
                localStorage.setItem('reels_users', JSON.stringify(users));
              }
            } catch (e) {
              console.error(e);
            }
          }
          onLoginSuccess();
          return;
        }
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginOrSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignUp && !username.trim()) {
      setErrorMessage('Please choose a username');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (isSignUp) {
        // Sign Up with Email & Password
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const chosenAvatar = customAvatar.trim() || defaultAvatars[selectedAvatarIdx];
        
        // Save user details to Firestore
        await getOrCreateFirestoreUser(userCredential.user, {
          username: username.trim().toLowerCase().replace('@', '').replace(/\s+/g, '_'),
          avatar: chosenAvatar,
        });
      } else {
        // Log In with Email & Password
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await getOrCreateFirestoreUser(userCredential.user);
      }
      localStorage.setItem('reels_auth_mode', 'firebase');
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || 'An authentication error occurred';
      if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'auth/operation-not-allowed';
      } else if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        errorMsg = 'auth/unauthorized-domain';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This email address is already registered';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'Invalid email or password combination';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password must be at least 6 characters long';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address';
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col justify-center items-center p-6 text-white font-sans select-none overflow-y-auto">
      
      {/* Background ambient light orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main card box */}
      <div className="w-full max-w-[340px] space-y-5 text-center z-10 py-6">
        
        {/* Animated Icon logo */}
        <div className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 transform rotate-12 hover:rotate-0 transition duration-300">
            <Film size={22} className="text-white transform -rotate-12" />
          </div>
          <h1 className="text-base font-bold tracking-tight mt-2">Reels - Short Video</h1>
          <p className="text-[10px] text-neutral-400 max-w-[240px] mx-auto">
            Securely connected with real-time Firebase Authentication & Firestore.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800/60">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage('');
            }}
            className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              !isSignUp ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage('');
            }}
            className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              isSignUp ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Login/Signup form */}
        <form onSubmit={handleLoginOrSignUp} className="space-y-3.5 text-left">
          
          {/* Error Message Box / Config Guide */}
          {errorMessage && (
            errorMessage === 'auth/operation-not-allowed' ? (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-left text-[11px] text-amber-300 space-y-2 leading-relaxed animate-fade-in">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <HelpCircle size={15} />
                  <span>Firebase Setup Required / फ़ायरबेस सेटअप आवश्यक</span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  आपके Firebase प्रोजेक्ट में Email/Password authentication सक्रिय नहीं है। इसे चालू करने के लिए:
                </p>
                <div className="space-y-1 pl-2 text-neutral-400 font-mono text-[9px] list-decimal leading-relaxed">
                  <div>1. अपने <strong className="text-white">Firebase Console</strong> में जाएँ।</div>
                  <div>2. लेफ्ट मेन्यू में <strong className="text-white">Authentication</strong> पर क्लिक करें।</div>
                  <div>3. <strong className="text-white">Sign-in method</strong> टैब में जाएँ।</div>
                  <div>4. <strong className="text-white">Email/Password</strong> को इनेबल (सक्रिय) करें।</div>
                </div>
              </div>
            ) : errorMessage === 'auth/unauthorized-domain' ? (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-left text-[11px] text-amber-300 space-y-2 leading-relaxed animate-fade-in">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <HelpCircle size={15} />
                  <span>Authorized Domain Required / डोमेन अधिकृत करना आवश्यक</span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  यह डोमेन (<span className="text-amber-200 font-mono underline">{window.location.hostname}</span>) आपके फ़ायरबेस प्रोजेक्ट में अधिकृत (Authorized) नहीं है। इसे सक्रिय करने के लिए:
                </p>
                <div className="space-y-1.5 pl-2 text-neutral-400 font-mono text-[9px] list-decimal leading-relaxed">
                  <div>1. अपने <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-amber-200">Firebase Console</a> में जाएँ।</div>
                  <div>2. अपने प्रोजेक्ट <strong className="text-white">reelixapp-6ecfc</strong> को खोलें।</div>
                  <div>3. <strong className="text-white">Authentication</strong> &gt; <strong className="text-white">Settings</strong> में जाएँ।</div>
                  <div>4. <strong className="text-white">Authorized Domains</strong> के अंतर्गत <strong className="text-white">Add Domain</strong> पर क्लिक करें।</div>
                  <div>5. <strong className="text-white select-all bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">{window.location.hostname}</strong> डालकर सहेजें (Save)।</div>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-[10px] text-red-400 flex items-start gap-1.5 leading-snug animate-shake">
                <ShieldCheck size={14} className="text-red-400 shrink-0 transform rotate-180" />
                <span>{errorMessage}</span>
              </div>
            )
          )}

          {/* Email Input */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative flex items-center bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-800 focus-within:border-neutral-700 transition">
              <Mail size={12} className="text-neutral-500 mr-2 shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-transparent border-none outline-none text-[11px] text-white placeholder:text-neutral-600"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative flex items-center bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-800 focus-within:border-neutral-700 transition">
              <Lock size={12} className="text-neutral-500 mr-2 shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border-none outline-none text-[11px] text-white placeholder:text-neutral-600"
              />
            </div>
          </div>

          {/* Sign Up Exclusive Fields */}
          {isSignUp && (
            <>
              {/* Choose Username */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Choose Username
                </label>
                <div className="relative flex items-center bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-800 focus-within:border-neutral-700 transition">
                  <AtSign size={12} className="text-neutral-500 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    required={isSignUp}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. arun_rajput"
                    className="w-full bg-transparent border-none outline-none text-[11px] text-white placeholder:text-neutral-600"
                  />
                </div>
              </div>

              {/* Avatar Selector list */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Select Avatar Profile
                </label>
                <div className="flex gap-2.5 justify-between">
                  {defaultAvatars.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedAvatarIdx(idx);
                        setCustomAvatar('');
                      }}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition relative shrink-0 ${
                        selectedAvatarIdx === idx && !customAvatar
                          ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/10'
                          : 'border-transparent hover:border-neutral-800'
                      }`}
                    >
                      <img src={url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>

                {/* Custom Avatar input toggle */}
                <div className="pt-1">
                  <input
                    type="text"
                    value={customAvatar}
                    onChange={(e) => {
                      setCustomAvatar(e.target.value);
                      setSelectedAvatarIdx(-1);
                    }}
                    placeholder="Or paste custom avatar URL link..."
                    className="w-full bg-neutral-900 border border-neutral-800 outline-none text-[9px] text-white py-1.5 px-3 rounded-xl placeholder:text-neutral-600 focus:border-neutral-700 transition font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/15 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>{isSignUp ? 'Register & Launch' : 'Sign In & Launch'}</span>
            <ArrowRight size={12} className="stroke-[2.5px]" />
          </button>
        </form>

        {/* Divider with 'OR' */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-neutral-900"></div>
          <span className="flex-shrink mx-3 text-neutral-600 text-[8px] font-bold uppercase tracking-wider">Or Connect Via</span>
          <div className="flex-grow border-t border-neutral-900"></div>
        </div>

        {/* Social Sign In Buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleSignIn}
            className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 text-[10px] text-neutral-300 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google Sign-In</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGuestSignIn}
            className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 border border-dashed border-indigo-500/30 text-indigo-400 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer text-[10px]"
          >
            <Sparkles size={14} className="text-indigo-400 animate-pulse" />
            <span>Browse as Guest / बिना लॉग-इन देखें (Guest Mode)</span>
          </button>
        </div>

        {/* Info label */}
        <p className="text-[9px] text-neutral-500 max-w-[280px] mx-auto pt-2">
          Authorized safely. By using this, your profile, likes, comments, and direct messages will be persisted in the cloud database.
        </p>
      </div>
    </div>
  );
}

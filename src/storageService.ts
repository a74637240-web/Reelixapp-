import { User, Video, Comment, Message, Conversation, Story, UserStories } from './types';
import { INITIAL_USERS, INITIAL_VIDEOS, INITIAL_COMMENTS } from './data';
import { db, auth, storage } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  addDoc, 
  writeBatch,
  query,
  orderBy,
  where,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Localstorage key names (as fallback & local synchronous cache)
const KEYS = {
  USERS: 'reels_users',
  VIDEOS: 'reels_videos',
  COMMENTS: 'reels_comments',
  CURRENT_USER: 'reels_current_user',
  MESSAGES: 'reels_messages',
  STORIES: 'reels_stories',
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Seeding flag so we only seed once
let isSeeding = false;

// Global Firestore subscription list and state
let unsubscribes: (() => void)[] = [];
let isSyncing = false;

export function initStorage() {
  // Initialize localstorage defaults if not present (as instant fallback)
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(KEYS.VIDEOS)) {
    localStorage.setItem(KEYS.VIDEOS, JSON.stringify(INITIAL_VIDEOS));
  }
  if (!localStorage.getItem(KEYS.COMMENTS)) {
    localStorage.setItem(KEYS.COMMENTS, JSON.stringify(INITIAL_COMMENTS));
  }
}

export function startFirestoreSync() {
  if (isSyncing) return;
  isSyncing = true;

  // Clear any existing active listeners before creating new ones
  stopFirestoreSync();
  isSyncing = true;

  // Set up Firebase Real-Time Synchronization with robust error handlers
  // This syncs Firestore collections with localStorage in real-time,
  // then dispatches 'reels-data-updated' so components can reload.

  // 1. Sync Users
  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      if (snapshot.empty && !isSeeding) {
        seedInitialData();
        return;
      }
      const usersList: User[] = [];
      snapshot.forEach((d) => {
        usersList.push(d.data() as User);
      });
      localStorage.setItem(KEYS.USERS, JSON.stringify(usersList));
      
      // Also sync current user in case of updates
      const currentLocal = getCurrentUser();
      if (currentLocal && currentLocal.id) {
        const updatedSelf = usersList.find(u => u.id === currentLocal.id);
        if (updatedSelf) {
          localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(updatedSelf));
        }
      }

      window.dispatchEvent(new Event('reels-data-updated'));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    }
  );
  unsubscribes.push(unsubUsers);

  // 2. Sync Videos
  const unsubVideos = onSnapshot(
    collection(db, 'videos'),
    (snapshot) => {
      if (snapshot.empty && !isSeeding) {
        seedInitialData();
        return;
      }
      const videosList: Video[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        
        // Calculate dynamic like/save state for current user
        const currentUid = auth.currentUser?.uid || getCurrentUser()?.id || '';
        const likedBy = data.likedBy || [];
        const savedBy = data.savedBy || [];
        
        videosList.push({
          id: data.id,
          url: data.url,
          creator: data.creator,
          description: data.description,
          musicName: data.musicName,
          musicArtist: data.musicArtist,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          sharesCount: data.sharesCount || 0,
          viewsCount: data.viewsCount || 0,
          isLiked: likedBy.includes(currentUid),
          isSaved: savedBy.includes(currentUid),
          tags: data.tags || [],
          timestamp: data.timestamp || 'Just now',
          createdAt: data.createdAt || Date.now(),
        } as Video);
      });

      // Sort: newest first
      const sorted = videosList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      localStorage.setItem(KEYS.VIDEOS, JSON.stringify(sorted));
      window.dispatchEvent(new Event('reels-data-updated'));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'videos');
    }
  );
  unsubscribes.push(unsubVideos);

  // 3. Sync Comments
  const unsubComments = onSnapshot(
    collection(db, 'comments'),
    (snapshot) => {
      const commentsList: Comment[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const currentUid = auth.currentUser?.uid || getCurrentUser()?.id || '';
        const likedBy = data.likedBy || [];

        commentsList.push({
          id: data.id,
          videoId: data.videoId,
          userId: data.userId,
          username: data.username,
          userAvatar: data.userAvatar,
          text: data.text,
          timestamp: data.timestamp || 'Just now',
          likesCount: data.likesCount || 0,
          isLiked: likedBy.includes(currentUid),
          createdAt: data.createdAt || Date.now(),
        } as Comment);
      });
      localStorage.setItem(KEYS.COMMENTS, JSON.stringify(commentsList));
      window.dispatchEvent(new Event('reels-data-updated'));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'comments');
    }
  );
  unsubscribes.push(unsubComments);

  // 4. Sync Messages (Filtered by sender or receiver to respect security rules)
  const currentUid = auth.currentUser?.uid || getCurrentUser()?.id || '';
  if (currentUid) {
    const qSent = query(collection(db, 'messages'), where('senderId', '==', currentUid));
    const qReceived = query(collection(db, 'messages'), where('receiverId', '==', currentUid));

    const messagesMap = new Map<string, Message>();

    const updateMessages = () => {
      const messagesList = Array.from(messagesMap.values());
      const sorted = messagesList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify(sorted));
      window.dispatchEvent(new Event('reels-data-updated'));
    };

    const unsubSent = onSnapshot(
      qSent,
      (snapshot) => {
        snapshot.forEach((d) => {
          messagesMap.set(d.id, d.data() as Message);
        });
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            messagesMap.delete(change.doc.id);
          }
        });
        updateMessages();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'messages_sent');
      }
    );
    unsubscribes.push(unsubSent);

    const unsubReceived = onSnapshot(
      qReceived,
      (snapshot) => {
        snapshot.forEach((d) => {
          messagesMap.set(d.id, d.data() as Message);
        });
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            messagesMap.delete(change.doc.id);
          }
        });
        updateMessages();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'messages_received');
      }
    );
    unsubscribes.push(unsubReceived);
  }

  // 5. Sync Stories
  const unsubStories = onSnapshot(
    collection(db, 'stories'),
    (snapshot) => {
      const storiesList: Story[] = [];
      snapshot.forEach((d) => {
        storiesList.push(d.data() as Story);
      });
      localStorage.setItem(KEYS.STORIES, JSON.stringify(storiesList));
      window.dispatchEvent(new Event('reels-data-updated'));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'stories');
    }
  );
  unsubscribes.push(unsubStories);
}

export function stopFirestoreSync() {
  isSyncing = false;
  unsubscribes.forEach((unsub) => {
    try {
      unsub();
    } catch (e) {
      console.warn('Error unsubscribing from Firestore listener:', e);
    }
  });
  unsubscribes = [];
}

// Function to seed initial data in Firestore if empty
async function seedInitialData() {
  if (isSeeding) return;
  isSeeding = true;
  console.log('Seeding initial data into Firestore...');

  const activeUid = auth.currentUser?.uid || getCurrentUser()?.id || 'current_user_1';

  try {
    const batch = writeBatch(db);

    // Seed Users
    INITIAL_USERS.forEach((u) => {
      const docRef = doc(db, 'users', u.id);
      batch.set(docRef, {
        ...u,
        followingIds: INITIAL_USERS.filter(other => other.isFollowing).map(other => other.id),
      });
    });

    // Seed Videos
    INITIAL_VIDEOS.forEach((v, index) => {
      const docRef = doc(db, 'videos', v.id);
      batch.set(docRef, {
        id: v.id,
        url: v.url,
        creator: v.creator,
        description: v.description,
        musicName: v.musicName,
        musicArtist: v.musicArtist,
        likesCount: v.likesCount,
        commentsCount: v.commentsCount,
        sharesCount: v.sharesCount,
        viewsCount: v.viewsCount,
        tags: v.tags,
        timestamp: v.timestamp,
        createdAt: Date.now() - (index * 60 * 60 * 1000 * 24), // staggered days
        likedBy: v.isLiked ? [activeUid] : [],
        savedBy: v.isSaved ? [activeUid] : [],
      });
    });

    // Seed Comments
    INITIAL_COMMENTS.forEach((c) => {
      const docRef = doc(db, 'comments', c.id);
      batch.set(docRef, {
        id: c.id,
        videoId: c.videoId,
        userId: c.userId,
        username: c.username,
        userAvatar: c.userAvatar,
        text: c.text,
        timestamp: c.timestamp,
        likesCount: c.likesCount,
        likedBy: c.isLiked ? [activeUid] : [],
        createdAt: Date.now() - 3600000,
      });
    });

    // Seed Stories
    const defaultStories: Story[] = [
      {
        id: 'story_1',
        userId: 'user_1',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=600&auto=format&fit=crop&q=80',
        caption: 'Late night Shibuya glow 🌌 Shibuya Crossing is surreal at 2 AM!',
        createdAt: Date.now() - 3 * 60 * 60 * 1000,
        views: [],
      },
      {
        id: 'story_2',
        userId: 'user_1',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
        caption: 'Cyberpunk ramen run 🍜 Best hidden spot in Shinjuku!',
        createdAt: Date.now() - 1 * 60 * 60 * 1000,
        views: [],
      },
      {
        id: 'story_3',
        userId: 'user_2',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=600&auto=format&fit=crop&q=80',
        caption: 'Venice Beach session starting up! 🛹 Slide through',
        createdAt: Date.now() - 5 * 60 * 60 * 1000,
        views: [],
      },
    ];
    defaultStories.forEach((s) => {
      const docRef = doc(db, 'stories', s.id);
      batch.set(docRef, s);
    });

    // Seed initial welcome direct messages
    const welcomeMessages: Message[] = [
      {
        id: 'msg_init_1',
        senderId: 'user_1',
        receiverId: activeUid,
        text: "Hey! Love your Reels feed! Let's collaborate on a cyberpunk themed reel soon? 🌌",
        timestamp: 'Yesterday',
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
        isRead: false,
      },
      {
        id: 'msg_init_2',
        senderId: activeUid,
        receiverId: 'user_1',
        text: "Hey Sora! I'd love that! Your Tokyo nights style is absolute fire.",
        timestamp: 'Yesterday',
        createdAt: Date.now() - 23 * 60 * 60 * 1000,
        isRead: true,
      },
    ];
    welcomeMessages.forEach((m) => {
      const docRef = doc(db, 'messages', m.id);
      batch.set(docRef, m);
    });

    await batch.commit();
    console.log('Firestore seed completed successfully!');
  } catch (error) {
    console.error('Error seeding Firestore database:', error);
  } finally {
    isSeeding = false;
  }
}

// Get Lists (Synchronous read from real-time local cache)
export function getUsers(): User[] {
  initStorage();
  return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
}

export function getVideos(): Video[] {
  initStorage();
  return JSON.parse(localStorage.getItem(KEYS.VIDEOS) || '[]');
}

export function getComments(videoId: string): Comment[] {
  initStorage();
  const allComments: Comment[] = JSON.parse(localStorage.getItem(KEYS.COMMENTS) || '[]');
  return allComments
    .filter(c => c.videoId === videoId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getCurrentUser(): User {
  const local = localStorage.getItem(KEYS.CURRENT_USER);
  let user: User;
  if (local) {
    try {
      user = JSON.parse(local);
    } catch {
      user = {
        id: 'current_user_1',
        username: 'arun_rajput',
        displayName: 'Arun Rajput',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: 'Building the future of social media, one short video at a time 🚀✨ #developer #reels',
        followersCount: 1250,
        followingCount: 312,
        postsCount: 3,
        isFollowing: false,
      };
    }
  } else {
    user = {
      id: 'current_user_1',
      username: 'arun_rajput',
      displayName: 'Arun Rajput',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: 'Building the future of social media, one short video at a time 🚀✨ #developer #reels',
      followersCount: 1250,
      followingCount: 312,
      postsCount: 3,
      isFollowing: false,
    };
  }
  if (user.coinsBalance === undefined) user.coinsBalance = 1000;
  if (!user.earnedGifts) user.earnedGifts = {};
  return user;
}

// Saves local lists (also handles fallbacks)
export function saveUsers(users: User[]) {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function saveVideos(videos: Video[]) {
  localStorage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
}

export function saveComments(comments: Comment[]) {
  localStorage.setItem(KEYS.COMMENTS, JSON.stringify(comments));
}

export function saveCurrentUser(user: User) {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

// Actions (Direct Firestore Writes)

export async function toggleLikeVideo(videoId: string): Promise<Video | null> {
  const currentUid = auth.currentUser?.uid || getCurrentUser()?.id || 'current_user_1';
  const videos = getVideos();
  const index = videos.findIndex(v => v.id === videoId);
  if (index === -1) return null;

  const video = videos[index];
  try {
    const videoRef = doc(db, 'videos', videoId);
    const snap = await getDoc(videoRef);

    if (snap.exists()) {
      const data = snap.data();
      const likedBy: string[] = data.likedBy || [];
      const isLiked = likedBy.includes(currentUid);
      
      if (isLiked) {
        // Unlike
        const newLikedBy = likedBy.filter(id => id !== currentUid);
        await updateDoc(videoRef, {
          likedBy: newLikedBy,
          likesCount: Math.max(0, (data.likesCount || 1) - 1)
        });
        video.likesCount = Math.max(0, video.likesCount - 1);
        video.isLiked = false;
      } else {
        // Like
        await updateDoc(videoRef, {
          likedBy: arrayUnion(currentUid),
          likesCount: (data.likesCount || 0) + 1
        });
        video.likesCount += 1;
        video.isLiked = true;
      }
    }
  } catch (err) {
    console.warn('Firestore failed, falling back to local action:', err);
    // Local fallback toggle
    video.isLiked = !video.isLiked;
    video.likesCount = video.isLiked ? video.likesCount + 1 : Math.max(0, video.likesCount - 1);
  }

  // Save to local cache & trigger updates
  saveVideos(videos);
  window.dispatchEvent(new Event('reels-data-updated'));
  return video;
}

export async function toggleSaveVideo(videoId: string): Promise<Video | null> {
  const currentUid = auth.currentUser?.uid || getCurrentUser()?.id || 'current_user_1';
  const videos = getVideos();
  const index = videos.findIndex(v => v.id === videoId);
  if (index === -1) return null;

  const video = videos[index];
  try {
    const videoRef = doc(db, 'videos', videoId);
    const snap = await getDoc(videoRef);

    if (snap.exists()) {
      const data = snap.data();
      const savedBy: string[] = data.savedBy || [];
      const isSaved = savedBy.includes(currentUid);

      if (isSaved) {
        const newSavedBy = savedBy.filter(id => id !== currentUid);
        await updateDoc(videoRef, { savedBy: newSavedBy });
        video.isSaved = false;
      } else {
        await updateDoc(videoRef, { savedBy: arrayUnion(currentUid) });
        video.isSaved = true;
      }
    }
  } catch (err) {
    console.warn('Firestore failed, falling back to local action:', err);
    video.isSaved = !video.isSaved;
  }

  saveVideos(videos);
  window.dispatchEvent(new Event('reels-data-updated'));
  return video;
}

export async function addComment(videoId: string, text: string): Promise<Comment> {
  const currentUser = getCurrentUser();
  const commentId = `comment_${Date.now()}`;
  
  const newComment: Comment = {
    id: commentId,
    videoId,
    userId: currentUser.id,
    username: currentUser.username,
    userAvatar: currentUser.avatar,
    text,
    timestamp: 'Just now',
    likesCount: 0,
    isLiked: false,
    createdAt: Date.now(),
  };

  try {
    // Write to Firestore
    await setDoc(doc(db, 'comments', commentId), {
      ...newComment,
      likedBy: [],
    });

    // Increment video comment count
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, {
      commentsCount: increment(1),
    });
  } catch (err) {
    console.warn('Firestore failed, falling back to local action:', err);
  }

  // Update local cache
  const allComments: Comment[] = JSON.parse(localStorage.getItem(KEYS.COMMENTS) || '[]');
  allComments.push(newComment);
  saveComments(allComments);

  // Update video commentsCount in local list too
  const videos = getVideos();
  const vIdx = videos.findIndex(v => v.id === videoId);
  if (vIdx !== -1) {
    videos[vIdx].commentsCount = (videos[vIdx].commentsCount || 0) + 1;
    saveVideos(videos);
  }

  window.dispatchEvent(new Event('reels-data-updated'));
  return newComment;
}

export async function toggleLikeComment(commentId: string): Promise<Comment | null> {
  const currentUid = auth.currentUser?.uid || getCurrentUser()?.id || 'current_user_1';
  const allComments = JSON.parse(localStorage.getItem(KEYS.COMMENTS) || '[]');
  const index = allComments.findIndex((c: Comment) => c.id === commentId);
  if (index === -1) return null;

  const comment = allComments[index];
  try {
    const commentRef = doc(db, 'comments', commentId);
    const snap = await getDoc(commentRef);

    if (snap.exists()) {
      const data = snap.data();
      const likedBy: string[] = data.likedBy || [];
      const isLiked = likedBy.includes(currentUid);

      if (isLiked) {
        const newLikedBy = likedBy.filter(id => id !== currentUid);
        await updateDoc(commentRef, {
          likedBy: newLikedBy,
          likesCount: Math.max(0, (data.likesCount || 1) - 1)
        });
        comment.likesCount = Math.max(0, comment.likesCount - 1);
        comment.isLiked = false;
      } else {
        await updateDoc(commentRef, {
          likedBy: arrayUnion(currentUid),
          likesCount: (data.likesCount || 0) + 1
        });
        comment.likesCount += 1;
        comment.isLiked = true;
      }
    }
  } catch (err) {
    console.warn('Firestore failed, falling back to local action:', err);
    comment.isLiked = !comment.isLiked;
    comment.likesCount = comment.isLiked ? comment.likesCount + 1 : Math.max(0, comment.likesCount - 1);
  }

  saveComments(allComments);
  window.dispatchEvent(new Event('reels-data-updated'));
  return comment;
}

export async function toggleFollowUser(creatorId: string): Promise<User | null> {
  const currentUser = getCurrentUser();
  const localUsers = getUsers();
  const idx = localUsers.findIndex(u => u.id === creatorId);
  if (idx === -1) return null;

  const creatorData = localUsers[idx];
  const isFollowing = currentUser.followingIds?.includes(creatorId) || false;
  let updatedCreator: User;

  try {
    const creatorRef = doc(db, 'users', creatorId);
    const selfRef = doc(db, 'users', currentUser.id);

    const creatorSnap = await getDoc(creatorRef);
    const selfSnap = await getDoc(selfRef);

    if (creatorSnap.exists()) {
      const dbCreator = creatorSnap.data() as User;
      const selfData = selfSnap.exists() ? selfSnap.data() : null;
      const followingIds: string[] = selfData?.followingIds || [];

      const dbIsFollowing = followingIds.includes(creatorId);
      
      if (dbIsFollowing) {
        const newFollowing = followingIds.filter(id => id !== creatorId);
        await updateDoc(selfRef, { followingIds: newFollowing });
        
        const newFollowersCount = Math.max(0, (dbCreator.followersCount || 1) - 1);
        await updateDoc(creatorRef, { followersCount: newFollowersCount });
        
        updatedCreator = {
          ...dbCreator,
          followersCount: newFollowersCount,
          isFollowing: false,
        };
      } else {
        await updateDoc(selfRef, { followingIds: arrayUnion(creatorId) });
        
        const newFollowersCount = (dbCreator.followersCount || 0) + 1;
        await updateDoc(creatorRef, { followersCount: newFollowersCount });
        
        updatedCreator = {
          ...dbCreator,
          followersCount: newFollowersCount,
          isFollowing: true,
        };
      }

      const followingCountChange = dbIsFollowing ? -1 : 1;
      await updateDoc(selfRef, {
        followingCount: increment(followingCountChange),
      }).catch(() => {});
    } else {
      throw new Error("Creator does not exist in DB");
    }
  } catch (err) {
    console.warn('Firestore failed, falling back to local action:', err);
    
    // Local fallback follow
    const newFollowersCount = isFollowing 
      ? Math.max(0, (creatorData.followersCount || 1) - 1)
      : (creatorData.followersCount || 0) + 1;

    updatedCreator = {
      ...creatorData,
      followersCount: newFollowersCount,
      isFollowing: !isFollowing,
    };

    // Update current user's following list locally
    if (isFollowing) {
      currentUser.followingIds = (currentUser.followingIds || []).filter(id => id !== creatorId);
      currentUser.followingCount = Math.max(0, (currentUser.followingCount || 1) - 1);
    } else {
      currentUser.followingIds = [...(currentUser.followingIds || []), creatorId];
      currentUser.followingCount = (currentUser.followingCount || 0) + 1;
    }
    saveCurrentUser(currentUser);
  }

  // Update in local cache immediately
  localUsers[idx] = updatedCreator;
  saveUsers(localUsers);
  window.dispatchEvent(new Event('reels-data-updated'));

  return updatedCreator;
}

export async function uploadVideo(
  videoUrl: string,
  description: string,
  musicName: string,
  tags: string[],
  customAudioUrl?: string
): Promise<Video> {
  const currentUser = getCurrentUser();
  const videoId = `video_${Date.now()}`;

  let finalVideoUrl = videoUrl;
  let finalAudioUrl = '';

  // 1. Upload Video to Firebase Storage if it is a local Blob/data URL
  if (videoUrl.startsWith('blob:') || videoUrl.startsWith('data:')) {
    console.log('Uploading video file to Firebase Storage...');
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const storageRef = ref(storage, `videos/${Date.now()}_video.mp4`);
      await uploadBytes(storageRef, blob);
      finalVideoUrl = await getDownloadURL(storageRef);
      console.log('Video uploaded successfully. URL:', finalVideoUrl);
    } catch (e) {
      console.error('Error uploading video to storage:', e);
    }
  }

  // 2. Upload Custom MP3 to Firebase Storage if provided
  if (customAudioUrl && (customAudioUrl.startsWith('blob:') || customAudioUrl.startsWith('data:'))) {
    console.log('Uploading audio MP3 file to Firebase Storage...');
    try {
      const response = await fetch(customAudioUrl);
      const blob = await response.blob();
      const storageRef = ref(storage, `audio/${Date.now()}_audio.mp3`);
      await uploadBytes(storageRef, blob);
      finalAudioUrl = await getDownloadURL(storageRef);
      console.log('Audio uploaded successfully. URL:', finalAudioUrl);
    } catch (e) {
      console.error('Error uploading audio to storage:', e);
    }
  }

  const newVideo: Video = {
    id: videoId,
    url: finalVideoUrl,
    creator: currentUser,
    description,
    musicName: musicName || 'Original Audio',
    musicArtist: currentUser.displayName,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 1,
    isLiked: false,
    isSaved: false,
    tags,
    timestamp: 'Just now',
    createdAt: Date.now(),
  };

  try {
    // Write video document to Firestore
    await setDoc(doc(db, 'videos', videoId), {
      ...newVideo,
      likedBy: [],
      savedBy: [],
      musicUrl: finalAudioUrl, // link the uploaded audio if any
    });

    // Increment current user's postsCount
    const userRef = doc(db, 'users', currentUser.id);
    await updateDoc(userRef, {
      postsCount: increment(1)
    });
  } catch (err) {
    console.warn('Firestore failed, falling back to local action:', err);
  }

  // Save to local cache
  const videos = getVideos();
  saveVideos([newVideo, ...videos]);

  // Update current user's postsCount locally
  currentUser.postsCount = (currentUser.postsCount || 0) + 1;
  saveCurrentUser(currentUser);

  // Sync creator metadata locally across all users
  const localUsers = getUsers();
  const uIdx = localUsers.findIndex(u => u.id === currentUser.id);
  if (uIdx !== -1) {
    localUsers[uIdx].postsCount = currentUser.postsCount;
    saveUsers(localUsers);
  }

  window.dispatchEvent(new Event('reels-data-updated'));
  return newVideo;
}

export async function updateProfile(displayName: string, bio: string, avatarUrl?: string): Promise<User> {
  const currentUser = getCurrentUser();
  currentUser.displayName = displayName;
  currentUser.bio = bio;
  if (avatarUrl) {
    currentUser.avatar = avatarUrl;
  }

  try {
    // Write to Firestore
    const userRef = doc(db, 'users', currentUser.id);
    await updateDoc(userRef, {
      displayName,
      bio,
      ...(avatarUrl ? { avatar: avatarUrl } : {})
    });
  } catch (err) {
    console.warn('Firestore failed, falling back to local action:', err);
  }

  // Save locally
  saveCurrentUser(currentUser);

  const localUsers = getUsers();
  const uIdx = localUsers.findIndex(u => u.id === currentUser.id);
  if (uIdx !== -1) {
    localUsers[uIdx] = { ...localUsers[uIdx], displayName, bio, ...(avatarUrl ? { avatar: avatarUrl } : {}) };
    saveUsers(localUsers);
  }

  window.dispatchEvent(new Event('reels-data-updated'));
  return currentUser;
}

export async function handleUserLogin(username: string): Promise<User> {
  const cleanUsername = username.trim().toLowerCase().replace('@', '');
  const currentUser = getCurrentUser();
  currentUser.username = cleanUsername;
  
  // Update Firestore user document
  const userRef = doc(db, 'users', currentUser.id);
  await updateDoc(userRef, {
    username: cleanUsername,
  }).catch(() => {});

  saveCurrentUser(currentUser);
  return currentUser;
}

// Direct Messaging Operations
export function getMessages(): Message[] {
  initStorage();
  return JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
}

export function saveMessages(messages: Message[]) {
  localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));
}

export function getConversations(): Conversation[] {
  const messages = getMessages();
  const currentUser = getCurrentUser();
  const users = getUsers().filter(u => u.id !== currentUser.id);
  
  // Group messages by the other participant's ID
  const conversationGroups: { [userId: string]: Message[] } = {};
  
  messages.forEach(msg => {
    const otherId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
    if (!conversationGroups[otherId]) {
      conversationGroups[otherId] = [];
    }
    conversationGroups[otherId].push(msg);
  });
  
  // Create a conversation for each other user
  const conversations: Conversation[] = users.map(user => {
    const userMsgs = conversationGroups[user.id] || [];
    const sortedMsgs = [...userMsgs].sort((a, b) => b.createdAt - a.createdAt);
    const lastMessage = sortedMsgs[0];
    const unreadCount = userMsgs.filter(m => m.senderId === user.id && !m.isRead).length;
    
    const sortedIds = [currentUser.id, user.id].sort();
    const convoId = sortedIds.join('_');
    
    return {
      id: convoId,
      participants: [currentUser, user],
      lastMessage,
      unreadCount,
    };
  });
  
  // Sort conversations by the latest message's createdAt time (if exists), otherwise push to bottom
  return conversations
    .filter(c => c.lastMessage) // only conversations with messages
    .sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || 0;
      const timeB = b.lastMessage?.createdAt || 0;
      return timeB - timeA;
    });
}

export function sendDirectMessage(receiverId: string, text?: string, sharedVideoId?: string): Message {
  const currentUser = getCurrentUser();
  const now = new Date();
  const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const newMessage: Message = {
    id: messageId,
    senderId: currentUser.id,
    receiverId,
    text,
    sharedVideoId,
    timestamp,
    createdAt: Date.now(),
    isRead: false,
  };

  // Write directly to Firestore
  setDoc(doc(db, 'messages', messageId), newMessage)
    .catch((err) => console.error('Error writing message to Firestore:', err));

  // If sharing a video, increment sharesCount for that video inside Firestore
  if (sharedVideoId) {
    const videoRef = doc(db, 'videos', sharedVideoId);
    updateDoc(videoRef, {
      sharesCount: increment(1)
    }).catch(() => {});
  }
  
  return newMessage;
}

export function markMessagesAsRead(receiverId: string) {
  const currentUser = getCurrentUser();
  const messages = getMessages();
  const batch = writeBatch(db);
  let updated = false;
  
  messages.forEach(msg => {
    if (msg.senderId === receiverId && msg.receiverId === currentUser.id && !msg.isRead) {
      msg.isRead = true;
      updated = true;
      
      const docRef = doc(db, 'messages', msg.id);
      batch.update(docRef, { isRead: true });
    }
  });
  
  if (updated) {
    batch.commit().catch((err) => console.warn('Could not mark messages as read in Firestore:', err));
  }
}

// Temporary Story Operations
export function getStories(): Story[] {
  initStorage();
  const allStories: Story[] = JSON.parse(localStorage.getItem(KEYS.STORIES) || '[]');
  
  // Filter out stories older than 24 hours
  return allStories.filter(story => {
    const ageMs = Date.now() - story.createdAt;
    return ageMs < 24 * 60 * 60 * 1000;
  });
}

export function saveStories(stories: Story[]) {
  localStorage.setItem(KEYS.STORIES, JSON.stringify(stories));
}

export function getUserStories(): UserStories[] {
  const stories = getStories();
  const currentUser = getCurrentUser();
  const users = getUsers();
  const allUsers = [currentUser, ...users];

  // Group active stories by user id
  const groupedStories: { [userId: string]: Story[] } = {};
  stories.forEach(story => {
    if (!groupedStories[story.userId]) {
      groupedStories[story.userId] = [];
    }
    groupedStories[story.userId].push(story);
  });

  const result: UserStories[] = [];
  
  allUsers.forEach(user => {
    const userActiveStories = groupedStories[user.id] || [];
    if (userActiveStories.length > 0) {
      const sortedStories = [...userActiveStories].sort((a, b) => a.createdAt - b.createdAt);
      
      const hasUnread = user.id === currentUser.id 
        ? false 
        : sortedStories.some(s => !s.views?.includes(currentUser.id));

      result.push({
        userId: user.id,
        user,
        stories: sortedStories,
        hasUnread,
      });
    }
  });

  return result.sort((a, b) => {
    if (a.userId === currentUser.id) return -1;
    if (b.userId === currentUser.id) return 1;
    
    if (a.hasUnread && !b.hasUnread) return -1;
    if (!a.hasUnread && b.hasUnread) return 1;

    return 0;
  });
}

export function addStory(mediaType: 'image' | 'video', mediaUrl: string, caption?: string): Story {
  const currentUser = getCurrentUser();
  const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const newStory: Story = {
    id: storyId,
    userId: currentUser.id,
    mediaType,
    mediaUrl,
    caption,
    createdAt: Date.now(),
    views: [],
  };

  // Write directly to Firestore
  setDoc(doc(db, 'stories', storyId), newStory)
    .catch((err) => console.error('Error writing story to Firestore:', err));

  return newStory;
}

export function markStoryAsViewed(storyId: string) {
  const currentUser = getCurrentUser();
  const storyRef = doc(db, 'stories', storyId);

  updateDoc(storyRef, {
    views: arrayUnion(currentUser.id)
  }).catch((err) => console.warn('Could not mark story viewed in Firestore:', err));
}

export async function deleteStory(storyId: string): Promise<boolean> {
  try {
    const storyRef = doc(db, 'stories', storyId);
    await deleteDoc(storyRef);
    
    // Also update local cache
    const stories = getStories();
    const updated = stories.filter(s => s.id !== storyId);
    saveStories(updated);
    
    window.dispatchEvent(new Event('reels-data-updated'));
    return true;
  } catch (err) {
    console.error('Error deleting story from Firestore:', err);
    return false;
  }
}

export async function rechargeWallet(coinsCount: number): Promise<User> {
  const currentUser = getCurrentUser();
  const currentBalance = currentUser.coinsBalance || 0;
  const newBalance = currentBalance + coinsCount;
  currentUser.coinsBalance = newBalance;
  
  // Save locally
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(currentUser));
  
  // Update in users list cache
  const users = getUsers();
  const updatedUsers = users.map(u => u.id === currentUser.id ? currentUser : u);
  localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
  
  // Update in Firestore
  try {
    const userRef = doc(db, 'users', currentUser.id);
    await updateDoc(userRef, {
      coinsBalance: newBalance
    });
  } catch (err) {
    console.error('Error updating wallet balance in Firestore:', err);
  }
  
  window.dispatchEvent(new Event('reels-data-updated'));
  return currentUser;
}

export async function sendGiftToCreator(
  recipientId: string, 
  giftType: string, 
  cost: number
): Promise<{ success: boolean; sender: User; recipient?: User; error?: string }> {
  const currentUser = getCurrentUser();
  const currentBalance = currentUser.coinsBalance || 0;
  
  if (currentBalance < cost) {
    return { success: false, sender: currentUser, error: 'Insufficient balance! Please recharge.' };
  }
  
  // 1. Deduct from sender
  const newSenderBalance = currentBalance - cost;
  currentUser.coinsBalance = newSenderBalance;
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(currentUser));
  
  // 2. Add to recipient
  const users = getUsers();
  let recipient = users.find(u => u.id === recipientId);
  if (!recipient) {
    // Check if recipient is current user themselves (just in case, though they shouldn't send to themselves)
    if (recipientId === currentUser.id) {
      return { success: false, sender: currentUser, error: 'You cannot send a gift to yourself!' };
    }
  }
  
  // If recipient exists, update their record
  const recipientGifts = recipient?.earnedGifts || {};
  const newGiftCount = (recipientGifts[giftType] || 0) + 1;
  const updatedGifts = {
    ...recipientGifts,
    [giftType]: newGiftCount
  };
  
  // Earned coins for the recipient is same as cost
  const recipientBalance = recipient?.coinsBalance || 0;
  const newRecipientBalance = recipientBalance + cost;
  
  if (recipient) {
    recipient.earnedGifts = updatedGifts;
    recipient.coinsBalance = newRecipientBalance;
  }
  
  // Update local cache of all users
  const updatedUsers = users.map(u => {
    if (u.id === currentUser.id) return currentUser;
    if (u.id === recipientId && recipient) return recipient;
    return u;
  });
  localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
  
  // 3. Write updates to Firestore
  try {
    const batch = writeBatch(db);
    
    // Sender doc
    const senderRef = doc(db, 'users', currentUser.id);
    batch.update(senderRef, {
      coinsBalance: newSenderBalance
    });
    
    // Recipient doc
    const recipientRef = doc(db, 'users', recipientId);
    batch.update(recipientRef, {
      earnedGifts: updatedGifts,
      coinsBalance: newRecipientBalance
    });
    
    await batch.commit();
  } catch (err) {
    console.error('Error committing gift transaction to Firestore:', err);
    // Even if Firestore fails, local changes are set for visual feedback
  }
  
  window.dispatchEvent(new Event('reels-data-updated'));
  return { success: true, sender: currentUser, recipient };
}

// Create or fetch Firestore user for a signed-in Firebase Auth User
export async function getOrCreateFirestoreUser(firebaseUser: any, customData?: { username?: string; avatar?: string }): Promise<User> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const userData = snap.data() as User;
    // Update localstorage cache
    saveCurrentUser(userData);
    return userData;
  } else {
    // Create new user profile document
    const emailPrefix = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'user';
    const finalUsername = customData?.username || `${emailPrefix}_${Math.floor(1000 + Math.random() * 9000)}`;
    const finalAvatar = customData?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const newUser: User = {
      id: firebaseUser.uid,
      username: finalUsername.toLowerCase().replace(/\s+/g, '_'),
      displayName: firebaseUser.displayName || finalUsername,
      avatar: finalAvatar,
      bio: 'Creating short loops and amazing video experiences 🎬✨ #contentcreator #reels',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isFollowing: false,
      coinsBalance: 1000,
      earnedGifts: {},
    };

    await setDoc(userRef, {
      ...newUser,
      followingIds: [],
    });

    saveCurrentUser(newUser);
    return newUser;
  }
}

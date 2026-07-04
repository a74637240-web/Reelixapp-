export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isVerified?: boolean;
  followingIds?: string[];
  coinsBalance?: number;
  earnedGifts?: Record<string, number>;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  likesCount: number;
  isLiked: boolean;
  createdAt?: number;
}

export interface Video {
  id: string;
  url: string;
  creator: User;
  description: string;
  musicName: string;
  musicArtist: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  tags: string[];
  timestamp: string;
  aspectRatio?: 'vertical' | 'square';
  createdAt?: number;
}

export type FeedTab = 'for-you' | 'following';
export type AppTab = 'home' | 'search' | 'upload' | 'profile' | 'notifications' | 'chat';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  sharedVideoId?: string; // For shared reels
  timestamp: string; // "10:30 AM" or similar
  createdAt: number; // epoch milliseconds
  isRead: boolean;
}

export interface Conversation {
  id: string; // Participant composite key (e.g. sorted "user1_user2")
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface Story {
  id: string;
  userId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  createdAt: number; // epoch ms (expires in 24 hours)
  views: string[]; // user ids who saw it
}

export interface UserStories {
  userId: string;
  user: User;
  stories: Story[];
  hasUnread: boolean;
}


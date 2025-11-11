import { Timestamp } from "firebase/firestore";
import { Dispatch, SetStateAction } from "react";

export interface UserProps {
  uid: string;
  photoURL?: string;
  username: string;
  fullName?: string;
  email?: string;
  bio?: string;
  coverURL?: string;
  location?: string;
  website?: string;
  followingCount?: number;
  followersCount?: number;
  friendsCount?: number;
  postsCount?: number;
  createdAt?: Date | null;
  online?: boolean;
  lastSeen?: Date | Timestamp | null;
  completedProfile?: boolean;
  phoneNumber?: string;
  gender?: "male" | "female";
  dob?: string;
  education?: string;
  company?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  work?: string;
  instagram?: string;
  relationship?: string;
  country?: string;
  fullName_lowercase?: string;
}

export interface CommentProps {
  id: number;
  body: string;
  postId: number;
  likes: number;
  photoURL?: string;
  userId: string;
}

export interface ReactionProps {
  likes: number;
  dislikes: number;
  views: number;
}

export interface PostProps {
  id: string;
  userId: string;
  username?: string;
  content: string;
  reactions?: ReactionProps;
  views?: number;
  likes?: number;
  comments?: CommentProps[];
  userPhotoURL?: string;
  userFullName?: string;
  media?: MediaProps[];
  parentPostId?: string;
  createdAt: Date;
  isPinned?: boolean;
  quotePostId?: string | null;
  linkPreview: LinkPreviewType;
  replyCount?: number;
  quoteCount?: number;
  __optimistic?: boolean;
  engagementScore?: number;
  content_lowercase?: string;
}

export interface EmojiProps {
  native: string;
}

export interface MediaProps {
  src: string;
  type: "image" | "video";
  file?: File;
}

export interface ButtonsProps {
  setText: Dispatch<SetStateAction<string>>;
  setMedia: Dispatch<SetStateAction<MediaProps[]>>;
  setGifDialogOpen: Dispatch<SetStateAction<boolean>>;
  gifDialogOpen: boolean;
  media: MediaProps[];
}

export type NotificationType =
  | "follow"
  | "friendRequest"
  | "reply"
  | "mention"
  | "like"
  | "comment"
  | "acceptRequest"
  | "quote"
  | "dislike";

export type ReactionType = "like" | "dislike";

export interface NotificationInput {
  recipientUid: string;
  actorUid: string;
  type: NotificationType;
  postId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: Record<string, any>;
}

export type LinkPreviewType =
  | {
      url: string;
      title: string;
      description: string;
      image: string;
    }
  | {
      url?: never;
      title?: never;
      description?: never;
      image?: never;
    };

export interface Notification {
  id: string;
  actorUid: string;
  recipientUid: string;
  postId?: string;
  quotePostId?: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  extra?: Record<string, unknown>;
  actor: UserProps;
  timeAgo: string;
  url: string;
  message: string;
}

export interface MessageProps {
  id: string;
  senderId: string;
  media: MediaProps;
  text: string;
  createdAt: Timestamp;
  reactions: Record<string, string[]>;
  hiddenFor: string[];
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  };
  isPinned?: boolean;
}

export interface DraftMessage {
  text: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  };
}

export interface ConversationProps {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSender?: string;
}

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ViewerRole = "self" | "friend" | "public";

export interface OptimisticCallbacks {
  addOptimisticPost?: (partialPost: Partial<PostProps>) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replaceOptimisticPost?: (tempId: string, serverPost: any) => void;
  removeOptimisticPost?: (tempId: string) => void;
}

// system designs and architecture
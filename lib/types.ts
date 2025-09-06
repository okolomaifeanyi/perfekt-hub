import { Dispatch, SetStateAction } from "react";

export interface UserProps {
  uid: string;
  photoURL?: string;
  username: string;
  fullName?: string;
  email?: string;
  bio?: string;
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
  createdAt: string;
  isPinned?: boolean;
  quotePostId?: string | null;
  linkPreview: LinkPreviewType;
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
  | "like"
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

export type LinkPreviewType = {
  url: string;
  title: string;
  description: string;
  image: string;
} | null;



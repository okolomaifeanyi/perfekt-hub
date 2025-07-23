import { Dispatch, SetStateAction } from "react";

export interface UserProps {
  uid: string;
  photoURL?: string;
  username: string;
  fullName?: string;
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
  username: string;
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

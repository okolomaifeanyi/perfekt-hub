import { Dispatch, SetStateAction } from "react";

export interface UserProps {
  id: number;
  firstName: string;
  lastName: string;
  image: string;
  username: string;
}

export interface ReactionProps {
  likes: number;
  dislikes: number;
  views: number;
}

export interface PostProps {
  id: number;
  userId: number;
  title: string;
  body: string;
  tags: string[];
  user?: UserProps;
  reactions?: ReactionProps;
  views: number;
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
}

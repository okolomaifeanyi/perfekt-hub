import { create } from "zustand";

type ReactionState = {
  liked: boolean;
  disliked: boolean;
  commented: boolean;
  quoted: boolean;
  viewed: boolean;
  shared: boolean;
};

type PostCountData = {
  replyCount: number;
  quoteCount: number;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  shareCount: number;
  userReaction: ReactionState;
};

type PostCounts = {
  [postId: string]: PostCountData;
};

type State = {
  counts: PostCounts;
  setCounts: (postId: string, data: Partial<PostCountData>) => void;
};

// ✅ helper for defaults
const defaultReaction: ReactionState = {
  liked: false,
  disliked: false,
  commented: false,
  quoted: false,
  viewed: false,
  shared: false,
};

export const usePostCounts = create<State>(set => ({
  counts: {},
  setCounts: (postId, data) =>
    set(state => {
      const prev = state.counts[postId];
      return {
        counts: {
          ...state.counts,
          [postId]: {
            replyCount: data.replyCount ?? prev?.replyCount ?? 0,
            quoteCount: data.quoteCount ?? prev?.quoteCount ?? 0,
            likeCount: data.likeCount ?? prev?.likeCount ?? 0,
            dislikeCount: data.dislikeCount ?? prev?.dislikeCount ?? 0,
            viewCount: data.viewCount ?? prev?.viewCount ?? 0,
            shareCount: data.shareCount ?? prev?.shareCount ?? 0,
            userReaction: {
              ...defaultReaction,
              ...prev?.userReaction,
              ...data.userReaction,
            },
          },
        },
      };
    }),
}));

import { create } from "zustand";

type ReactionState = {
  liked: boolean;
  disliked: boolean;
  replied: boolean;
  quoted: boolean;
  viewed: boolean;
};

type PostCountData = {
  replyCount: number;
  quoteCount: number;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  userReaction: ReactionState;
};

type PostCounts = Record<string, PostCountData>;

type State = {
  counts: PostCounts;
  setCounts: (postId: string, data: Partial<PostCountData>) => void;
  resetCounts: (postId: string) => void;
};

// ✅ default reaction flags
const defaultReaction: ReactionState = {
  liked: false,
  disliked: false,
  replied: false,
  quoted: false,
  viewed: false,
};

// ✅ default post counts
const defaultCounts: PostCountData = {
  replyCount: 0,
  quoteCount: 0,
  likeCount: 0,
  dislikeCount: 0,
  viewCount: 0,
  userReaction: defaultReaction,
};

export const usePostCounts = create<State>(set => ({
  counts: {},
  setCounts: (postId, data) =>
    set(state => {
      const prev = state.counts[postId] ?? defaultCounts;
      return {
        counts: {
          ...state.counts,
          [postId]: {
            ...prev,
            ...data,
            userReaction: {
              ...defaultReaction,
              ...prev.userReaction,
              ...data.userReaction,
            },
          },
        },
      };
    }),
  resetCounts: postId =>
    set(state => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [postId]: _, ...rest } = state.counts;
      return { counts: rest };
    }),
}));
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
  userReaction?: ReactionState;
};

type PostCounts = {
  [postId: string]: PostCountData;
};

type State = {
  counts: PostCounts;
  setCounts: (postId: string, data: Partial<PostCountData>) => void;
};

export const usePostCounts = create<State>(set => ({
  counts: {},
  setCounts: (postId, data) =>
    set(state => ({
      counts: {
        ...state.counts,
        [postId]: {
          replyCount: data.replyCount ?? state.counts[postId]?.replyCount ?? 0,
          quoteCount: data.quoteCount ?? state.counts[postId]?.quoteCount ?? 0,
          likeCount: data.likeCount ?? state.counts[postId]?.likeCount ?? 0,
          dislikeCount:
            data.dislikeCount ?? state.counts[postId]?.dislikeCount ?? 0,
          viewCount: data.viewCount ?? state.counts[postId]?.viewCount ?? 0,
          shareCount: data.shareCount ?? state.counts[postId]?.shareCount ?? 0,
          userReaction: data.userReaction ??
            state.counts[postId]?.userReaction ?? {
              liked: false,
              disliked: false,
              commented: false,
              quoted: false,
              viewed: false,
              shared: false,
            },
        },
      },
    })),
}));

import PostCard from '@/app/(dashboard)/[username]/[postId]/components/PostCard';
import { List } from '@/components/Typography';
import { PostProps } from '@/lib/types';

import React from 'react'
import { ScrollPosition } from 'react-lazy-load-image-component';

const Posts = ({ posts, scrollPosition }: {posts: PostProps[], scrollPosition?: ScrollPosition}) => {
  return (
    <List className="space-y-4 list-none !m-0 !p-0">
      {posts.map(post => {
        return (
          <li key={post.id}>
            <PostCard post={post} scrollPosition={scrollPosition} />
          </li>
        );
      })}
    </List>
  );
};

export default Posts
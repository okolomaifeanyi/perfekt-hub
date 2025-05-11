import { Muted } from '@/components/Typography';
import { UserProps } from '@/lib/types';
import React from 'react'

const Name = ({user}: {user: UserProps}) => {
  return (
    <div className="flex flex-col space-y-1 !text-xs">
      <strong className="!mt-0 truncate">
        {user?.firstName} {user?.lastName}
      </strong>

      <Muted className="text-xs truncate">@{user?.username}</Muted>
    </div>
  );
}

export default Name
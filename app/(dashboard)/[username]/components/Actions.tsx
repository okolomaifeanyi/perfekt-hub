"use client";

import { ChatBubbleOvalLeftIcon } from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/solid"; // spinner replacement
import EditProfile from "./EditProfile";
import { Button } from "@/components/ui/button";
import ConnectDropdown from "@/components/Connect";
import { useDirectMessage } from "@/hooks/useDirectMessage";
import { UserProps } from "@/lib/types";
import { useState } from "react";

const Actions = ({ isMe, profile }: { isMe: boolean; profile: UserProps }) => {
  const { startDM, loading: dmLoading } = useDirectMessage();
  const [openEdit, setOpenEdit] = useState(false);

  return (
    <div className="flex items-center mt-12 gap-2">
      {isMe ? (
        <EditProfile
          openEdit={openEdit}
          setOpenEdit={setOpenEdit}
          profile={profile}
        />
      ) : (
        <>
          <Button
            size="sm"
            onClick={() => startDM(profile?.uid)}
            disabled={dmLoading}
          >
            {dmLoading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ChatBubbleOvalLeftIcon className="h-4 w-4" />
            )}
            Message
          </Button>

          <ConnectDropdown targetUid={profile.uid} />
        </>
      )}
    </div>
  );
};

export default Actions;

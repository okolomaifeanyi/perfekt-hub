import { ArrowPathIcon, EnvelopeIcon } from "@heroicons/react/24/solid";
import ConnectDropdown from "./Connect";
import JustAvatar from "./JustAvatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Button } from "./ui/button";
import { useDirectMessage } from "@/hooks/useDirectMessage";
import { useUserStore } from "@/lib/store/useUserStore";
import { UserProps } from "@/lib/types";
import { ReactNode } from "react";

const UserCard = ({
  user,
  children,
}: {
  user?: UserProps | null;
  children: ReactNode;
}) => {
  const { startDM, loading: dmLoading } = useDirectMessage();
  const currentUser = useUserStore(state => state.user);

  const isMe = user?.uid === currentUser?.uid;
  const displayName = user?.fullName || "User";
  const displayUsername = user?.username || "user";
  const displayBio = user?.bio || "";

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-64 sm:w-72 ">
        <div className="flex flex-col space-y-2">
          {/* Header: Avatar + Actions */}
          <div className="flex justify-between">
            <JustAvatar
              fullName={user?.fullName}
              photoURL={user?.photoURL}
              username={displayUsername}
            />

            <div className="flex space-x-2">
              {user && !isMe && (
                <Button
                  size="sm"
                  onClick={() => startDM(user?.uid)}
                  disabled={dmLoading}
                  variant="secondary"
                  title="Send Direct Message"
                >
                  {dmLoading ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <EnvelopeIcon className="w-4 h-4 text-primary" />
                  )}
                </Button>
              )}

              {user && !isMe && <ConnectDropdown targetUid={user?.uid} />}
            </div>
          </div>

          {/* Name + username */}
          <div className="space-y-1 mb-4">
            <h4 className="text-sm font-semibold">{displayName}</h4>
            <p className="text-xs text-muted-foreground">@{displayUsername}</p>
          </div>

          {/* Body */}
          <div className="pt-1 border-t space-y-3">
            {displayBio && (
              <p className="text-sm">
                {displayBio.length > 100
                  ? displayBio.slice(0, 100) + "..."
                  : displayBio}
              </p>
            )}

            <div className="flex space-x-2 text-xs text-muted-foreground">
              <span>
                <strong className="text-white">
                  {user?.followersCount ?? 0}
                </strong>{" "}
                Followers
              </span>

              <span>
                <strong className="text-white">
                  {user?.followingCount ?? 0}
                </strong>{" "}
                Following
              </span>

              <span>
                <strong className="text-white">
                  {user?.friendsCount ?? 0}
                </strong>{" "}
                Friends
              </span>
            </div>

            {/* {user && (
              <div className="text-muted-foreground text-xs">
                Joined{" "}
                <strong className="text-white">
                  {user?.createdAt?.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </div>
            )} */}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default UserCard;

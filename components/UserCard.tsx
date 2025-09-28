import { ArrowPathIcon, EnvelopeIcon } from "@heroicons/react/24/solid";
import ConnectDropdown from "./Connect";
import JustAvatar from "./JustAvatar";
import { HoverCardContent } from "./ui/hover-card";
import { Button } from "./ui/button";
import { useDirectMessage } from "@/hooks/useDirectMessage";
import { useUserStore } from "@/lib/store/useUserStore";
import { UserProps } from "@/lib/types";

const UserCard = ({
  fullName,
  username,
  followerCount,
  followingCount,
  friendsCount,
  bio,
  createdAt,
  photoURL,
  uid,
  user,
}: {
  fullName?: string;
  username?: string;
  followerCount?: number;
  followingCount?: number;
  friendsCount?: number;
  bio?: string;
  createdAt?: Date | null;
  photoURL?: string;
  uid?: string;
  user?: UserProps;
}) => {
  const { startDM, loading: dmLoading } = useDirectMessage();
  const currentUser = useUserStore(state => state.user);

  const isMe = uid === currentUser?.uid;
  const displayName = user?.fullName || fullName || username || "User";
  const displayUsername = user?.username || username || "user";
  const displayBio = user?.bio || bio || "";

  return (
    <HoverCardContent className="w-64 sm:w-72">
      <div className="flex flex-col space-y-2">
        {/* Header: Avatar + Actions */}
        <div className="flex justify-between">
          <JustAvatar
            fullName={user?.fullName || fullName}
            photoURL={user?.photoURL || photoURL}
            username={displayUsername}
          />

          <div className="flex space-x-2">
            {uid && !isMe && (
              <Button
                size="sm"
                onClick={() => startDM(user?.uid || uid)}
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

            {uid && !isMe && <ConnectDropdown targetUid={user?.uid || uid} />}
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
              <strong className="text-white">{user?.followersCount ?? followerCount ?? 0}</strong>{" "}
              Followers
            </span>

            <span>
              <strong className="text-white">{user?.followingCount ?? followingCount ?? 0}</strong>{" "}
              Following
            </span>

            <span>
              <strong className="text-white">{user?.friendsCount ?? friendsCount ?? 0}</strong>{" "}
              Friends
            </span>
          </div>

          {createdAt && (
            <div className="text-muted-foreground text-xs">
              Joined{" "}
              <strong className="text-white">
                {createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </div>
          )}
        </div>
      </div>
    </HoverCardContent>
  );
};

export default UserCard;

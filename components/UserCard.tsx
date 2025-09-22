import { ArrowPathIcon, EnvelopeIcon } from "@heroicons/react/24/solid";
import ConnectDropdown from "./Connect";
import JustAvatar from "./JustAvatar";
import { HoverCardContent } from "./ui/hover-card";
import { Button } from "./ui/button";
import { useDirectMessage } from "@/hooks/useDirectMessage";
import { useUserStore } from "@/lib/store/useUserStore";

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
}: {
    fullName?: string; username?: string; followerCount?: number;
    followingCount?: number; friendsCount?: number; bio?: string; createdAt?: Date | null;
    photoURL?: string; uid?: string;
}) => {
    const { startDM, loading: dmLoading } = useDirectMessage();

    const currentUser = useUserStore(state => state.user);

    const isMe = uid === currentUser?.uid;

  return (
    <HoverCardContent className="w-64 sm:w-72">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between">
          <JustAvatar
            fullName={fullName}
            photoURL={photoURL}
            username={username}
          />

          <div className="flex space-x-2">
            {uid && !isMe && (
              <Button
                size="sm"
                onClick={() => startDM(uid)}
                disabled={dmLoading}
                variant="secondary"
                title="Send Direct Message"
              >
                {dmLoading ? (
                  <ArrowPathIcon className="animate-spin" />
                ) : (
                  <EnvelopeIcon className="text-primary" />
                )}
              </Button>
            )}

            {uid && !isMe && (
              <ConnectDropdown targetUid={uid} />
            )}
          </div>
        </div>
        <div className="space-y-1 mb-4">
          <h4 className="text-sm font-semibold">
            {fullName || username || "User"}
          </h4>
          <p className="text-xs text-muted-foreground">@{username || "user"}</p>
        </div>
        <div className="pt-1 border-t space-y-3">
          {bio && (
            <p className="text-sm">
              <strong>
                {bio.length > 100 ? bio.slice(0, 100) + "..." : bio}
              </strong>
            </p>
          )}

          <div className="flex space-x-2 text-xs text-muted-foreground">
            <span>
              <strong className="text-white">{followerCount}</strong> Followers
            </span>

            <span>
              <strong className="text-white">{followingCount}</strong>{" "}
              Followings
            </span>

            <span>
              <strong className="text-white">{friendsCount}</strong> Friends
            </span>
          </div>

          {createdAt && (
            <div className="text-muted-foreground text-xs">
              Joined{" "}
              <strong className="text-white">
                {createdAt?.toLocaleDateString("en-UK", {
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

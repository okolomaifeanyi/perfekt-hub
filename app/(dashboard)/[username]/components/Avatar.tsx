import JustAvatar from "@/components/JustAvatar";
import { UserProps } from "@/lib/types";
import { MapPin, LinkIcon } from "lucide-react";
const Avatar = ({ profile }: { profile: UserProps }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-fit rounded-full ring-2 ring-background overflow-hidden">
        {/* <Image
          src={profile.photoURL || altImage}
          alt={profile.username}
          fill
          sizes="128px"
          className="object-cover"
        /> */}
        <JustAvatar size={70} user={profile} />
      </div>
      <div className="space-y-3">
        <header className="space-y-0.5">
          <h1 className="text-xl font-bold leading-tight">
            {profile.fullName || profile.username}
          </h1>

          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </header>

        <div className="flex flex-wrap gap-2 items-center">
          {profile.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </p>
          )}

          {profile.website && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3.5 w-3.5" />
              <a
                href={profile.website}
                target="_blank"
                className="underline truncate max-w-[240px]"
              >
                {profile.website}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Avatar;

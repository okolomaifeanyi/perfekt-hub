import { UserProps } from "@/lib/types";
import { Mail, MapPin, LinkIcon } from "lucide-react";

export function AboutBlock({ profile }: { profile: UserProps }) {
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4" /> <span>@{profile.username}</span>
      </div>
      {profile.location && (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> <span>{profile.location}</span>
        </div>
      )}
      {profile.website && (
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />{" "}
          <a href={profile.website} target="_blank" className="underline">
            {profile.website}
          </a>
        </div>
      )}
      {/* Joined date */}
      {profile.createdAt && (
        <div className="text-xs text-muted-foreground mt-2">
          Joined {profile.createdAt.toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

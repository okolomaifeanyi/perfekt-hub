import { UserProps } from "@/lib/types";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

function ensureProtocol(url: string) {
  const t = url.trim();
  // if it already starts with a scheme (http:, https:, ftp:, mailto: etc.) keep it
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(t)) return t;
  return `https://${t}`;
}

function prettyDisplay(url: string) {
  try {
    const href = ensureProtocol(url);
    const u = new URL(href);
    // show host and path (but remove trailing slash)
    return `${u.hostname}${
      u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : ""
    }`;
  } catch {
    // fallback: strip scheme if present
    return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

export function AboutBlock({ profile }: { profile: UserProps }) {
  const website = profile.website?.trim();

  // handle different createdAt types (Firestore Timestamp, Date, number, string)
  let joinedDate: Date | null = null;
  if (profile.createdAt) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = profile.createdAt as any;
    if (c?.toDate instanceof Function) joinedDate = c.toDate();
    else if (c instanceof Date) joinedDate = c;
    else if (typeof c === "number") joinedDate = new Date(c);
    else if (typeof c === "string") {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) joinedDate = d;
    }
  }

  return (
    <div className="grid gap-4 text-sm">
      <div className="flex items-center gap-4">
        <UserIcon className="h-6 w-6" />
        <div>
          <span>Username: </span>
          <strong>@{profile.username}</strong>
        </div>
      </div>

      {profile.location && (
        <div className="flex items-center gap-4">
          <MapPinIcon className="h-6 w-6" />
          <div>
            <span>City: </span>
            <strong>{profile.location}</strong>
          </div>
        </div>
      )}

      {website && (
        <div className="flex items-center gap-4">
          <LinkIcon className="h-6 w-6" />
          <a
            href={ensureProtocol(website)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${website}`}
            className="break-words"
          >
            <div>
              <span>Website: </span>
              <strong className="underline lowercase">
                {prettyDisplay(website)}
              </strong>
            </div>
          </a>
        </div>
      )}

      {joinedDate && (
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-6 w-6" />
          <div>
            <span>Joined: </span>
            <strong>
              {joinedDate.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

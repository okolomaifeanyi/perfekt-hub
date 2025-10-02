import { UserProps, ViewerRole } from "@/lib/types";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  LinkIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import {
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaInstagram,
  FaBirthdayCake,
} from "react-icons/fa";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { canView } from "@/lib/utils";

function ensureProtocol(url: string) {
  const t = url.trim();
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(t)) return t;
  return `https://${t}`;
}

function prettyDisplay(url: string) {
  try {
    const href = ensureProtocol(url);
    const u = new URL(href);
    return `${u.hostname}${
      u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : ""
    }`;
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

export function AboutBlock({
  profile,
  viewerRole,
}: {
  profile: UserProps;
  viewerRole: ViewerRole;
}) {
  const website = profile.website?.trim();

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
    <div className="grid gap-8 text-sm">
      {/* Location */}
      {canView("location", viewerRole) && profile.location && (
        <div className="flex items-center gap-4">
          <MapPinIcon className="h-6 w-6" />
          <div>
            <span>City: </span>
            <strong>{profile.location}</strong>
          </div>
        </div>
      )}

      {/* Education */}
      {profile.education && (
        <div className="flex items-center gap-4">
          <AcademicCapIcon className="h-6 w-6" />
          <div>
            <span>Education: </span>
            <strong>{profile.education}</strong>
          </div>
        </div>
      )}

      {/* Work */}
      {profile.work && (
        <div className="flex items-center gap-4">
          <BriefcaseIcon className="h-6 w-6" />
          <div>
            <span>Work: </span>
            <strong>{profile.work}</strong>
          </div>
        </div>
      )}

      {/* Company */}
      {canView("company", viewerRole) && profile.company && (
        <div className="flex items-center gap-4">
          <BuildingOffice2Icon className="h-6 w-6" />
          <div>
            <span>Company: </span>
            <strong>{profile.company}</strong>
          </div>
        </div>
      )}

      {/* Email */}
      {canView("email", viewerRole) && profile.email && (
        <div className="flex items-center gap-4">
          <EnvelopeIcon className="h-6 w-6" />
          <div>
            <span>Email: </span>
            <a
              href={`mailto:${profile.email}`}
              className="underline text-primary"
            >
              <strong>{profile.email}</strong>
            </a>
          </div>
        </div>
      )}

      {/* Phone */}
      {canView("phoneNumber", viewerRole) && profile.phoneNumber && (
        <div className="flex items-center gap-4">
          <PhoneIcon className="h-6 w-6" />
          <div>
            <span>Phone: </span>
            <a href={`tel:${profile.phoneNumber}`} className="underline">
              {parsePhoneNumberFromString(
                profile.phoneNumber
              )?.formatInternational() || profile.phoneNumber}
            </a>
          </div>
        </div>
      )}

      {/* Website */}
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
              <strong className="underline lowercase text-primary">
                {prettyDisplay(website)}
              </strong>
            </div>
          </a>
        </div>
      )}

      {/* Social Links */}
      {profile.linkedin && (
        <div className="flex items-center gap-4">
          <FaLinkedin className="h-5 w-5 text-blue-700" />
          <a
            href={ensureProtocol(profile.linkedin)}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      )}
      {profile.github && (
        <div className="flex items-center gap-4">
          <FaGithub className="h-5 w-5" />
          <a
            href={ensureProtocol(profile.github)}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      )}
      {profile.twitter && (
        <div className="flex items-center gap-4">
          <FaTwitter className="h-5 w-5 text-sky-500" />
          <a
            href={ensureProtocol(profile.twitter)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter
          </a>
        </div>
      )}
      {profile.instagram && (
        <div className="flex items-center gap-4">
          <FaInstagram className="h-5 w-5 text-pink-500" />
          <a
            href={ensureProtocol(profile.instagram)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </div>
      )}

      {profile.dob && canView("dob", viewerRole) && (
        <div className="flex items-center gap-4">
          <FaBirthdayCake className="h-6 w-6" />
          <div>
            <span>Birthday: </span>
            <strong>
              {(() => {
                const d = new Date(profile.dob);
                return viewerRole === "self"
                  ? d.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : d.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                    });
              })()}
            </strong>
          </div>
        </div>
      )}

      {/* Relationship */}
      {canView("relationship", viewerRole) && profile.relationship && (
        <div className="flex items-center gap-4">
          <UserIcon className="h-6 w-6" />
          <div>
            <span>Relationship: </span>
            <strong>{profile.relationship}</strong>
          </div>
        </div>
      )}

      {/* Joined Date */}
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

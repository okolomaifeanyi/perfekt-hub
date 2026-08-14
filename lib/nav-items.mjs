import {
  HomeIcon as HomeOutline,
  BellIcon as BellOutline,
  EnvelopeIcon as MailOutline,
  AdjustmentsHorizontalIcon as SettingsOutline,
  MagnifyingGlassIcon as DiscoverOutline,
  PlayIcon as WatchOutline,
  SparklesIcon as AssistantOutline,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  BellIcon as BellSolid,
  EnvelopeIcon as MailSolid,
  AdjustmentsHorizontalIcon as SettingsSolid,
  MagnifyingGlassIcon as DiscoverSolid,
  PlayIcon as WatchSolid,
  SparklesIcon as AssistantSolid,
} from "@heroicons/react/24/solid";

export const navItems = [
  {
    href: "/",
    label: "Home",
    SolidIcon: HomeSolid,
    OutlineIcon: HomeOutline,
  },
  {
    href: "/watch",
    label: "Watch",
    SolidIcon: WatchSolid,
    OutlineIcon: WatchOutline,
  },
  {
    href: "/discover",
    label: "Discover",
    SolidIcon: DiscoverSolid,
    OutlineIcon: DiscoverOutline,
  },
  {
    href: "/messages",
    label: "Messages",
    SolidIcon: MailSolid,
    OutlineIcon: MailOutline,
  },
  {
    href: "/notifications",
    label: "Notifications",
    SolidIcon: BellSolid,
    OutlineIcon: BellOutline,
  },
  {
    href: "/assistant",
    label: "Assistant",
    SolidIcon: AssistantSolid,
    OutlineIcon: AssistantOutline,
  },
  {
    href: "/settings",
    label: "Settings",
    SolidIcon: SettingsSolid,
    OutlineIcon: SettingsOutline,
  },
];

export const navGroups = [
  {
    label: "Primary",
    items: navItems,
  },
  {
    label: "Discover",
    items: [
      { href: "/discover", label: "Top Saves" },
      { href: "/discover/events", label: "Top Events" },
      { href: "/discover/groups", label: "Top Groups" },
      { href: "/discover", label: "Top People" },
      { href: "/discover/match", label: "Suggested Match" },
    ],
  },
  {
    label: "Library",
    items: [{ href: "/calendar", label: "Calendar" }],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/messages", label: "Messages" },
      { href: "/notifications", label: "Notifications" },
    ],
  },
];

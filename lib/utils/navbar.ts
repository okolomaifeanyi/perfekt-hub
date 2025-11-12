  import {
    HomeIcon as HomeOutline,
    BellIcon as BellOutline,
    EnvelopeIcon as MailOutline,
    // UserGroupIcon as UsersOutline,
    AdjustmentsHorizontalIcon as SettingsOutline,
  } from "@heroicons/react/24/outline";
  
  import {
    HomeIcon as HomeSolid,
    BellIcon as BellSolid,
    EnvelopeIcon as MailSolid,
    // UserGroupIcon as UsersSolid,
    AdjustmentsHorizontalIcon as SettingsSolid,
  } from "@heroicons/react/24/solid";

export const navItems = [
      {
        href: "/",
        label: "Home",
        SolidIcon: HomeSolid,
        OutlineIcon: HomeOutline,
      },
      {
        href: "/notifications",
        label: "Notification",
        SolidIcon: BellSolid,
        OutlineIcon: BellOutline,
      },
      {
        href: "/messages",
        label: "Message",
        SolidIcon: MailSolid,
        OutlineIcon: MailOutline,
      },
      // {
      //   href: "/group",
      //   label: "Group",
      //   SolidIcon: UsersSolid,
      //   OutlineIcon: UsersOutline,
      // },
      {
        href: `/settings`,
        label: "Settings and Privacy",
        SolidIcon: SettingsSolid,
        OutlineIcon: SettingsOutline,
      },
    ];
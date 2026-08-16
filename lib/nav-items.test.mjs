import assert from "node:assert/strict";
import test from "node:test";
import { navGroups, navItems } from "./nav-items.mjs";

test("nav groups expose the grouped navigation structure", () => {
  assert.deepEqual(
    navGroups.map(group => group.label),
    ["Primary", "Discover", "Library", "Account"]
  );
});

test("navItems exposes the compact primary destinations", () => {
  assert.deepEqual(
    navItems.map(item => ({ href: item.href, label: item.label })),
    [
      { href: "/", label: "Home" },
      { href: "/watch", label: "Watch" },
      { href: "/discover", label: "Discover" },
      { href: "/messages", label: "Messages" },
      { href: "/notifications", label: "Notifications" },
      { href: "/assistant", label: "Nwanne" },
      { href: "/settings", label: "Settings" },
    ]
  );

  assert.equal(typeof navItems[0].SolidIcon, "object");
  assert.equal(typeof navItems[0].OutlineIcon, "object");
});

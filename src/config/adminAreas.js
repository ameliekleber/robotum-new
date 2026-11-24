// src/config/adminAreas.js
// The admin pages and the access area (public.access_area, migration 0006)
// each one belongs to. `area` must match an access_area enum value: the
// database decides who may read/write it (access_grants + RLS, migration 0008);
// this list only maps pages onto those areas for navigation and UI gating.
// A new admin page = add the enum value in SQL, then add a row here.
export const ADMIN_AREAS = [
  {
    area: "faqs",
    path: "/admin/faqs",
    label: "FAQs",
    description: "Manage FAQ entries shown on the public site.",
  },
  {
    area: "partners",
    path: "/admin/partners",
    label: "Partners",
    description: "Manage partner logos and links shown on the site.",
  },
  {
    area: "projects",
    path: "/admin/projects",
    label: "Projects",
    description: "Manage project entries shown on the site.",
  },
  {
    area: "events",
    path: "/admin/events",
    label: "Events",
    description: "Manage event entries shown on the site.",
  },
  {
    area: "inventory",
    path: "/admin/inventory",
    label: "Inventory",
    description: "Manage roboTUM inventory and equipment.",
  },
  {
    area: "members",
    path: "/admin/members",
    label: "Members",
    description: "Manage teams, club memberships and member status.",
  },
];

/** The ADMIN_AREAS entry for a pathname (also matches sub-paths), or null. */
export function adminAreaForPath(pathname) {
  return (
    ADMIN_AREAS.find(
      (a) => pathname === a.path || pathname.startsWith(`${a.path}/`),
    ) ?? null
  );
}

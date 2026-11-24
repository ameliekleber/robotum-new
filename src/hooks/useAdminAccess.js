// src/hooks/useAdminAccess.js
// Read/write permissions of the signed-in user inside /admin.
// AdminRoute loads them (fetchMyAccess -> my_access() RPC) and provides them;
// pages and admin components read them here.
//
// This only shapes the UI (hide/disable controls). The real enforcement is
// RLS in the database (migration 0008) - never rely on these checks alone.
import { createContext, useContext } from "react";

const NO_ACCESS = { isAdmin: false, areas: {}, currentArea: null };

export const AdminAccessContext = createContext(NO_ACCESS);

/**
 * @param {string} [area] access_area value; defaults to the area of the
 *   current admin page.
 * @returns {{ isAdmin: boolean, canRead: boolean, canWrite: boolean,
 *   canReadArea: (area: string) => boolean,
 *   canWriteArea: (area: string) => boolean }}
 */
export function useAdminAccess(area) {
  const { isAdmin, areas, currentArea } = useContext(AdminAccessContext);

  const canReadArea = (a) =>
    isAdmin || Boolean(areas?.[a]?.read || areas?.[a]?.write);
  const canWriteArea = (a) => isAdmin || Boolean(areas?.[a]?.write);

  const target = area ?? currentArea;
  return {
    isAdmin,
    // Pages outside any area (the dashboard) are open to everyone allowed in.
    canRead: target ? canReadArea(target) : true,
    canWrite: target ? canWriteArea(target) : isAdmin,
    canReadArea,
    canWriteArea,
  };
}

import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { verifyAdminAccess } from "@data";
import PageLoader from "@components/sections/common-sections/PageLoader";
import AdminLayout from "@components/admin/AdminLayout";
import AdminBanner from "@components/admin/AdminBanner";
import { AdminAccessContext } from "@hooks/useAdminAccess";
import { adminAreaForPath } from "@config/adminAreas";

export default function AdminRoute() {
  const location = useLocation();
  const [status, setStatus] = useState("checking"); // 'checking' | 'allowed' | 'denied'
  const [errorMsg, setErrorMsg] = useState("");
  const [access, setAccess] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const checkAdmin = async () => {
      setStatus("checking");
      setErrorMsg("");

      const { allowed, error, access: nextAccess } = await verifyAdminAccess();
      if (isCancelled) return;

      if (allowed) {
        setAccess(nextAccess);
        setStatus("allowed");
      } else {
        setErrorMsg(error);
        setStatus("denied");
      }
    };

    checkAdmin();

    return () => {
      isCancelled = true;
    };
  }, [location.pathname]);

  const page = adminAreaForPath(location.pathname);

  const contextValue = useMemo(
    () => ({
      isAdmin: Boolean(access?.isAdmin),
      areas: access?.areas ?? {},
      currentArea: page?.area ?? null,
    }),
    [access, page],
  );

  // While checking: show full-page loader
  if (status === "checking") {
    return <PageLoader />;
  }

  // If denied: send to /admin/login, optionally pass a message
  if (status === "denied") {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location.pathname,
          error: errorMsg || "Please log in as an admin.",
        }}
      />
    );
  }

  const areaInfo = access?.areas?.[page?.area];
  const canReadPage =
    !page || contextValue.isAdmin || Boolean(areaInfo?.read || areaInfo?.write);

  return (
    <AdminAccessContext.Provider value={contextValue}>
      {canReadPage ? (
        <Outlet />
      ) : (
        <AdminLayout title={page.label}>
          <AdminBanner
            message={`You don’t have access to ${page.label}. Ask a board member if you think you should.`}
          />
        </AdminLayout>
      )}
    </AdminAccessContext.Provider>
  );
}

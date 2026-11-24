import { useEffect, useState } from "react";
import { logger } from "@utils/logger";
import { Link } from "react-router-dom";
import AdminLayout from "@components/admin/AdminLayout";
import AdminBanner from "@components/admin/AdminBanner";
import {
  adminFetchEvents,
  adminFetchFaqs,
  adminFetchPartners,
  adminFetchProjects,
} from "@data";
import { useAdminAccess } from "@hooks/useAdminAccess";
import { ADMIN_AREAS } from "@config/adminAreas";

// Count shown on the dashboard per area (areas without one only get a card).
const STAT_LOADERS = {
  faqs: { label: "Total FAQs", load: adminFetchFaqs },
  partners: { label: "Total Partners", load: adminFetchPartners },
  projects: { label: "Total Projects", load: adminFetchProjects },
  events: { label: "Total Events", load: adminFetchEvents },
};

export default function AdminDashboard() {
  const { canReadArea } = useAdminAccess();
  // Only areas this account may read: no cards, links or counts for the rest.
  const visibleAreas = ADMIN_AREAS.filter((a) => canReadArea(a.area));
  const statAreas = visibleAreas
    .map((a) => a.area)
    .filter((area) => STAT_LOADERS[area]);
  const statKey = statAreas.join("|");

  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    const areas = statKey ? statKey.split("|") : [];

    const loadDashboardCounts = async () => {
      setLoadingCounts(true);
      setErrorMsg("");

      try {
        const results = await Promise.all(
          areas.map((area) => STAT_LOADERS[area].load()),
        );

        if (!mounted) return;

        setCounts(
          Object.fromEntries(
            areas.map((area, i) => [area, results[i]?.length ?? null]),
          ),
        );
      } catch (err) {
        logger.error("Error loading admin dashboard counts:", err);
        if (!mounted) return;

        setCounts({});
        setErrorMsg("Failed to load dashboard stats. Please try again.");
      } finally {
        if (mounted) {
          setLoadingCounts(false);
        }
      }
    };

    loadDashboardCounts();

    return () => {
      mounted = false;
    };
  }, [statKey]);

  const statCards = statAreas.map((area) => ({
    label: STAT_LOADERS[area].label,
    value: counts[area],
  }));

  return (
    <AdminLayout
      title="Admin Dashboard"
      description="Manage roboTUM content and internal data."
    >
      <div className="space-y-8">
        {errorMsg && <AdminBanner message={errorMsg} />}

        {statCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((item) => (
              <div key={item.label} className="card-surface p-5">
                <p className="text-xs text-white/60">{item.label}</p>
                <p
                  className={`text-2xl font-semibold text-white mt-1 ${
                    loadingCounts ? "animate-pulse" : ""
                  }`}
                >
                  {loadingCounts ? "..." : item.value ?? "-"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAreas.map((item) => (
            <Link
              key={item.area}
              to={item.path}
              className="card-surface card-surface-hover px-6 py-8 transition-all backdrop-blur-md block"
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                {item.label}
              </h3>
              <p className="text-white/70 text-sm">{item.description}</p>
            </Link>
          ))}

          <div className="card-surface px-6 py-8 opacity-40 cursor-not-allowed backdrop-blur-md">
            <h3 className="text-lg font-semibold text-white mb-2">
              Applications
            </h3>
            <p className="text-white/70 text-sm">Coming soon…</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

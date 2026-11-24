// src/components/admin/AdminSideCard.jsx
// Sticky editor panel that sits beside an admin list.
// Without write access to the current admin area its contents are shown
// read-only: a disabled <fieldset> disables every input and button inside.
// Pass lockWhenReadOnly={false} when the card also holds controls that are
// needed just to view (e.g. a member picker) and lock the editing parts yourself.
import { useAdminAccess } from "@hooks/useAdminAccess";

export default function AdminSideCard({
  title,
  description,
  lockWhenReadOnly = true,
  children,
}) {
  const { canWrite } = useAdminAccess();

  return (
    <div className="card-surface p-5 sm:p-6 xl:sticky xl:top-6">
      {(title || description) && (
        <div className="mb-4 pb-4 border-b border-white/10 space-y-1">
          {title && (
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          )}
          {description && (
            <p className="text-xs text-white/60 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      {!canWrite && (
        <p className="chip mb-4">Read-only - you can view but not change this.</p>
      )}
      {lockWhenReadOnly ? (
        <fieldset disabled={!canWrite} className="min-w-0 disabled:opacity-70">
          {children}
        </fieldset>
      ) : (
        children
      )}
    </div>
  );
}

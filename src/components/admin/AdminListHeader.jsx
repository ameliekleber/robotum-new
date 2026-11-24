import Button from "@components/ui/Button";
import { useAdminAccess } from "@hooks/useAdminAccess";

export default function AdminListHeader({
  title,
  count,
  buttonLabel,
  onButtonClick,
  buttonVariant = "secondary",
  size = "sm",
}) {
  // The header button always creates something, so read-only users don't get it.
  const { canWrite } = useAdminAccess();
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
        {typeof count === "number" && (
          <span className="chip shrink-0">{count}</span>
        )}
      </div>
      {canWrite && buttonLabel && onButtonClick && (
        <Button
          size={size}
          variant={buttonVariant}
          onClick={onButtonClick}
          className="shrink-0"
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}

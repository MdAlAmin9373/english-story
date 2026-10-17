import type { PublishStatus } from "@prisma/client";

export const statusLabel: Record<PublishStatus, string> = {
  DRAFT: "খসড়া",
  PUBLISHED: "প্রকাশিত",
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  return (
    <span
      className={
        status === "PUBLISHED"
          ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300"
          : "rounded-full bg-navy-700 px-2 py-0.5 text-xs text-ink-muted"
      }
    >
      {statusLabel[status]}
    </span>
  );
}

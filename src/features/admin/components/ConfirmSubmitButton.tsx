"use client";

import type { MouseEvent, ReactNode } from "react";

// For an edit form's submit button: when a published item's "status" select
// is switched to DRAFT, ask first; cancelling stops the submit.
export function confirmIfUnpublishing(
  event: MouseEvent<HTMLButtonElement>,
  savedStatus: string,
  message: string,
) {
  const status = event.currentTarget.form?.elements.namedItem("status");
  const unpublishing =
    savedStatus === "PUBLISHED" &&
    status instanceof HTMLSelectElement &&
    status.value === "DRAFT";
  if (unpublishing && !window.confirm(message)) event.preventDefault();
}

// Submit button that asks before submitting; cancelling stops the form submit.
export function ConfirmSubmitButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

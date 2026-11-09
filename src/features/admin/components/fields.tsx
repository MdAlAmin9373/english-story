import type { ReactNode } from "react";

// Shared form styling for the admin editors.
export const inputClass =
  "w-full rounded-lg border border-line-strong bg-page px-3 py-2 text-ink outline-none focus:border-focus aria-invalid:border-danger-strong";

export const primaryButtonClass =
  "rounded-lg bg-accent px-4 py-2 font-semibold text-on-accent hover:opacity-90 disabled:opacity-60";

export const secondaryButtonClass =
  "rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink hover:border-accent disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  errors,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm text-ink-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      {errors?.[0] && (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p role="status" className="text-sm text-success">
        সংরক্ষিত হয়েছে।
      </p>
    );
  }
  return null;
}

// Message + submit button used by the sentence, word and question editors.
export function SubmitRow({
  pending,
  label,
  error,
  saved,
}: {
  pending: boolean;
  label: string;
  error?: string;
  saved?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "সংরক্ষণ হচ্ছে…" : label}
      </button>
      <FormMessage error={error} saved={saved} />
    </div>
  );
}

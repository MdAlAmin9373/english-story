"use client";

import { useActionState } from "react";
import type { PublishStatus } from "@prisma/client";
import type { AdminFormState } from "../actions";
import { STATUSES } from "../constants";
import { confirmIfUnpublishing } from "./ConfirmSubmitButton";
import { Field, FormMessage, inputClass, primaryButtonClass } from "./fields";
import { statusLabel } from "./StatusBadge";

export type ChapterDefaults = {
  titleBn: string;
  titleEn: string;
  requiresLogin: boolean;
  status: PublishStatus;
};

const empty: ChapterDefaults = {
  titleBn: "",
  titleEn: "",
  requiresLogin: true,
  status: "DRAFT",
};

const UNPUBLISH_MESSAGE = "অধ্যায়টি খসড়া করলে পাঠকেরা আর এটি দেখতে পাবে না। নিশ্চিত?";

export function ChapterForm({
  action,
  chapter = empty,
  submitLabel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  chapter?: ChapterDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  // After a failed submit, show what the admin typed rather than the saved values.
  const values = state.values;
  const invalid = (name: string) => (errors[name] ? true : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="শিরোনাম (বাংলা)" htmlFor="titleBn" errors={errors.titleBn}>
          <input
            id="titleBn"
            name="titleBn"
            required
            maxLength={120}
            defaultValue={values?.titleBn ?? chapter.titleBn}
            aria-invalid={invalid("titleBn")}
            className={inputClass}
          />
        </Field>
        <Field label="শিরোনাম (ইংরেজি)" htmlFor="titleEn" errors={errors.titleEn}>
          <input
            id="titleEn"
            name="titleEn"
            lang="en"
            required
            maxLength={120}
            defaultValue={values?.titleEn ?? chapter.titleEn}
            aria-invalid={invalid("titleEn")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <label className="flex items-center gap-2 text-ink">
          <input
            type="checkbox"
            name="requiresLogin"
            defaultChecked={values ? values.requiresLogin === "on" : chapter.requiresLogin}
            className="size-4 accent-accent"
          />
          পড়তে লগইন লাগবে
        </label>
        <Field label="অবস্থা" htmlFor="status" errors={errors.status}>
          <select
            id="status"
            name="status"
            defaultValue={values?.status ?? chapter.status}
            aria-invalid={invalid("status")}
            className={inputClass}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <FormMessage error={state.error} saved={state.saved} />

      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} self-start`}
        onClick={(event) => confirmIfUnpublishing(event, chapter.status, UNPUBLISH_MESSAGE)}
      >
        {pending ? "সংরক্ষণ হচ্ছে…" : submitLabel}
      </button>
    </form>
  );
}

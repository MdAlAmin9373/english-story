"use client";

import { useActionState } from "react";
import type { Genre, PublishStatus } from "@prisma/client";
import { genreLabel, levelLabel } from "@/features/stories/labels";
import type { AdminFormState } from "../actions";
import { GENRES, STATUSES } from "../constants";
import { confirmIfUnpublishing } from "./ConfirmSubmitButton";
import { Field, FormMessage, inputClass, primaryButtonClass } from "./fields";
import { statusLabel } from "./StatusBadge";

export type StoryDefaults = {
  slug: string;
  titleBn: string;
  titleEn: string;
  summaryBn: string;
  summaryEn: string;
  genre: Genre;
  level: number;
  status: PublishStatus;
};

const empty: StoryDefaults = {
  slug: "",
  titleBn: "",
  titleEn: "",
  summaryBn: "",
  summaryEn: "",
  genre: "FOLKTALE",
  level: 1,
  status: "DRAFT",
};

const UNPUBLISH_MESSAGE = "গল্পটি খসড়া করলে পাঠকেরা আর এটি দেখতে পাবে না। নিশ্চিত?";

export function StoryForm({
  action,
  story = empty,
  submitLabel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  story?: StoryDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  // After a failed submit, show what the admin typed rather than the saved values.
  const value = (name: keyof StoryDefaults) => state.values?.[name] ?? String(story[name]);
  const invalid = (name: string) => (errors[name] ? true : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="স্লাগ (URL)"
        htmlFor="slug"
        errors={errors.slug}
        hint="ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন, যেমন the-blue-kite"
      >
        <input
          id="slug"
          name="slug"
          lang="en"
          required
          maxLength={80}
          defaultValue={value("slug")}
          aria-invalid={invalid("slug")}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="শিরোনাম (বাংলা)" htmlFor="titleBn" errors={errors.titleBn}>
          <input
            id="titleBn"
            name="titleBn"
            required
            maxLength={120}
            defaultValue={value("titleBn")}
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
            defaultValue={value("titleEn")}
            aria-invalid={invalid("titleEn")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="সারসংক্ষেপ (বাংলা)" htmlFor="summaryBn" errors={errors.summaryBn}>
          <textarea
            id="summaryBn"
            name="summaryBn"
            required
            rows={4}
            maxLength={1000}
            defaultValue={value("summaryBn")}
            aria-invalid={invalid("summaryBn")}
            className={inputClass}
          />
        </Field>
        <Field label="সারসংক্ষেপ (ইংরেজি)" htmlFor="summaryEn" errors={errors.summaryEn}>
          <textarea
            id="summaryEn"
            name="summaryEn"
            lang="en"
            required
            rows={4}
            maxLength={1000}
            defaultValue={value("summaryEn")}
            aria-invalid={invalid("summaryEn")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ধরন" htmlFor="genre" errors={errors.genre}>
          <select
            id="genre"
            name="genre"
            defaultValue={value("genre")}
            aria-invalid={invalid("genre")}
            className={inputClass}
          >
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genreLabel[genre]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="স্তর" htmlFor="level" errors={errors.level}>
          <select
            id="level"
            name="level"
            defaultValue={value("level")}
            aria-invalid={invalid("level")}
            className={inputClass}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {levelLabel(level)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="অবস্থা" htmlFor="status" errors={errors.status}>
          <select
            id="status"
            name="status"
            defaultValue={value("status")}
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
        onClick={(event) => confirmIfUnpublishing(event, story.status, UNPUBLISH_MESSAGE)}
      >
        {pending ? "সংরক্ষণ হচ্ছে…" : submitLabel}
      </button>
    </form>
  );
}

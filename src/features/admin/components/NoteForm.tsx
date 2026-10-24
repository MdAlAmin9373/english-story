"use client";

import { useActionState, useId } from "react";
import type { NoteKind } from "@prisma/client";
import { noteKindLabel } from "@/features/stories/labels";
import type { AdminFormState } from "../actions";
import { NOTE_KINDS } from "../constants";
import {
  MAX_NOTE_BODY_LENGTH,
  MAX_NOTE_EXAMPLE_LENGTH,
  MAX_NOTE_TITLE_LENGTH,
} from "../validate";
import { Field, SubmitRow, inputClass } from "./fields";

export type NoteDefaults = {
  kind: NoteKind;
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  exampleEn: string;
};

const empty: NoteDefaults = {
  kind: "PRONUNCIATION",
  titleBn: "",
  titleEn: "",
  bodyBn: "",
  exampleEn: "",
};

// A pronunciation or grammar note. Readers see it as plain text; line breaks are kept.
export function NoteForm({
  action,
  note = empty,
  submitLabel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  note?: NoteDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  // Many editors share the page, so input ids need a per-form prefix.
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="ধরন" htmlFor={`${uid}-kind`} errors={errors.kind}>
          <select
            id={`${uid}-kind`}
            name="kind"
            required
            defaultValue={values?.kind ?? note.kind}
            aria-invalid={errors.kind ? true : undefined}
            className={inputClass}
          >
            {NOTE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {noteKindLabel[kind]}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="শিরোনাম (বাংলা)" htmlFor={`${uid}-titleBn`} errors={errors.titleBn}>
            <input
              id={`${uid}-titleBn`}
              name="titleBn"
              required
              maxLength={MAX_NOTE_TITLE_LENGTH}
              defaultValue={values?.titleBn ?? note.titleBn}
              aria-invalid={errors.titleBn ? true : undefined}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <Field label="শিরোনাম (English)" htmlFor={`${uid}-titleEn`} errors={errors.titleEn}>
        <input
          id={`${uid}-titleEn`}
          name="titleEn"
          lang="en"
          required
          maxLength={MAX_NOTE_TITLE_LENGTH}
          defaultValue={values?.titleEn ?? note.titleEn}
          aria-invalid={errors.titleEn ? true : undefined}
          className={inputClass}
        />
      </Field>

      <Field
        label="ব্যাখ্যা (বাংলা)"
        htmlFor={`${uid}-bodyBn`}
        errors={errors.bodyBn}
        hint="সাধারণ লেখা; লাইন ভাঙা থাকবে, কোনো ফরম্যাটিং চিহ্ন কাজ করবে না। সর্বোচ্চ ১৫০০ অক্ষর।"
      >
        <textarea
          id={`${uid}-bodyBn`}
          name="bodyBn"
          required
          rows={5}
          maxLength={MAX_NOTE_BODY_LENGTH}
          defaultValue={values?.bodyBn ?? note.bodyBn}
          aria-invalid={errors.bodyBn ? true : undefined}
          className={inputClass}
        />
      </Field>

      <Field
        label="উদাহরণ (English)"
        htmlFor={`${uid}-exampleEn`}
        errors={errors.exampleEn}
        hint="একটি ছোট ইংরেজি বাক্য, যেমন: I think the kite is there."
      >
        <input
          id={`${uid}-exampleEn`}
          name="exampleEn"
          lang="en"
          required
          maxLength={MAX_NOTE_EXAMPLE_LENGTH}
          defaultValue={values?.exampleEn ?? note.exampleEn}
          aria-invalid={errors.exampleEn ? true : undefined}
          className={inputClass}
        />
      </Field>

      <SubmitRow pending={pending} label={submitLabel} error={state.error} saved={state.saved} />
    </form>
  );
}

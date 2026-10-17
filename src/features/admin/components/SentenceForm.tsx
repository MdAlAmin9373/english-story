"use client";

import { useActionState, useId } from "react";
import type { AdminFormState } from "../actions";
import { Field, SubmitRow, inputClass } from "./fields";

export type SentenceDefaults = { bn: string; en: string };

export function SentenceForm({
  action,
  sentence = { bn: "", en: "" },
  submitLabel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  sentence?: SentenceDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  // Many editors share the page, so input ids need a per-form prefix.
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="বাংলা" htmlFor={`${uid}-bn`} errors={errors.bn}>
          <textarea
            id={`${uid}-bn`}
            name="bn"
            required
            rows={2}
            maxLength={500}
            defaultValue={state.values?.bn ?? sentence.bn}
            aria-invalid={errors.bn ? true : undefined}
            className={inputClass}
          />
        </Field>
        <Field label="English" htmlFor={`${uid}-en`} errors={errors.en}>
          <textarea
            id={`${uid}-en`}
            name="en"
            lang="en"
            required
            rows={2}
            maxLength={500}
            defaultValue={state.values?.en ?? sentence.en}
            aria-invalid={errors.en ? true : undefined}
            className={inputClass}
          />
        </Field>
      </div>
      <SubmitRow pending={pending} label={submitLabel} error={state.error} saved={state.saved} />
    </form>
  );
}

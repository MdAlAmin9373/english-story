"use client";

import { useActionState, useId } from "react";
import type { AdminFormState } from "../actions";
import { Field, SubmitRow, inputClass } from "./fields";

export type OrderTaskDefaults = { promptBn: string; en: string };

// A sentence-order task: a short Bengali hint and the English sentence the
// reader rebuilds from shuffled words.
export function OrderTaskForm({
  action,
  task = { promptBn: "", en: "" },
  submitLabel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  task?: OrderTaskDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  // Many editors share the page, so input ids need a per-form prefix.
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="বাংলা সংকেত"
          htmlFor={`${uid}-promptBn`}
          errors={errors.promptBn}
          hint="ছোট একটি বাংলা বাক্য, যেমন: রিনা ঘুড়ি ওড়ায়।"
        >
          <input
            id={`${uid}-promptBn`}
            name="promptBn"
            required
            maxLength={200}
            defaultValue={state.values?.promptBn ?? task.promptBn}
            aria-invalid={errors.promptBn ? true : undefined}
            className={inputClass}
          />
        </Field>
        <Field
          label="ইংরেজি বাক্য (সঠিক ক্রমে)"
          htmlFor={`${uid}-en`}
          errors={errors.en}
          hint="৩ থেকে ১২টি শব্দ; শব্দগুলো ফাঁকা দিয়ে ভাগ হবে।"
        >
          <input
            id={`${uid}-en`}
            name="en"
            lang="en"
            required
            maxLength={300}
            defaultValue={state.values?.en ?? task.en}
            aria-invalid={errors.en ? true : undefined}
            className={inputClass}
          />
        </Field>
      </div>
      <SubmitRow pending={pending} label={submitLabel} error={state.error} saved={state.saved} />
    </form>
  );
}

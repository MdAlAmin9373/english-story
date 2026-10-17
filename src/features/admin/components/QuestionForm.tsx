"use client";

import { useActionState, useId } from "react";
import type { QuestionType } from "@prisma/client";
import { toBnDigits } from "@/features/stories/labels";
import type { AdminFormState } from "../actions";
import { QUESTION_TYPES, questionTypeLabel } from "../constants";
import { MAX_OPTIONS } from "../validate";
import { Field, SubmitRow, inputClass } from "./fields";

export type QuestionDefaults = {
  type: QuestionType;
  promptBn: string;
  promptEn: string;
  options: string[];
  correctIndex: number;
};

const empty: QuestionDefaults = {
  type: "MULTIPLE_CHOICE",
  promptBn: "",
  promptEn: "",
  options: [],
  correctIndex: 0,
};

export function QuestionForm({
  action,
  question = empty,
  submitLabel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  question?: QuestionDefaults;
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
        <Field label="প্রশ্নের ধরন" htmlFor={`${uid}-type`} errors={errors.type}>
          <select
            id={`${uid}-type`}
            name="type"
            defaultValue={values?.type ?? question.type}
            className={inputClass}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {questionTypeLabel[type]}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="প্রশ্ন (বাংলা)" htmlFor={`${uid}-promptBn`} errors={errors.promptBn}>
            <input
              id={`${uid}-promptBn`}
              name="promptBn"
              required
              maxLength={300}
              defaultValue={values?.promptBn ?? question.promptBn}
              aria-invalid={errors.promptBn ? true : undefined}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <Field
        label="প্রশ্ন (English)"
        htmlFor={`${uid}-promptEn`}
        errors={errors.promptEn}
        hint="শূন্যস্থান পূরণে ফাঁকা জায়গাটি ___ দিয়ে লিখুন, যেমন Rina ___ a kite."
      >
        <input
          id={`${uid}-promptEn`}
          name="promptEn"
          lang="en"
          required
          maxLength={300}
          defaultValue={values?.promptEn ?? question.promptEn}
          aria-invalid={errors.promptEn ? true : undefined}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field
            label="অপশন"
            htmlFor={`${uid}-options`}
            errors={errors.options}
            hint="প্রতি লাইনে একটি অপশন, ২ থেকে ৬টি।"
          >
            <textarea
              id={`${uid}-options`}
              name="options"
              lang="en"
              required
              rows={4}
              maxLength={1000}
              defaultValue={values?.options ?? question.options.join("\n")}
              aria-invalid={errors.options ? true : undefined}
              className={inputClass}
            />
          </Field>
        </div>
        <Field
          label="সঠিক উত্তর"
          htmlFor={`${uid}-correctIndex`}
          errors={errors.correctIndex}
          hint="কত নম্বর লাইনের অপশনটি সঠিক"
        >
          <select
            id={`${uid}-correctIndex`}
            name="correctIndex"
            defaultValue={values?.correctIndex ?? String(question.correctIndex)}
            className={inputClass}
          >
            {Array.from({ length: MAX_OPTIONS }, (_, i) => (
              <option key={i} value={i}>
                {toBnDigits(i + 1)} নম্বর অপশন
              </option>
            ))}
          </select>
        </Field>
      </div>

      <SubmitRow pending={pending} label={submitLabel} error={state.error} saved={state.saved} />
    </form>
  );
}

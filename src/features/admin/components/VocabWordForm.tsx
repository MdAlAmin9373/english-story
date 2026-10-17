"use client";

import { useActionState, useId } from "react";
import type { AdminFormState } from "../actions";
import { Field, SubmitRow, inputClass } from "./fields";

export type WordDefaults = {
  word: string;
  meaningBn: string;
  pronunciationBn: string;
  exampleEn: string;
  exampleBn: string;
};

const empty: WordDefaults = {
  word: "",
  meaningBn: "",
  pronunciationBn: "",
  exampleEn: "",
  exampleBn: "",
};

// Named VocabWordForm so it doesn't read like the WordForm (tense) model.
export function VocabWordForm({
  action,
  word = empty,
  submitLabel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  word?: WordDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  // Many editors share the page, so input ids need a per-form prefix.
  const uid = useId();

  const input = (name: keyof WordDefaults, max: number, en = false) => (
    <input
      id={`${uid}-${name}`}
      name={name}
      lang={en ? "en" : undefined}
      required
      maxLength={max}
      defaultValue={state.values?.[name] ?? word[name]}
      aria-invalid={errors[name] ? true : undefined}
      className={inputClass}
    />
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="শব্দ (মূল রূপ)"
          htmlFor={`${uid}-word`}
          errors={errors.word}
          hint="ছোট হাতের অক্ষরে, যেমন fly"
        >
          {input("word", 60, true)}
        </Field>
        <Field label="বাংলা অর্থ" htmlFor={`${uid}-meaningBn`} errors={errors.meaningBn}>
          {input("meaningBn", 120)}
        </Field>
        <Field
          label="উচ্চারণ (বাংলায়)"
          htmlFor={`${uid}-pronunciationBn`}
          errors={errors.pronunciationBn}
        >
          {input("pronunciationBn", 60)}
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="উদাহরণ (English)" htmlFor={`${uid}-exampleEn`} errors={errors.exampleEn}>
          {input("exampleEn", 300, true)}
        </Field>
        <Field label="উদাহরণ (বাংলা)" htmlFor={`${uid}-exampleBn`} errors={errors.exampleBn}>
          {input("exampleBn", 300)}
        </Field>
      </div>
      <SubmitRow pending={pending} label={submitLabel} error={state.error} saved={state.saved} />
    </form>
  );
}

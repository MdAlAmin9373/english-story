"use client";

import { useActionState, useId } from "react";
import {
  bilingualLabel,
  buildTenseTable,
  tenseKindLabel,
  tenseKinds,
  tenseTimeLabel,
  type TenseFormInput,
} from "@/features/vocab/tense-table";
import type { AdminFormState } from "../actions";
import {
  MAX_TENSE_EXAMPLE_LENGTH,
  MAX_TENSE_FORM_LENGTH,
  tenseFieldName,
  type TensePart,
} from "../validate";
import { SubmitRow, inputClass } from "./fields";

// The 3x3 tense grid of one word. All nine cells are saved together; an empty
// cell is skipped (an existing form is kept, never deleted).
export function TenseGridForm({
  action,
  word,
  forms,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  word: string;
  forms: TenseFormInput[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const uid = useId();
  const rows = buildTenseTable(forms);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="rounded-lg border border-navy-700 bg-navy-950 p-3 text-sm text-ink-muted">
        এই রূপগুলো <span lang="en">“{word}”</span> শব্দটি ব্যবহার করা সব অধ্যায়ে একই থাকবে।
        কোনো ঘর খালি রাখলে সেটি বাদ যাবে; আগে থেকে থাকা রূপ মুছে যাবে না।
      </p>

      {/* Wide table: scrolls sideways on small phones instead of squeezing the inputs. */}
      <div className="overflow-x-auto rounded-lg border border-navy-800">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="w-28 p-2 text-sm text-ink-muted">
                <span className="sr-only">কাল</span>
              </th>
              {tenseKinds.map((kind) => (
                <th key={kind} scope="col" className="p-2 text-sm font-semibold text-accent">
                  {bilingualLabel(tenseKindLabel[kind])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ time, cells }) => (
              <tr key={time} className="border-t border-navy-800 align-top">
                <th scope="row" className="p-2 text-sm font-semibold text-ink">
                  {bilingualLabel(tenseTimeLabel[time])}
                </th>
                {tenseKinds.map((kind, k) => {
                  const cell = cells[k];
                  const cellLabel = `${bilingualLabel(tenseTimeLabel[time])}, ${bilingualLabel(tenseKindLabel[kind])}`;
                  const input = (part: TensePart, placeholder: string, max: number) => {
                    const name = tenseFieldName(time, kind, part);
                    const error = errors[name]?.[0];
                    return (
                      <>
                        <input
                          id={`${uid}-${name}`}
                          name={name}
                          lang="en"
                          maxLength={max}
                          placeholder={placeholder}
                          defaultValue={state.values?.[name] ?? cell?.[part] ?? ""}
                          aria-label={`${cellLabel}: ${part === "form" ? "রূপ" : "উদাহরণ বাক্য"}`}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? `${uid}-${name}-error` : undefined}
                          className={`${inputClass} text-sm`}
                        />
                        {error && (
                          <p id={`${uid}-${name}-error`} className="text-xs text-red-300">
                            {error}
                          </p>
                        )}
                      </>
                    );
                  };
                  return (
                    <td key={kind} className="p-2">
                      <div className="flex flex-col gap-1.5">
                        {input("form", "রূপ", MAX_TENSE_FORM_LENGTH)}
                        {input("exampleEn", "উদাহরণ বাক্য", MAX_TENSE_EXAMPLE_LENGTH)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubmitRow
        pending={pending}
        label="কালের রূপ সংরক্ষণ করুন"
        error={state.error}
        saved={state.saved}
      />
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { toBnDigits } from "@/features/stories/labels";
import { MAX_HINT_LENGTH, normalizeHint } from "../validate";
import { Field, inputClass } from "./fields";

// Counts what the server will store (trimmed, "\n" line breaks).
function hintLength(value: string): number {
  return normalizeHint(value)?.length ?? 0;
}

// Optional hint for a question or ordering task, with a live character counter.
// Leaving it empty (or clearing it) means "no hint".
export function HintField({
  id,
  defaultValue,
  errors,
}: {
  id: string;
  defaultValue: string;
  errors?: string[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [length, setLength] = useState(() => hintLength(defaultValue));

  // React resets the form after a submit; read the restored value once the reset is done.
  useEffect(() => {
    const el = ref.current;
    const form = el?.form;
    if (!el || !form) return;
    const onReset = () => setTimeout(() => setLength(hintLength(el.value)), 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  return (
    <Field
      label="ইঙ্গিত (ঐচ্ছিক)"
      htmlFor={id}
      errors={errors}
      hint="বাংলা বা ইংরেজিতে ছোট একটি সাহায্য; শিক্ষার্থী চাইলে তবেই দেখবে। ফাঁকা রাখলে কোনো ইঙ্গিত থাকবে না।"
    >
      <textarea
        ref={ref}
        id={id}
        name="hint"
        rows={2}
        maxLength={MAX_HINT_LENGTH}
        defaultValue={defaultValue}
        onChange={(e) => setLength(hintLength(e.target.value))}
        aria-describedby={`${id}-count`}
        aria-invalid={errors ? true : undefined}
        className={inputClass}
      />
      <p id={`${id}-count`} className="self-end text-xs text-ink-muted">
        {toBnDigits(length)}/{toBnDigits(MAX_HINT_LENGTH)} অক্ষর
      </p>
    </Field>
  );
}

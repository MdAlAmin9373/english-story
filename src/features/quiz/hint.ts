// Pure hint rule, no server imports, so it can be unit tested.

export type PublicHint = { hasHint: boolean; hint: string | null };

// What a reader may see of an item's hint before it is asked for: only whether one exists.
// The text is kept only when this user has already revealed it (a hint-use record exists).
export function publicHint(hint: string | null, revealed: boolean): PublicHint {
  const hasHint = hint !== null && hint !== "";
  return { hasHint, hint: hasHint && revealed ? hint : null };
}

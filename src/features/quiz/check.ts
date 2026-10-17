// Pure answer-checking helpers, no server imports, so they can be unit tested.

// QuizQuestion.options is stored as Json; accept only a non-empty string array.
export function parseOptions(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.every((o) => typeof o === "string") ? value : null;
}

export function isCorrectChoice(
  correctIndex: number,
  chosenIndex: number,
  optionCount: number,
): boolean {
  return (
    Number.isInteger(chosenIndex) &&
    chosenIndex >= 0 &&
    chosenIndex < optionCount &&
    chosenIndex === correctIndex
  );
}

// Display tokens for the ordering game: "Rina, come here!" → ["Rina,", "come", "here!"].
export function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

// Case and punctuation do not matter when comparing words.
function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
}

export function isCorrectOrder(expected: string, submitted: string[]): boolean {
  const want = tokenize(expected).map(normalizeToken);
  const got = submitted.map(normalizeToken);
  return want.length === got.length && want.every((t, i) => t === got[i]);
}

// Deterministic shuffle seeded by a string (e.g. the task id): no Math.random,
// which Cache Components forbids during prerender, and stable across reloads.
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Never hand out the answer already in order.
  if (out.length > 1 && out.every((item, i) => item === items[i])) {
    out.push(out.shift() as T);
  }
  return out;
}

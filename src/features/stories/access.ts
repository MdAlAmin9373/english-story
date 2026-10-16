// Pure rule, no server imports, so it can be unit tested.
// Guests may read free chapters; logged-in users may read every chapter.
export function canReadChapter(
  chapter: { requiresLogin: boolean },
  isLoggedIn: boolean,
): boolean {
  return isLoggedIn || !chapter.requiresLogin;
}

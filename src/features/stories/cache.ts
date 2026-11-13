// Cache tag for every public story list ("use cache" reads in ./queries.ts).
// Admin actions call updateTag(STORIES_TAG) after any change that a list can show:
// story create/edit/publish/unpublish/category, and chapter changes (cards show chapter counts).
export const STORIES_TAG = "stories";

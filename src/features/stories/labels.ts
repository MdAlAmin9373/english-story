import type { Genre, NoteKind } from "@prisma/client";

export const genreLabel: Record<Genre, string> = {
  FOLKTALE: "লোককথা",
  ADVENTURE: "অভিযান",
  FAMILY: "পরিবার",
  FRIENDSHIP: "বন্ধুত্ব",
  MYSTERY: "রহস্য",
  DAILY_LIFE: "দৈনন্দিন জীবন",
};

// Shared by the reader's notes panel and the admin editor.
export const noteKindLabel: Record<NoteKind, string> = {
  PRONUNCIATION: "উচ্চারণ",
  GRAMMAR: "ব্যাকরণ",
};

const bnDigits = "০১২৩৪৫৬৭৮৯";

export function toBnDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => bnDigits[Number(d)]);
}

export function levelLabel(level: number): string {
  return `স্তর ${toBnDigits(level)}`;
}

import type { Genre } from "@prisma/client";

export const genreLabel: Record<Genre, string> = {
  FOLKTALE: "লোককথা",
  ADVENTURE: "অভিযান",
  FAMILY: "পরিবার",
  FRIENDSHIP: "বন্ধুত্ব",
  MYSTERY: "রহস্য",
  DAILY_LIFE: "দৈনন্দিন জীবন",
};

const bnDigits = "০১২৩৪৫৬৭৮৯";

export function toBnDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => bnDigits[Number(d)]);
}

export function levelLabel(level: number): string {
  return `স্তর ${toBnDigits(level)}`;
}

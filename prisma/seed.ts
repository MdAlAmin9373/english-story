// Seeds one original story. Upserts only, so it is safe to re-run.
// Run with: npx prisma db seed  (Node 24 runs this .ts file directly)
import prismaClient from "@prisma/client";

const { PrismaClient } = prismaClient;
const db = new PrismaClient();

type SeedChapter = {
  titleBn: string;
  titleEn: string;
  requiresLogin: boolean;
  sentences: [bn: string, en: string][];
};

const story = {
  slug: "the-red-kite-by-the-river",
  titleBn: "নদীর ধারের লাল ঘুড়ি",
  titleEn: "The Red Kite by the River",
  summaryBn:
    "রাতুল একটি লাল ঘুড়ি বানায়। বাতাসে ঘুড়িটি হারিয়ে যায়, আর তা খুঁজতে গিয়ে সে পায় এক নতুন বন্ধু।",
  summaryEn:
    "Ratul makes a red kite. The wind carries it away, and while looking for it he finds a new friend.",
  genre: "FRIENDSHIP",
  level: 1,
} as const;

const chapters: SeedChapter[] = [
  {
    titleBn: "নতুন ঘুড়ি",
    titleEn: "The New Kite",
    requiresLogin: false,
    sentences: [
      ["রাতুল একটি ছোট গ্রামে থাকে।", "Ratul lives in a small village."],
      ["তার বাড়ির পাশে একটি নদী আছে।", "There is a river next to his house."],
      ["এক সকালে সে একটি ঘুড়ি বানায়।", "One morning, he makes a kite."],
      ["ঘুড়িটি লাল আর খুব হালকা।", "The kite is red and very light."],
      ["সে ঘুড়িটি নিয়ে নদীর ধারে যায়।", "He takes the kite to the riverbank."],
      ["আজ আকাশ পরিষ্কার আর বাতাস জোরালো।", "Today the sky is clear and the wind is strong."],
      ["রাতুল হাসে আর ঘুড়িটি ওড়ায়।", "Ratul smiles and flies the kite."],
    ],
  },
  {
    titleBn: "হারানো ঘুড়ি",
    titleEn: "The Lost Kite",
    requiresLogin: true,
    sentences: [
      ["ঘুড়িটি অনেক উঁচুতে উঠে যায়।", "The kite goes up very high."],
      ["হঠাৎ সুতাটি ছিঁড়ে যায়।", "Suddenly, the string breaks."],
      ["বাতাস ঘুড়িটিকে নদীর ওপারে নিয়ে যায়।", "The wind carries the kite across the river."],
      ["রাতুল দুঃখ পায়, কিন্তু সে হাল ছাড়ে না।", "Ratul feels sad, but he does not give up."],
      ["সে সেতু পার হয়ে অন্য পাড়ে যায়।", "He crosses the bridge to the other bank."],
      ["সেখানে একটি বড় আমগাছ দাঁড়িয়ে আছে।", "A big mango tree stands there."],
      ["তার ডালে লাল ঘুড়িটি আটকে আছে।", "The red kite is stuck in its branches."],
    ],
  },
  {
    titleBn: "নতুন বন্ধু",
    titleEn: "A New Friend",
    requiresLogin: true,
    sentences: [
      ["গাছের নিচে একটি মেয়ে বই পড়ছে।", "A girl is reading a book under the tree."],
      ["তার নাম মিতু।", "Her name is Mitu."],
      ["মিতু বলে, \"এটা কি তোমার ঘুড়ি?\"", "Mitu says, \"Is this your kite?\""],
      ["রাতুল মাথা নেড়ে বলে, \"হ্যাঁ, কিন্তু এটা অনেক উঁচুতে।\"", "Ratul nods and says, \"Yes, but it is too high.\""],
      ["মিতু একটি লম্বা বাঁশ নিয়ে আসে।", "Mitu brings a long bamboo pole."],
      ["দুজনে মিলে আস্তে করে ঘুড়িটি নামায়।", "Together, they gently bring the kite down."],
      ["রাতুল বলে, \"ধন্যবাদ! চলো একসাথে ওড়াই।\"", "Ratul says, \"Thank you! Let's fly it together.\""],
      ["সেদিন থেকে তারা দুজন ভালো বন্ধু।", "From that day on, the two of them are good friends."],
    ],
  },
];

async function main() {
  const { slug, ...storyData } = story;
  const savedStory = await db.story.upsert({
    where: { slug },
    create: { slug, ...storyData, status: "PUBLISHED" },
    update: { ...storyData, status: "PUBLISHED" },
  });

  for (const [i, chapter] of chapters.entries()) {
    const order = i + 1;
    const chapterData = {
      titleBn: chapter.titleBn,
      titleEn: chapter.titleEn,
      requiresLogin: chapter.requiresLogin,
      status: "PUBLISHED" as const,
    };
    const savedChapter = await db.chapter.upsert({
      where: { storyId_order: { storyId: savedStory.id, order } },
      create: { storyId: savedStory.id, order, ...chapterData },
      update: chapterData,
    });

    for (const [j, [bn, en]] of chapter.sentences.entries()) {
      const sentenceOrder = j + 1;
      await db.chapterSentence.upsert({
        where: { chapterId_order: { chapterId: savedChapter.id, order: sentenceOrder } },
        create: { chapterId: savedChapter.id, order: sentenceOrder, bn, en },
        update: { bn, en },
      });
    }
  }

  console.log(`Seeded "${story.titleEn}" with ${chapters.length} chapters.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

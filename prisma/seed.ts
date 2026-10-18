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

type SeedWord = {
  word: string;
  meaningBn: string;
  pronunciationBn: string;
  exampleEn: string;
  exampleBn: string;
};

// Important words for chapter 1, in display order.
const chapterOneWords: SeedWord[] = [
  { word: "village", meaningBn: "গ্রাম", pronunciationBn: "ভিলেজ", exampleEn: "My grandmother lives in a quiet village.", exampleBn: "আমার দাদি একটি শান্ত গ্রামে থাকেন।" },
  { word: "river", meaningBn: "নদী", pronunciationBn: "রিভার", exampleEn: "The children swim in the river in summer.", exampleBn: "গ্রীষ্মকালে শিশুরা নদীতে সাঁতার কাটে।" },
  { word: "make", meaningBn: "বানানো, তৈরি করা", pronunciationBn: "মেইক", exampleEn: "Mother makes rice cakes in winter.", exampleBn: "শীতকালে মা পিঠা বানান।" },
  { word: "kite", meaningBn: "ঘুড়ি", pronunciationBn: "কাইট", exampleEn: "Her kite has a long blue tail.", exampleBn: "তার ঘুড়ির একটি লম্বা নীল লেজ আছে।" },
  { word: "light", meaningBn: "হালকা", pronunciationBn: "লাইট", exampleEn: "This bag is light, so I can carry it.", exampleBn: "এই ব্যাগটি হালকা, তাই আমি এটি বইতে পারি।" },
  { word: "take", meaningBn: "নেওয়া, নিয়ে যাওয়া", pronunciationBn: "টেইক", exampleEn: "Please take an umbrella with you.", exampleBn: "দয়া করে সঙ্গে একটি ছাতা নিয়ে যাও।" },
  { word: "strong", meaningBn: "জোরালো, শক্তিশালী", pronunciationBn: "স্ট্রং", exampleEn: "The strong wind shakes the trees.", exampleBn: "জোরালো বাতাস গাছগুলোকে নাড়ায়।" },
  { word: "fly", meaningBn: "ওড়া, ওড়ানো", pronunciationBn: "ফ্লাই", exampleEn: "Birds fly over the field every evening.", exampleBn: "প্রতি সন্ধ্যায় পাখিরা মাঠের ওপর দিয়ে ওড়ে।" },
];

const chapterTwoWords: SeedWord[] = [
  { word: "high", meaningBn: "উঁচু", pronunciationBn: "হাই", exampleEn: "The kite goes up very high.", exampleBn: "ঘুড়িটি অনেক উঁচুতে উঠে যায়।" },
  { word: "suddenly", meaningBn: "হঠাৎ", pronunciationBn: "সাডেনলি", exampleEn: "Suddenly, the string breaks.", exampleBn: "হঠাৎ সুতাটি ছিঁড়ে যায়।" },
  { word: "break", meaningBn: "ভাঙা, ছিঁড়ে যাওয়া", pronunciationBn: "ব্রেক", exampleEn: "The string breaks.", exampleBn: "সুতাটি ছিঁড়ে যায়।" },
  { word: "wind", meaningBn: "বাতাস", pronunciationBn: "উইন্ড", exampleEn: "The wind carries the kite across the river.", exampleBn: "বাতাস ঘুড়িটিকে নদীর ওপারে নিয়ে যায়।" },
  { word: "across", meaningBn: "ওপারে, পেরিয়ে", pronunciationBn: "অ্যাক্রস", exampleEn: "The wind carries the kite across the river.", exampleBn: "বাতাস ঘুড়িটিকে নদীর ওপারে নিয়ে যায়।" },
  { word: "sad", meaningBn: "দুঃখিত", pronunciationBn: "স্যাড", exampleEn: "Ratul feels sad, but he does not give up.", exampleBn: "রাতুল দুঃখ পায়, কিন্তু সে হাল ছাড়ে না।" },
  { word: "cross", meaningBn: "পার হওয়া", pronunciationBn: "ক্রস", exampleEn: "He crosses the bridge to the other bank.", exampleBn: "সে সেতু পার হয়ে অন্য পাড়ে যায়।" },
  { word: "bridge", meaningBn: "সেতু", pronunciationBn: "ব্রিজ", exampleEn: "He crosses the bridge to the other bank.", exampleBn: "সে সেতু পার হয়ে অন্য পাড়ে যায়।" },
];

const chapterThreeWords: SeedWord[] = [
  { word: "read", meaningBn: "পড়া", pronunciationBn: "রিড", exampleEn: "A girl is reading a book under the tree.", exampleBn: "গাছের নিচে একটি মেয়ে বই পড়ছে।" },
  { word: "say", meaningBn: "বলা", pronunciationBn: "ছে", exampleEn: "Mitu says, \"Is this your kite?\"", exampleBn: "মিতু বলে, \"এটা কি তোমার ঘুড়ি?\"" },
  { word: "nod", meaningBn: "মাথা নাড়া", pronunciationBn: "নড", exampleEn: "Ratul nods and says, \"Yes, but it is too high.\"", exampleBn: "রাতুল মাথা নেড়ে বলে, \"হ্যাঁ, কিন্তু এটা অনেক উঁচুতে।\"" },
  { word: "bring", meaningBn: "আনা", pronunciationBn: "ব্রিং", exampleEn: "Mitu brings a long bamboo pole.", exampleBn: "মিতু একটি লম্বা বাঁশ নিয়ে আসে।" },
  { word: "bamboo", meaningBn: "বাঁশ", pronunciationBn: "ব্যাম্বু", exampleEn: "Mitu brings a long bamboo pole.", exampleBn: "মিতু একটি লম্বা বাঁশ নিয়ে আসে।" },
  { word: "gently", meaningBn: "আস্তে করে", pronunciationBn: "জেন্টলি", exampleEn: "Together, they gently bring the kite down.", exampleBn: "দুজনে মিলে আস্তে করে ঘুড়িটি নামায়।" },
  { word: "together", meaningBn: "একসাথে", pronunciationBn: "টুগেদার", exampleEn: "Let's fly it together.", exampleBn: "চলো একসাথে ওড়াই।" },
  { word: "friend", meaningBn: "বন্ধু", pronunciationBn: "ফ্রেন্ড", exampleEn: "The two of them are good friends.", exampleBn: "তারা দুজন ভালো বন্ধু।" },
];

type FormPair = [form: string, exampleEn: string];
// Per time: [simple, continuous, perfect].
type SeedTenses = Record<"PRESENT" | "PAST" | "FUTURE", [FormPair, FormPair, FormPair]>;

const tenseForms: Record<string, SeedTenses> = {
  fly: {
    PRESENT: [
      ["flies", "Ratul flies his kite every Friday."],
      ["is flying", "Ratul is flying his kite right now."],
      ["has flown", "Ratul has flown his kite many times."],
    ],
    PAST: [
      ["flew", "Ratul flew his kite yesterday."],
      ["was flying", "Ratul was flying his kite when the string broke."],
      ["had flown", "Ratul had flown the kite before Mitu came."],
    ],
    FUTURE: [
      ["will fly", "Ratul will fly his kite tomorrow."],
      ["will be flying", "Ratul will be flying his kite at noon."],
      ["will have flown", "Ratul will have flown his kite by evening."],
    ],
  },
  make: {
    PRESENT: [
      ["makes", "Mitu makes tea every morning."],
      ["is making", "Mitu is making a paper boat now."],
      ["has made", "Mitu has made a new kite."],
    ],
    PAST: [
      ["made", "Mitu made a card for her friend yesterday."],
      ["was making", "Mitu was making lunch when it started to rain."],
      ["had made", "Mitu had made her bed before breakfast."],
    ],
    FUTURE: [
      ["will make", "Mitu will make a cake tomorrow."],
      ["will be making", "Mitu will be making toys all afternoon."],
      ["will have made", "Mitu will have made ten kites by Sunday."],
    ],
  },
  take: {
    PRESENT: [
      ["takes", "Ratul takes the bus to school."],
      ["is taking", "Ratul is taking his dog for a walk."],
      ["has taken", "Ratul has taken his books home."],
    ],
    PAST: [
      ["took", "Ratul took a photo of the river."],
      ["was taking", "Ratul was taking a nap when Mitu called."],
      ["had taken", "Ratul had taken his umbrella before the rain started."],
    ],
    FUTURE: [
      ["will take", "Ratul will take the boat across the river."],
      ["will be taking", "Ratul will be taking an exam at ten."],
      ["will have taken", "Ratul will have taken his medicine by night."],
    ],
  },
  break: {
    PRESENT: [
      ["breaks", "The string breaks."],
      ["is breaking", "The string is breaking."],
      ["has broken", "The string has broken."],
    ],
    PAST: [
      ["broke", "The string broke."],
      ["was breaking", "The string was breaking."],
      ["had broken", "The string had broken."],
    ],
    FUTURE: [
      ["will break", "The string will break."],
      ["will be breaking", "The string will be breaking."],
      ["will have broken", "The string will have broken."],
    ],
  },
  cross: {
    PRESENT: [
      ["crosses", "He crosses the bridge."],
      ["is crossing", "He is crossing the bridge."],
      ["has crossed", "He has crossed the bridge."],
    ],
    PAST: [
      ["crossed", "He crossed the bridge."],
      ["was crossing", "He was crossing the bridge."],
      ["had crossed", "He had crossed the bridge."],
    ],
    FUTURE: [
      ["will cross", "He will cross the bridge."],
      ["will be crossing", "He will be crossing the bridge."],
      ["will have crossed", "He will have crossed the bridge."],
    ],
  },
  say: {
    PRESENT: [
      ["says", "Mitu says hello."],
      ["is saying", "Mitu is saying hello."],
      ["has said", "Mitu has said hello."],
    ],
    PAST: [
      ["said", "Mitu said hello."],
      ["was saying", "Mitu was saying hello."],
      ["had said", "Mitu had said hello."],
    ],
    FUTURE: [
      ["will say", "Mitu will say hello."],
      ["will be saying", "Mitu will be saying hello."],
      ["will have said", "Mitu will have said hello."],
    ],
  },
  bring: {
    PRESENT: [
      ["brings", "Mitu brings a pole."],
      ["is bringing", "Mitu is bringing a pole."],
      ["has brought", "Mitu has brought a pole."],
    ],
    PAST: [
      ["brought", "Mitu brought a pole."],
      ["was bringing", "Mitu was bringing a pole."],
      ["had brought", "Mitu had brought a pole."],
    ],
    FUTURE: [
      ["will bring", "Mitu will bring a pole."],
      ["will be bringing", "Mitu will be bringing a pole."],
      ["will have brought", "Mitu will have brought a pole."],
    ],
  },
};

const kinds = ["SIMPLE", "CONTINUOUS", "PERFECT"] as const;

type SeedQuestion = {
  type: "MULTIPLE_CHOICE" | "FILL_GAP";
  promptBn: string;
  promptEn: string; // FILL_GAP marks the blank with "___"
  options: string[];
  correctIndex: number;
};

// Chapter 1 practice, written from its sentences and important words.
const chapterOneQuestions: SeedQuestion[] = [
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "রাতুল কোথায় থাকে?",
    promptEn: "Where does Ratul live?",
    options: ["In a big city", "In a small village", "Near the sea", "In a tall building"],
    correctIndex: 1,
  },
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "\"হালকা\" শব্দটির ইংরেজি কোনটি?",
    promptEn: "Which word means \"not heavy\"?",
    options: ["strong", "light", "river", "kite"],
    correctIndex: 1,
  },
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "রাতুল ঘুড়িটি কোথায় নিয়ে যায়?",
    promptEn: "Where does Ratul take the kite?",
    options: ["To school", "To the market", "To the riverbank", "To his friend's house"],
    correctIndex: 2,
  },
  {
    type: "FILL_GAP",
    promptBn: "আজ আকাশ পরিষ্কার আর বাতাস জোরালো।",
    promptEn: "Today the sky is clear and the wind is ___.",
    options: ["strong", "sad", "small", "quiet"],
    correctIndex: 0,
  },
  {
    type: "FILL_GAP",
    promptBn: "রাতুল হাসে আর ঘুড়িটি ওড়ায়।",
    promptEn: "Ratul smiles and ___ the kite.",
    options: ["fly", "flies", "flying", "flew"],
    correctIndex: 1,
  },
];

// Sentence-ordering game for chapter 1: [Bengali prompt, English sentence].
const chapterOneOrderTasks: [promptBn: string, en: string][] = [
  ["এক সকালে সে একটি ঘুড়ি বানায়।", "One morning, he makes a kite."],
  ["তার বাড়ির পাশে একটি নদী আছে।", "There is a river next to his house."],
];

const chapterTwoQuestions: SeedQuestion[] = [
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "\"bridge\" মানে কী?",
    promptEn: "What does \"bridge\" mean?",
    options: ["নদী", "সেতু", "আমগাছ", "বাঁশ"],
    correctIndex: 1,
  },
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "হঠাৎ সুতাটি ছিঁড়ে গেলে রাতুল কেমন বোধ করে?",
    promptEn: "How does Ratul feel when the string suddenly breaks?",
    options: ["খুশি", "দুঃখিত", "রাগী", "ভীত"],
    correctIndex: 1,
  },
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "কী ঘুড়িটিকে নদীর ওপারে নিয়ে যায়?",
    promptEn: "What carries the kite across the river?",
    options: ["রাতুল", "বাতাস", "মিতু", "সেতু"],
    correctIndex: 1,
  },
  {
    type: "FILL_GAP",
    promptBn: "বাতাস ঘুড়িটিকে নদীর ওপারে নিয়ে যায়।",
    promptEn: "The wind carries the kite ___ the river.",
    options: ["across", "under", "inside", "behind"],
    correctIndex: 0,
  },
  {
    type: "FILL_GAP",
    promptBn: "রাতুল দুঃখ পায়, কিন্তু সে হাল ছাড়ে না।",
    promptEn: "Ratul feels ___, but he does not give up.",
    options: ["sad", "angry", "sleepy", "hungry"],
    correctIndex: 0,
  },
];

const chapterThreeQuestions: SeedQuestion[] = [
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "মেয়েটির নাম কী?",
    promptEn: "What is the girl's name?",
    options: ["মিতু", "রাতুল", "রিনা", "সুমি"],
    correctIndex: 0,
  },
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "\"gently\" মানে কী?",
    promptEn: "What does \"gently\" mean?",
    options: ["জোরে", "আস্তে করে", "দ্রুত", "রাগ করে"],
    correctIndex: 1,
  },
  {
    type: "MULTIPLE_CHOICE",
    promptBn: "ঘুড়িটি নামাতে মিতু কী নিয়ে আসে?",
    promptEn: "What does Mitu bring to get the kite down?",
    options: ["সুতা", "সিঁড়ি", "লম্বা বাঁশ", "দড়ি"],
    correctIndex: 2,
  },
  {
    type: "FILL_GAP",
    promptBn: "মিতু একটি লম্বা বাঁশ নিয়ে আসে।",
    promptEn: "Mitu ___ a long bamboo pole.",
    options: ["brings", "eats", "drops", "loses"],
    correctIndex: 0,
  },
  {
    type: "FILL_GAP",
    promptBn: "চলো একসাথে ওড়াই।",
    promptEn: "Ratul says, \"Thank you! Let's fly it ___.\"",
    options: ["together", "alone", "slowly", "never"],
    correctIndex: 0,
  },
];

const chapterTwoOrderTasks: [promptBn: string, en: string][] = [
  ["ঘুড়িটি অনেক উঁচুতে উঠে যায়।", "The kite goes up very high."],
  ["সে সেতু পার হয়ে অন্য পাড়ে যায়।", "He crosses the bridge to the other bank."],
];

const chapterThreeOrderTasks: [promptBn: string, en: string][] = [
  ["তার নাম মিতু।", "Her name is Mitu."],
  ["দুজনে মিলে আস্তে করে ঘুড়িটি নামায়।", "Together, they gently bring the kite down."],
];

// Practice content per chapter order.
const chapterContent = [
  { order: 1, words: chapterOneWords, questions: chapterOneQuestions, orderTasks: chapterOneOrderTasks },
  { order: 2, words: chapterTwoWords, questions: chapterTwoQuestions, orderTasks: chapterTwoOrderTasks },
  { order: 3, words: chapterThreeWords, questions: chapterThreeQuestions, orderTasks: chapterThreeOrderTasks },
];

// Same rules as checkQuestion in src/features/admin/validate.ts (not importable here).
function assertQuestion(chapterOrder: number, q: SeedQuestion) {
  const where = `Chapter ${chapterOrder}: "${q.promptEn}"`;
  if (q.options.length < 2 || q.options.length > 6) {
    throw new Error(`${where} needs 2 to 6 options.`);
  }
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    throw new Error(`${where} has correctIndex out of range.`);
  }
  if (q.type === "FILL_GAP" && q.promptEn.split("___").length !== 2) {
    throw new Error(`${where} needs exactly one ___.`);
  }
}

function findChapter(storyId: string, order: number) {
  return db.chapter.findUniqueOrThrow({
    where: { storyId_order: { storyId, order } },
    select: { id: true },
  });
}

async function seedVocabulary(storyId: string) {
  let wordCount = 0;
  for (const { order, words } of chapterContent) {
    const { id: chapterId } = await findChapter(storyId, order);
    for (const [i, { word, ...wordData }] of words.entries()) {
      const data = { order: i + 1, ...wordData };
      await db.vocabularyWord.upsert({
        where: { chapterId_word: { chapterId, word } },
        create: { chapterId, word, ...data },
        update: data,
      });
      wordCount++;
    }
  }

  let formCount = 0;
  for (const [word, times] of Object.entries(tenseForms)) {
    for (const [time, cells] of Object.entries(times) as [keyof SeedTenses, SeedTenses[keyof SeedTenses]][]) {
      for (const [k, [form, exampleEn]] of cells.entries()) {
        const kind = kinds[k];
        await db.wordForm.upsert({
          where: { word_time_kind: { word, time, kind } },
          create: { word, time, kind, form, exampleEn },
          update: { form, exampleEn },
        });
        formCount++;
      }
    }
  }

  console.log(`Seeded ${wordCount} words and ${formCount} tense forms.`);
}

async function seedQuiz(storyId: string) {
  let questionCount = 0;
  let taskCount = 0;
  for (const { order: chapterOrder, questions, orderTasks } of chapterContent) {
    const { id: chapterId } = await findChapter(storyId, chapterOrder);

    for (const [i, question] of questions.entries()) {
      const order = i + 1;
      await db.quizQuestion.upsert({
        where: { chapterId_order: { chapterId, order } },
        create: { chapterId, order, ...question },
        update: question,
      });
      questionCount++;
    }

    for (const [i, [promptBn, en]] of orderTasks.entries()) {
      const order = i + 1;
      await db.sentenceOrderTask.upsert({
        where: { chapterId_order: { chapterId, order } },
        create: { chapterId, order, promptBn, en },
        update: { promptBn, en },
      });
      taskCount++;
    }
  }

  console.log(`Seeded ${questionCount} quiz questions and ${taskCount} ordering sentences.`);
}

async function main() {
  // Validate everything before writing anything.
  for (const { order, questions } of chapterContent) {
    for (const q of questions) assertQuestion(order, q);
  }

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

  await seedVocabulary(savedStory.id);
  await seedQuiz(savedStory.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

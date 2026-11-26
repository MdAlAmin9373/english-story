const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const db = new PrismaClient();

async function main() {
  const words = await db.vocabularyWord.findMany({ select: { word: true } });
  const uniqueWords = [...new Set(words.map(w => w.word.trim()))];
  fs.writeFileSync('words.json', JSON.stringify(uniqueWords, null, 2));
  console.log(`✅ ${uniqueWords.length} টি ইউনিক শব্দ words.json ফাইলে সেভ করা হয়েছে!`);
}
main().finally(() => db.$disconnect());
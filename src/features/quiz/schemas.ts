import { z } from "zod";

const idSchema = z.string().min(1).max(64);

export const answerSchema = z.object({
  questionId: idSchema,
  chosenIndex: z.number().int().min(0).max(20),
});

export const orderSchema = z.object({
  taskId: idSchema,
  tokens: z.array(z.string().max(60)).min(1).max(40),
});

export const chapterSchema = z.object({
  chapterId: idSchema,
});

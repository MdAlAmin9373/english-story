import type { ChapterStatus } from "@/features/progress/queries";
import { getChapterQuiz, getSolvedAnswers } from "../queries";
import { ChoiceCard } from "./ChoiceCard";
import { CompleteChapterButton } from "./CompleteChapterButton";
import { FillGapCard } from "./FillGapCard";
import { QuizProgressLine } from "./QuizProgress";
import { SentenceOrderGame } from "./SentenceOrderGame";

// Reads the database: render inside <Suspense>, for a logged-in user, after the access and
// lock checks, inside the page's QuizProgressProvider (seeded from the same status).
export async function ChapterQuiz({
  chapterId,
  userId,
  status,
}: {
  chapterId: string;
  userId: string;
  status: ChapterStatus;
}) {
  const { questions, orderTasks, completed } = await getChapterQuiz(chapterId, userId);

  // Answers are sent only for items this user has already solved.
  const answers = await getSolvedAnswers(
    questions.map((q) => q.id).filter((id) => id in status.solvedQuestions),
    orderTasks.map((t) => t.id).filter((id) => id in status.solvedTasks),
  );

  function solvedQuestion(id: string) {
    const correctIndex = answers.correctIndex.get(id);
    if (correctIndex === undefined) return null;
    return { correctIndex, points: status.solvedQuestions[id] };
  }

  function solvedTask(id: string) {
    const answer = answers.answer.get(id);
    if (answer === undefined) return null;
    return { answer, points: status.solvedTasks[id] };
  }

  return (
    <section aria-labelledby="chapter-quiz" className="flex flex-col gap-4 pt-4">
      {(questions.length > 0 || orderTasks.length > 0) && (
        <div className="flex flex-col gap-1">
          <h2 id="chapter-quiz" className="text-xl font-bold text-ink">
            অনুশীলন
          </h2>
          <QuizProgressLine />
        </div>
      )}

      {questions.length > 0 && (
        <ol className="flex flex-col gap-3">
          {questions.map((q, i) => {
            const Card = q.type === "FILL_GAP" ? FillGapCard : ChoiceCard;
            return (
              <li key={q.id}>
                <Card
                  number={i + 1}
                  questionId={q.id}
                  promptBn={q.promptBn}
                  promptEn={q.promptEn}
                  options={q.options}
                  solved={solvedQuestion(q.id)}
                />
              </li>
            );
          })}
        </ol>
      )}

      {orderTasks.length > 0 && (
        <ul className="flex flex-col gap-3">
          {orderTasks.map((t) => (
            <li key={t.id}>
              <SentenceOrderGame
                taskId={t.id}
                promptBn={t.promptBn}
                tokens={t.tokens}
                solved={solvedTask(t.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <CompleteChapterButton chapterId={chapterId} completed={completed} />
    </section>
  );
}

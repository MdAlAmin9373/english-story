import { pointsForAttempt } from "@/features/progress/progress";
import { getChapterStatus } from "@/features/progress/queries";
import { getChapterQuiz, getSolvedAnswers } from "../queries";
import { ChoiceCard } from "./ChoiceCard";
import { CompleteChapterButton } from "./CompleteChapterButton";
import { FillGapCard } from "./FillGapCard";
import { QuizProgressLine, QuizProgressProvider } from "./QuizProgress";
import { SentenceOrderGame } from "./SentenceOrderGame";

// Reads the database: render inside <Suspense>, for a logged-in user, after the access check.
export async function ChapterQuiz({ chapterId, userId }: { chapterId: string; userId: string }) {
  const [{ questions, orderTasks, completed }, status] = await Promise.all([
    getChapterQuiz(chapterId, userId),
    getChapterStatus(chapterId, userId),
  ]);

  // Answers are sent only for items this user has already solved.
  const firstCorrect = (summary: typeof status.quiz, id: string) =>
    summary.get(id)?.firstCorrect ?? null;
  const solvedQuestionIds = questions.map((q) => q.id).filter((id) => firstCorrect(status.quiz, id));
  const solvedTaskIds = orderTasks.map((t) => t.id).filter((id) => firstCorrect(status.order, id));
  const answers = await getSolvedAnswers(solvedQuestionIds, solvedTaskIds);

  function solvedQuestion(id: string) {
    const correctIndex = answers.correctIndex.get(id);
    if (correctIndex === undefined) return null;
    return { correctIndex, points: pointsForAttempt(firstCorrect(status.quiz, id)) };
  }

  function solvedTask(id: string) {
    const answer = answers.answer.get(id);
    if (answer === undefined) return null;
    return { answer, points: pointsForAttempt(firstCorrect(status.order, id)) };
  }

  return (
    <QuizProgressProvider
      questionTotal={questions.length}
      taskTotal={orderTasks.length}
      solvedQuestionIds={solvedQuestionIds}
      solvedTaskIds={solvedTaskIds}
    >
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
    </QuizProgressProvider>
  );
}

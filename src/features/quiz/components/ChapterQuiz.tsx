import { getChapterQuiz } from "../queries";
import { ChoiceCard } from "./ChoiceCard";
import { CompleteChapterButton } from "./CompleteChapterButton";
import { FillGapCard } from "./FillGapCard";
import { SentenceOrderGame } from "./SentenceOrderGame";

// Reads the database: render inside <Suspense>, for a logged-in user, after the access check.
export async function ChapterQuiz({ chapterId, userId }: { chapterId: string; userId: string }) {
  const { questions, orderTasks, completed } = await getChapterQuiz(chapterId, userId);

  return (
    <section aria-labelledby="chapter-quiz" className="flex flex-col gap-4 pt-4">
      {(questions.length > 0 || orderTasks.length > 0) && (
        <h2 id="chapter-quiz" className="text-xl font-bold text-ink">
          অনুশীলন
        </h2>
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
              <SentenceOrderGame taskId={t.id} promptBn={t.promptBn} tokens={t.tokens} />
            </li>
          ))}
        </ul>
      )}

      <CompleteChapterButton chapterId={chapterId} completed={completed} />
    </section>
  );
}

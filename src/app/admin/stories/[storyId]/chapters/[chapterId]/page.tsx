import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  createQuestion,
  createSentence,
  createWord,
  moveChapterItem,
  updateChapter,
  updateQuestion,
  updateSentence,
  updateWord,
} from "@/features/admin/actions";
import { ChapterForm } from "@/features/admin/components/ChapterForm";
import { MoveButtons } from "@/features/admin/components/MoveButtons";
import { QuestionForm, questionTypeLabel } from "@/features/admin/components/QuestionForm";
import { SentenceForm } from "@/features/admin/components/SentenceForm";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { VocabWordForm } from "@/features/admin/components/VocabWordForm";
import { getAdminChapter } from "@/features/admin/queries";
import type { ChapterItemKind } from "@/features/admin/schemas";
import { requireAdmin } from "@/features/auth/session";
import { toBnDigits } from "@/features/stories/labels";

export default function EditChapterPage({
  params,
}: PageProps<"/admin/stories/[storyId]/chapters/[chapterId]">) {
  return (
    <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
      <EditChapter params={params} />
    </Suspense>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
async function EditChapter({
  params,
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  const { storyId, chapterId } = await params;
  await requireAdmin(`/admin/stories/${storyId}/chapters/${chapterId}`);
  const chapter = await getAdminChapter(storyId, chapterId);
  if (!chapter) notFound();

  return (
    <>
      <Link
        href={`/admin/stories/${chapter.story.id}`}
        className="text-sm text-ink-muted hover:text-accent"
      >
        ← {chapter.story.titleBn}
      </Link>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-accent">অধ্যায় {toBnDigits(chapter.order)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">{chapter.titleBn}</h1>
          <StatusBadge status={chapter.status} />
        </div>
      </header>

      <section className="rounded-xl border border-navy-800 bg-navy-900 p-4 sm:p-6">
        <ChapterForm
          action={updateChapter.bind(null, chapter.id)}
          chapter={chapter}
          submitLabel="সংরক্ষণ করুন"
        />
      </section>

      <EditorSection
        title="বাক্য জোড়া"
        count={chapter.sentences.length}
        addTitle="নতুন বাক্য জোড়া"
        addForm={
          <SentenceForm
            action={createSentence.bind(null, chapter.id)}
            submitLabel="বাক্য যোগ করুন"
          />
        }
      >
        {chapter.sentences.map((sentence, i, all) => (
          <ItemCard
            key={sentence.id}
            kind="sentence"
            id={sentence.id}
            index={i}
            total={all.length}
            preview={
              <>
                <span className="text-ink">{sentence.bn}</span>
                <span lang="en" className="text-sm text-ink-muted">
                  {sentence.en}
                </span>
              </>
            }
          >
            <SentenceForm
              action={updateSentence.bind(null, sentence.id)}
              sentence={sentence}
              submitLabel="সংরক্ষণ করুন"
            />
          </ItemCard>
        ))}
      </EditorSection>

      <EditorSection
        title="গুরুত্বপূর্ণ শব্দ"
        count={chapter.words.length}
        addTitle="নতুন শব্দ"
        addForm={
          <VocabWordForm action={createWord.bind(null, chapter.id)} submitLabel="শব্দ যোগ করুন" />
        }
      >
        {chapter.words.map((word, i, all) => (
          <ItemCard
            key={word.id}
            kind="word"
            id={word.id}
            index={i}
            total={all.length}
            preview={
              <span>
                <span lang="en" className="font-semibold text-ink">
                  {word.word}
                </span>{" "}
                <span className="text-ink-muted">
                  ({word.pronunciationBn}) — {word.meaningBn}
                </span>
              </span>
            }
          >
            <VocabWordForm
              action={updateWord.bind(null, word.id)}
              word={word}
              submitLabel="সংরক্ষণ করুন"
            />
          </ItemCard>
        ))}
      </EditorSection>

      <EditorSection
        title="কুইজ প্রশ্ন"
        count={chapter.quizQuestions.length}
        addTitle="নতুন প্রশ্ন"
        addForm={
          <QuestionForm
            action={createQuestion.bind(null, chapter.id)}
            submitLabel="প্রশ্ন যোগ করুন"
          />
        }
      >
        {chapter.quizQuestions.map((question, i, all) => (
          <ItemCard
            key={question.id}
            kind="question"
            id={question.id}
            index={i}
            total={all.length}
            preview={
              <>
                <span className="text-xs text-accent">{questionTypeLabel[question.type]}</span>
                <span className="text-ink">{question.promptBn}</span>
                <span lang="en" className="text-sm text-ink-muted">
                  {question.promptEn}
                </span>
                <span className="text-sm text-emerald-300">
                  ✓ {question.options[question.correctIndex] ?? "—"}
                </span>
              </>
            }
          >
            <QuestionForm
              action={updateQuestion.bind(null, question.id)}
              question={question}
              submitLabel="সংরক্ষণ করুন"
            />
          </ItemCard>
        ))}
      </EditorSection>
    </>
  );
}

function EditorSection({
  title,
  count,
  addTitle,
  addForm,
  children,
}: {
  title: string;
  count: number;
  addTitle: string;
  addForm: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-ink">
        {title} <span className="text-base text-ink-muted">({toBnDigits(count)})</span>
      </h2>
      {count === 0 ? (
        <p className="text-ink-muted">এখনো কিছু যোগ করা হয়নি।</p>
      ) : (
        <ol className="flex flex-col gap-2">{children}</ol>
      )}
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-navy-700 p-4">
        <h3 className="font-semibold text-accent">+ {addTitle}</h3>
        {addForm}
      </div>
    </section>
  );
}

// One row: a short preview with ↑/↓, and the edit form folded inside <details>.
function ItemCard({
  kind,
  id,
  index,
  total,
  preview,
  children,
}: {
  kind: ChapterItemKind;
  id: string;
  index: number;
  total: number;
  preview: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-navy-800 bg-navy-900 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2">
          <span className="text-sm text-accent">{toBnDigits(index + 1)}.</span>
          <div className="flex min-w-0 flex-col gap-0.5 break-words">{preview}</div>
        </div>
        <MoveButtons
          action={moveChapterItem}
          id={id}
          kind={kind}
          isFirst={index === 0}
          isLast={index === total - 1}
        />
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-accent">সম্পাদনা</summary>
        <div className="pt-3">{children}</div>
      </details>
    </li>
  );
}

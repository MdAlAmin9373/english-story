import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  createOrderTask,
  createQuestion,
  createSentence,
  createWord,
  moveChapterItem,
  saveWordForms,
  updateChapter,
  updateOrderTask,
  updateQuestion,
  updateSentence,
  updateWord,
} from "@/features/admin/actions";
import { ChapterForm } from "@/features/admin/components/ChapterForm";
import { secondaryButtonClass } from "@/features/admin/components/fields";
import { MoveButtons } from "@/features/admin/components/MoveButtons";
import { questionTypeLabel } from "@/features/admin/constants";
import { OrderTaskForm } from "@/features/admin/components/OrderTaskForm";
import { QuestionForm } from "@/features/admin/components/QuestionForm";
import { SentenceForm } from "@/features/admin/components/SentenceForm";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { TenseGridForm } from "@/features/admin/components/TenseGridForm";
import { VocabWordForm } from "@/features/admin/components/VocabWordForm";
import { getAdminChapter } from "@/features/admin/queries";
import type { ChapterItemKind } from "@/features/admin/schemas";
import { countWords } from "@/features/admin/validate";
import { requireAdmin } from "@/features/auth/session";
import { toBnDigits } from "@/features/stories/labels";
import { tenseKinds, tenseTimes } from "@/features/vocab/tense-table";

const TENSE_CELL_COUNT = tenseTimes.length * tenseKinds.length;

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

  const previewHref = `/admin/stories/${chapter.story.id}/chapters/${chapter.id}/preview`;
  const wordsWithAllForms = chapter.words.filter(
    (w) => (chapter.formsByWord[w.word]?.length ?? 0) >= TENSE_CELL_COUNT,
  ).length;
  const steps = [
    { href: "#sentences", label: `বাক্য (${toBnDigits(chapter.sentences.length)})` },
    { href: "#words", label: `শব্দ (${toBnDigits(chapter.words.length)})` },
    { href: "#questions", label: `প্রশ্ন (${toBnDigits(chapter.quizQuestions.length)})` },
    {
      href: "#tense-forms",
      label: `কালের রূপ (${toBnDigits(wordsWithAllForms)}/${toBnDigits(chapter.words.length)})`,
    },
    { href: "#order-tasks", label: `বাক্য সাজানো (${toBnDigits(chapter.orderTasks.length)})` },
    { href: previewHref, label: "প্রিভিউ" },
  ];

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
          <Link href={previewHref} className={`${secondaryButtonClass} ml-auto`}>
            প্রিভিউ
          </Link>
        </div>
      </header>

      {/* Fill a chapter in this order; each step jumps to its section below. */}
      <nav
        aria-label="অধ্যায় তৈরির ধাপ"
        className="rounded-xl border border-navy-800 bg-navy-900 p-3"
      >
        <ol className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {steps.map((step, i) => (
            <li key={step.href}>
              <Link href={step.href} className="text-ink-muted hover:text-accent">
                <span className="text-accent">{toBnDigits(i + 1)}.</span> {step.label}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <section className="rounded-xl border border-navy-800 bg-navy-900 p-4 sm:p-6">
        <ChapterForm
          action={updateChapter.bind(null, chapter.id)}
          chapter={chapter}
          submitLabel="সংরক্ষণ করুন"
        />
      </section>

      <EditorSection
        id="sentences"
        step={1}
        title="বাক্য"
        count={chapter.sentences.length}
        emptyText="এখনও কোনো বাক্য যোগ করা হয়নি।"
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
        id="words"
        step={2}
        title="শব্দ"
        count={chapter.words.length}
        emptyText="এখনও কোনো শব্দ যোগ করা হয়নি।"
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
              <>
                <span>
                  <span lang="en" className="font-semibold text-ink">
                    {word.word}
                  </span>{" "}
                  <span className="text-ink-muted">
                    ({word.pronunciationBn}) — {word.meaningBn}
                  </span>
                </span>
                <span className="text-xs text-ink-muted">
                  কালের রূপ: {toBnDigits(chapter.formsByWord[word.word]?.length ?? 0)}/
                  {toBnDigits(TENSE_CELL_COUNT)}
                </span>
              </>
            }
            extra={
              <details>
                <summary className="cursor-pointer text-sm text-accent">
                  কালের রূপ (৯টি ঘর)
                </summary>
                <div className="pt-3">
                  <TenseGridForm
                    action={saveWordForms.bind(null, word.id)}
                    word={word.word}
                    forms={chapter.formsByWord[word.word] ?? []}
                  />
                </div>
              </details>
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
        id="questions"
        step={3}
        title="প্রশ্ন"
        count={chapter.quizQuestions.length}
        emptyText="এখনও কোনো প্রশ্ন যোগ করা হয়নি।"
        addTitle="নতুন প্রশ্ন"
        addForm={
          <>
            <p className="text-sm text-ink-muted">
              ধরন বেছে নিন: {questionTypeLabel.MULTIPLE_CHOICE} বা {questionTypeLabel.FILL_GAP}।
            </p>
            <QuestionForm
              action={createQuestion.bind(null, chapter.id)}
              submitLabel="প্রশ্ন যোগ করুন"
            />
          </>
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

      {/* The grids themselves live under each word (step ২); this block keeps step ৪ visible. */}
      <section id="tense-forms" className="flex scroll-mt-4 flex-col gap-2">
        <h2 className="text-xl font-semibold text-ink">
          <span className="text-accent">{toBnDigits(4)}.</span> কালের রূপ{" "}
          <span className="text-base text-ink-muted">
            ({toBnDigits(wordsWithAllForms)}/{toBnDigits(chapter.words.length)})
          </span>
        </h2>
        <p className="text-ink-muted">
          {chapter.words.length === 0
            ? "প্রথমে শব্দ যোগ করুন — প্রতিটি শব্দের নিচে কালের রূপের ঘর দেখাবে।"
            : `ওপরের প্রতিটি শব্দের নিচে "কালের রূপ (${toBnDigits(TENSE_CELL_COUNT)}টি ঘর)" খুলে পূরণ করুন।`}
        </p>
      </section>

      <EditorSection
        id="order-tasks"
        step={5}
        title="বাক্য সাজানো"
        count={chapter.orderTasks.length}
        emptyText="এখনও কোনো বাক্য সাজানোর কাজ যোগ করা হয়নি।"
        addTitle="নতুন বাক্য সাজানোর কাজ"
        addForm={
          <OrderTaskForm
            action={createOrderTask.bind(null, chapter.id)}
            submitLabel="কাজ যোগ করুন"
          />
        }
      >
        {chapter.orderTasks.map((task, i, all) => (
          <ItemCard
            key={task.id}
            kind="orderTask"
            id={task.id}
            index={i}
            total={all.length}
            preview={
              <>
                <span className="text-ink">{task.promptBn}</span>
                <span lang="en" className="text-sm text-ink-muted">
                  {task.en}
                </span>
                <span className="text-xs text-ink-muted">
                  {toBnDigits(countWords(task.en))}টি শব্দ
                </span>
              </>
            }
          >
            <OrderTaskForm
              action={updateOrderTask.bind(null, task.id)}
              task={task}
              submitLabel="সংরক্ষণ করুন"
            />
          </ItemCard>
        ))}
      </EditorSection>
    </>
  );
}

// Heading, list (or empty line) and add form; the add form always renders, even with no rows.
function EditorSection({
  id,
  step,
  title,
  count,
  emptyText,
  addTitle,
  addForm,
  children,
}: {
  id: string;
  step: number;
  title: string;
  count: number;
  emptyText: string;
  addTitle: string;
  addForm: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-3">
      <h2 className="text-xl font-semibold text-ink">
        <span className="text-accent">{toBnDigits(step)}.</span> {title}{" "}
        <span className="text-base text-ink-muted">({toBnDigits(count)})</span>
      </h2>
      {count === 0 ? (
        <p className="text-ink-muted">{emptyText}</p>
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
// `extra` adds more folded sections below (e.g. a word's tense grid).
function ItemCard({
  kind,
  id,
  index,
  total,
  preview,
  extra,
  children,
}: {
  kind: ChapterItemKind;
  id: string;
  index: number;
  total: number;
  preview: ReactNode;
  extra?: ReactNode;
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
      {extra}
    </li>
  );
}

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const revealHint = vi.hoisted(() => vi.fn());
vi.mock("@/features/quiz/actions", () => ({ revealHint }));

const { HintPanel } = await import("@/features/quiz/components/HintPanel");

const HINT = "প্রথম লাইন\nSecond line";
const BUTTON = "💡 ইঙ্গিত দেখুন";
const PENALTY = "ইঙ্গিত দেখলে এই প্রশ্নে সর্বোচ্চ ১ নম্বর পাবেন।";

type Props = Partial<Parameters<typeof HintPanel>[0]>;
const renderPanel = (props: Props = {}) =>
  render(<HintPanel kind="question" id="q1" hasHint initialHint={null} solved={false} {...props} />);
const button = () => screen.queryByRole("button");

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => revealHint.mockReset());
afterEach(cleanup);

describe("HintPanel", () => {
  test("no hint: renders nothing", () => {
    const { container } = renderPanel({ hasHint: false });
    expect(container.innerHTML).toBe("");
  });

  test("unsolved with a hint: the button and the penalty note, no hint text", () => {
    renderPanel();
    expect(button()?.textContent).toBe(BUTTON);
    expect(screen.getByText(PENALTY)).toBeDefined();
    expect(screen.queryByRole("note")).toBeNull();
  });

  test("solved and never revealed: no button", () => {
    renderPanel({ solved: true });
    expect(button()).toBeNull();
    expect(screen.queryByText(PENALTY)).toBeNull();
  });

  test("click: loading state, then the hint in a live note with line breaks", async () => {
    const reply = deferred<{ ok: true; hint: string }>();
    revealHint.mockReturnValue(reply.promise);
    renderPanel({ kind: "task", id: "t1" });

    fireEvent.click(button()!);
    expect(revealHint).toHaveBeenCalledWith({ kind: "task", id: "t1" });
    expect(button()?.textContent).toBe("লোড হচ্ছে…");
    expect((button() as HTMLButtonElement).disabled).toBe(true);

    await act(async () => reply.resolve({ ok: true, hint: HINT }));
    const note = screen.getByRole("note", { name: "ইঙ্গিত" });
    expect(note.textContent).toContain(HINT);
    expect(note.querySelector(".whitespace-pre-line")?.textContent).toBe(HINT);
    expect(note.closest("[aria-live='polite']")).not.toBeNull();
    expect(button()).toBeNull();
    expect(screen.queryByText(PENALTY)).toBeNull();
  });

  test("server error: short message, the button stays usable", async () => {
    revealHint.mockResolvedValueOnce({ ok: false, error: "আগের অধ্যায় শেষ করুন।" });
    renderPanel();
    await act(async () => fireEvent.click(button()!));

    const message = screen.getByText("আগের অধ্যায় শেষ করুন।");
    expect(message.closest("[aria-live='polite']")).not.toBeNull();
    expect((button() as HTMLButtonElement).disabled).toBe(false);
    expect(button()?.textContent).toBe(BUTTON);

    revealHint.mockResolvedValueOnce({ ok: true, hint: HINT });
    await act(async () => fireEvent.click(button()!));
    expect(screen.getByRole("note")).toBeDefined();
    expect(screen.queryByText("আগের অধ্যায় শেষ করুন।")).toBeNull();
  });

  test("network failure: generic Bengali message, the button stays usable", async () => {
    revealHint.mockRejectedValueOnce(new Error("offline"));
    renderPanel();
    await act(async () => fireEvent.click(button()!));
    expect(screen.getByText("ইঙ্গিত আনা যায়নি। আবার চেষ্টা করুন।")).toBeDefined();
    expect((button() as HTMLButtonElement).disabled).toBe(false);
  });

  test("after a reload: an already revealed hint is shown without asking again", () => {
    renderPanel({ initialHint: HINT, solved: true });
    expect(screen.getByRole("note").textContent).toContain(HINT);
    expect(button()).toBeNull();
    expect(revealHint).not.toHaveBeenCalled();
  });

  test("HTML in a hint is shown as text", () => {
    renderPanel({ initialHint: "<img src=x onerror=alert(1)>" });
    const note = screen.getByRole("note");
    expect(note.querySelector("img")).toBeNull();
    expect(note.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});

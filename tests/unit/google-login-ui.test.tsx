import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const formStatus = vi.hoisted(() => ({ pending: false }));

vi.mock("@/features/auth/google/actions", () => ({ startGoogleLogin: vi.fn() }));
vi.mock("@/features/auth/actions", () => ({ requestOtp: vi.fn() }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => formStatus,
}));

const { LoginOptions } = await import("@/features/auth/components/LoginOptions");
const { googleErrorMessage } = await import("@/features/auth/google/errors");

const GOOGLE = "Google দিয়ে লগইন করুন";
const DIVIDER = "অথবা ইমেইল দিয়ে";

// Same mapping the /login page does with ?error=.
const renderWithError = (error?: unknown, next = "/dashboard") =>
  render(<LoginOptions next={next} errorMessage={googleErrorMessage(error)} />);

const googleButton = () => screen.getByRole("button", { name: GOOGLE });

beforeEach(() => {
  formStatus.pending = false;
});
afterEach(cleanup);

describe("LoginOptions", () => {
  test("Google button, divider, then the email form, in that order", () => {
    renderWithError();
    const divider = screen.getByText(DIVIDER);
    const email = screen.getByLabelText("ইমেইল ঠিকানা");
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(googleButton(), divider)).toBe(true);
    expect(follows(divider, email)).toBe(true);
    expect(screen.getByText("আপনার ইমেইলে একটি ৬ সংখ্যার কোড পাঠানো হবে।")).toBeTruthy();
  });

  test("the Google button is a POST form submit, not a link", () => {
    renderWithError();
    expect(googleButton().getAttribute("type")).toBe("submit");
    expect(googleButton().closest("form")).not.toBeNull();
    expect(screen.queryByRole("link", { name: GOOGLE })).toBeNull();
  });

  test("next is passed to the Google form", () => {
    renderWithError(undefined, "/stories/x/2");
    const form = googleButton().closest("form")!;
    const hidden = form.querySelector<HTMLInputElement>('input[name="next"]');
    expect(hidden?.value).toBe("/stories/x/2");
  });

  test("known error code: its message is shown above the Google button", () => {
    renderWithError("google_expired");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("লগইনের সময় শেষ হয়ে গেছে। আবার চেষ্টা করুন।");
    expect(
      alert.compareDocumentPosition(googleButton()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test.each([undefined, "", "unknown", "<script>x</script>", "__proto__", ["google_failed"]])(
    "unknown ?error= value %j shows nothing",
    (error) => {
      renderWithError(error);
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  test("button is disabled with a waiting label while submitting", () => {
    formStatus.pending = true;
    renderWithError();
    const button = screen.getByRole("button", { name: "Google-এ যাওয়া হচ্ছে…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  test("button uses theme tokens only (no fixed colors)", () => {
    renderWithError();
    const cls = googleButton().className;
    expect(cls).toMatch(/\bbg-surface\b/);
    expect(cls).toMatch(/\btext-ink\b/);
    expect(cls).not.toMatch(/\b(white|black|gray|slate|zinc|neutral|blue)\b|\[#|-(?:50|[1-9]00|950)\b/);
  });
});

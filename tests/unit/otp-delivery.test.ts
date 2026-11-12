// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const serverState = vi.hoisted(() => ({ OTP_DELIVERY: "resend" as "resend" | "console" }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  serverEnv: () => ({ OTP_PEPPER: "p".repeat(32), OTP_DELIVERY: serverState.OTP_DELIVERY }),
}));

const { RESEND_API_URL, RESEND_TIMEOUT_MS, deliverOtp } = await import("@/features/auth/delivery");
const { OtpDeliveryError } = await import("@/features/auth/delivery-error");
const { resendEnv, EnvConfigError } = await import("@/lib/env");

const KEY = "re_test_SECRETKEY_123";
const FROM = "English Story <login@netenglish.online>";
const EMAIL = "learner@example.com";
const CODE = "482913";

const fetchMock = vi.fn();

beforeEach(() => {
  serverState.OTP_DELIVERY = "resend";
  vi.stubEnv("RESEND_API_KEY", KEY);
  vi.stubEnv("EMAIL_FROM", FROM);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function failure(p: Promise<unknown>): Promise<InstanceType<typeof OtpDeliveryError>> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(OtpDeliveryError);
    return err as InstanceType<typeof OtpDeliveryError>;
  }
  throw new Error("expected a delivery failure");
}

describe("resend mode", () => {
  test("posts the email to Resend with the right URL, headers and body", async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"abc"}', { status: 200 }));
    await deliverOtp(EMAIL, CODE);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(RESEND_API_URL).toBe(url);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(["from", "html", "subject", "text", "to"]);
    expect(body.from).toBe(FROM);
    expect(body.to).toEqual([EMAIL]);
    expect(body.subject).toBe("English Story লগইন কোড");
    expect(body.subject).not.toContain(CODE);
    expect(body.text).toContain(CODE);
    expect(body.html).toContain(`>${CODE}</p>`);
  });

  test("any 2xx is a success", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    await expect(deliverOtp(EMAIL, CODE)).resolves.toBeUndefined();
  });

  test.each([400, 401, 403, 422, 429, 500, 503])("HTTP %i is an http failure with the status", async (status) => {
    fetchMock.mockResolvedValue(new Response(`{"message":"bad ${EMAIL}"}`, { status }));
    const err = await failure(deliverOtp(EMAIL, CODE));
    expect(err.category).toBe("http");
    expect(err.detail).toBe(status);
    expect(err.message).not.toContain(EMAIL);
  });

  test("a network error is a network failure and its message is dropped", async () => {
    fetchMock.mockRejectedValue(new TypeError(`fetch failed for ${EMAIL} ${KEY}`));
    const err = await failure(deliverOtp(EMAIL, CODE));
    expect(err.category).toBe("network");
    expect(err.detail).toBeUndefined();
    expect(err.message).not.toContain(EMAIL);
    expect(err.message).not.toContain(KEY);
  });

  test("no answer within 10 seconds is a timeout and the request is aborted", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal = init.signal!;
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );

    const pending = failure(deliverOtp(EMAIL, CODE));
    await vi.advanceTimersByTimeAsync(RESEND_TIMEOUT_MS - 1);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    const err = await pending;
    expect(RESEND_TIMEOUT_MS).toBe(10_000);
    expect(signal?.aborted).toBe(true);
    expect(err.category).toBe("timeout");
  });

  test.each([
    ["RESEND_API_KEY", undefined],
    ["RESEND_API_KEY", ""],
    ["RESEND_API_KEY", "sk_live_123"],
    ["RESEND_API_KEY", "re_ has space"],
    ["EMAIL_FROM", undefined],
    ["EMAIL_FROM", "not-an-email"],
    ["EMAIL_FROM", "English Story <login@netenglish.online"],
    ["EMAIL_FROM", "Bad\r\nBcc: x@y.z <login@netenglish.online>"],
  ])("%s = %j is a config failure naming only that variable; nothing is sent", async (name, value) => {
    vi.stubEnv(name, value);
    const err = await failure(deliverOtp(EMAIL, CODE));
    expect(err.category).toBe("config");
    expect(err.detail).toBe(name);
    expect(fetchMock).not.toHaveBeenCalled();
    if (value) expect(err.message).not.toContain(value);
  });

  test("both variables missing names both", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("EMAIL_FROM", undefined);
    const err = await failure(deliverOtp(EMAIL, CODE));
    expect(err.detail).toBe("RESEND_API_KEY, EMAIL_FROM");
  });
});

describe("resendEnv", () => {
  test.each([
    "English Story <login@netenglish.online>",
    "login@netenglish.online",
    "<login@netenglish.online>",
  ])("accepts EMAIL_FROM %j", (from) => {
    expect(resendEnv({ RESEND_API_KEY: KEY, EMAIL_FROM: from }).EMAIL_FROM).toBe(from);
  });

  test("the error names variables only, never values", () => {
    try {
      resendEnv({ RESEND_API_KEY: "secret-without-prefix", EMAIL_FROM: FROM });
      throw new Error("expected an error");
    } catch (err) {
      expect(err).toBeInstanceOf(EnvConfigError);
      expect((err as InstanceType<typeof EnvConfigError>).variables).toEqual(["RESEND_API_KEY"]);
      expect((err as Error).message).toBe("Invalid server environment variables: RESEND_API_KEY");
    }
  });
});

describe("console mode (unchanged)", () => {
  beforeEach(() => {
    serverState.OTP_DELIVERY = "console";
  });

  test("prints the code in development and calls nothing", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    await deliverOtp(EMAIL, CODE);
    expect(info).toHaveBeenCalledExactlyOnceWith(`[otp] login code for ${EMAIL}: ${CODE}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("is refused in production", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    const err = await failure(deliverOtp(EMAIL, CODE));
    expect(err.category).toBe("config");
    expect(err.detail).toBe("OTP_DELIVERY");
    expect(info).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

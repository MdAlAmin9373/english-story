// @vitest-environment node
import { describe, expect, test } from "vitest";
import { OTP_TTL_MS } from "@/features/auth/otp";
import {
  OTP_EMAIL_SITE_URL,
  OTP_EMAIL_SUBJECT,
  buildOtpEmail,
  escapeHtml,
} from "@/features/auth/otp-email";

const CODE = "482913";
const REQUIRED_LINES = [
  "কোডটি ১০ মিনিট কাজ করবে।",
  "এই কোড কাউকে দেবেন না। English Story কখনো আপনার কাছে কোড চাইবে না।",
  "আপনি কোড না চাইলে এই ইমেইল উপেক্ষা করুন।",
];

describe("buildOtpEmail", () => {
  const email = buildOtpEmail(CODE);

  test("subject is fixed and never contains the code", () => {
    expect(email.subject).toBe("English Story লগইন কোড");
    expect(OTP_EMAIL_SUBJECT).toBe(email.subject);
    expect(email.subject).not.toMatch(/\d/);
  });

  test("plain text has the code on its own line, every required line and the site link", () => {
    expect(email.text.split("\n")).toContain(CODE);
    for (const line of REQUIRED_LINES) expect(email.text).toContain(line);
    expect(email.text).toContain("https://netenglish.online");
  });

  test("html has the code, every required line and the site link", () => {
    expect(email.html).toContain(`>${CODE}</p>`);
    for (const line of REQUIRED_LINES) expect(email.html).toContain(line);
    expect(email.html).toContain(`<a href="${OTP_EMAIL_SITE_URL}"`);
    expect(email.html).toContain('<html lang="bn">');
    expect(email.html).toContain('<meta charset="utf-8">');
  });

  test("the code is large and selectable in one tap", () => {
    expect(email.html).toMatch(/font-size:36px;[^"]*user-select:all/);
  });

  test("html loads nothing external and has no tracking", () => {
    expect(email.html).not.toMatch(/<img|<script|<link|<iframe|url\(|@import|src=/i);
    // The only URL is the visible site link.
    const urls = email.html.match(/https?:\/\/[^\s"<]+/g) ?? [];
    expect(new Set(urls)).toEqual(new Set([OTP_EMAIL_SITE_URL]));
  });

  test("the text says 10 minutes, matching the real code lifetime", () => {
    expect(OTP_TTL_MS).toBe(10 * 60 * 1000);
  });

  test.each(["12345", "1234567", "12a456", "<b>12</b>", ""])("rejects a code that is not 6 digits: %j", (bad) => {
    expect(() => buildOtpEmail(bad)).toThrow();
  });
});

describe("escapeHtml", () => {
  test("escapes all five special characters", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });

  test("leaves digits and Bengali text unchanged", () => {
    expect(escapeHtml("123456 কোড")).toBe("123456 কোড");
  });
});

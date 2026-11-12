// The login-code email: subject, plain text and simple HTML, in Bengali.
// Pure (no I/O). No images, remote fonts or tracking; every inserted value is escaped.

export const OTP_EMAIL_SUBJECT = "English Story লগইন কোড"; // never contains the code
export const OTP_EMAIL_SITE_URL = "https://netenglish.online";

const LINES = {
  intro: "আপনার English Story লগইন কোড:",
  validity: "কোডটি ১০ মিনিট কাজ করবে।", // matches OTP_TTL_MS (checked in tests)
  warning: "এই কোড কাউকে দেবেন না। English Story কখনো আপনার কাছে কোড চাইবে না।",
  ignore: "আপনি কোড না চাইলে এই ইমেইল উপেক্ষা করুন।",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type OtpEmail = { subject: string; text: string; html: string };

export function buildOtpEmail(code: string): OtpEmail {
  if (!/^\d{6}$/.test(code)) throw new Error("login code must be 6 digits");

  const text = [
    LINES.intro,
    "",
    code,
    "",
    LINES.validity,
    LINES.warning,
    LINES.ignore,
    "",
    OTP_EMAIL_SITE_URL,
    "",
  ].join("\n");

  const e = escapeHtml;
  const html = `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(OTP_EMAIL_SUBJECT)}</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:rgb(255,255,255);color:rgb(17,24,39);font-family:sans-serif;font-size:16px;line-height:1.6;">
<div style="max-width:480px;margin:0 auto;">
<p style="margin:0 0 12px;">${e(LINES.intro)}</p>
<p style="margin:0 0 20px;font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:8px;user-select:all;-webkit-user-select:all;">${e(code)}</p>
<p style="margin:0 0 8px;">${e(LINES.validity)}</p>
<p style="margin:0 0 8px;font-weight:bold;">${e(LINES.warning)}</p>
<p style="margin:0 0 20px;color:rgb(75,85,99);">${e(LINES.ignore)}</p>
<p style="margin:0;"><a href="${e(OTP_EMAIL_SITE_URL)}" style="color:rgb(29,78,216);">${e(OTP_EMAIL_SITE_URL)}</a></p>
</div>
</body>
</html>
`;

  return { subject: OTP_EMAIL_SUBJECT, text, html };
}

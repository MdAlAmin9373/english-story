import { GoogleLoginButton } from "./GoogleLoginButton";
import { LoginForm } from "./LoginForm";

// Google first, then the email (OTP) form. errorMessage is already mapped from
// a known ?error= code; raw values never reach this component.
export function LoginOptions({
  next,
  errorMessage,
}: {
  next: string;
  errorMessage: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <GoogleLoginButton next={next} />
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <span className="text-sm text-ink-muted">অথবা ইমেইল দিয়ে</span>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      <p className="text-sm text-ink-muted">আপনার ইমেইলে একটি ৬ সংখ্যার কোড পাঠানো হবে।</p>
      <LoginForm next={next} />
    </div>
  );
}

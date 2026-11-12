// Kept in its own module so tests can mock ./delivery without losing the class.

export type OtpDeliveryCategory = "config" | "http" | "timeout" | "network";

/**
 * A failed login-code send. `detail` is safe to log: an HTTP status code or
 * environment variable names, never a key, email address, code or response body.
 */
export class OtpDeliveryError extends Error {
  constructor(
    readonly category: OtpDeliveryCategory,
    readonly detail?: number | string,
  ) {
    super(`otp delivery failed: ${category}`);
    this.name = "OtpDeliveryError";
  }
}

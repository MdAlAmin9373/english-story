import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { handleGoogleCallback } from "@/features/auth/google/callback";

// Google redirects here after sign-in. Reads cookies, so it runs per request.
export async function GET(request: NextRequest) {
  // redirect() throws, so it stays outside any try/catch.
  redirect(await handleGoogleCallback(request.nextUrl.searchParams));
}

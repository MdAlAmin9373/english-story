# Google sign-in: setup and manual tests

"Sign in with Google" runs alongside the email OTP login. It is a server-side OpenID Connect authorization code flow with PKCE, state and nonce.

- **Start:** the `startGoogleLogin` server action, submitted as a form POST.
- **Callback:** `GET /auth/google/callback`.
- **Code:** `src/features/auth/google/`.

## 1. Google Cloud Console

Go to **console.cloud.google.com**, choose or create a project, then open **Google Auth Platform**.

### Branding (the consent screen)

- **App name:** `English Story`
- **Support email and developer contact email:** the maintainer's address
- **Authorized domain:** `netenglish.online`
- **App home page:** `https://netenglish.online` (optional)

### Audience

- **User type:** External.
- **Local testing only:** the app can stay in **Testing**. Then only accounts listed under **Test users** can sign in, so add your own Google accounts.
- **Before going live:** click **Publish app** to set it to **In production**. Otherwise real users get "Access blocked".

### Data access (scopes)

- Add only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
- These are non-sensitive scopes, so Google doesn't need to verify the app.

### Clients

Create client, type **Web application**, name it something like `English Story web`.

| Field | Values (exactly as written) |
|---|---|
| Authorized JavaScript origins | `http://localhost:3000` and `https://netenglish.online` |
| Authorized redirect URIs | `http://localhost:3000/auth/google/callback` and `https://netenglish.online/auth/google/callback` |

- The redirect URIs must match exactly: no trailing slash, `http` for localhost, `https` for the live site.
- `127.0.0.1` counts as a different origin from `localhost`. Use `localhost` everywhere.
- Copy the **Client ID** and **Client secret** right away. The console may only show the secret once.

## 2. Environment variables

These are read by `googleEnv()` in `src/lib/env.ts`, separately from `serverEnv()`. A missing Google variable only disables Google login, never OTP.

| Name | Local | Vercel Production |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `<client ID>.apps.googleusercontent.com` | same |
| `GOOGLE_CLIENT_SECRET` | `<client secret>` | same, marked **Sensitive** |
| `APP_URL` | `http://localhost:3000` | `https://netenglish.online` |

- `APP_URL` must be https, except plain http is allowed for `localhost` and `127.0.0.1`. Only its origin is used; any path is dropped.
- The redirect URI is always `APP_URL` + `/auth/google/callback`. It is never built from the request's Host header.
- Restart `npm run dev` after editing `.env`.
- **Preview deployments:** leave the Google variables unset. The button then shows the `google_failed` message there, and OTP still works. Preview URLs aren't registered with Google anyway.

### Before the first production deploy

- Run `npx prisma migrate deploy` against the production database to add the `User.googleSub` column (migration `add_user_google_sub`).
- In **Vercel → Domains**, redirect `www.netenglish.online` to `netenglish.online`. If a user starts the login on `www` and comes back to the bare domain, the login cookie isn't sent and they get `google_expired`.

## 3. Manual test plan

Run everything locally first. After deploying, repeat the tests marked ★ on `https://netenglish.online`.

### A. Successful logins

| # | Steps | Expected |
|---|---|---|
| 1 ★ | Log in with a Google account that has no user yet | You land on `/dashboard`, logged in. In the database there is a new `User` with `googleSub` set and `role = USER`. |
| 2 ★ | Log in with Google using the same email as an existing OTP user | You get the same account: your existing progress shows, and that user's `googleSub` is now set. No new row is created. |
| 3 | Log out, then log in with the same Google account again | Same user, no new row. |
| 4 | Log in with Google as an admin's email | `/admin` opens and the role is still `ADMIN`. |
| 5 ★ | While logged out, open a chapter that needs login. On the login page, click Google. | After login you return to that chapter, because `next` is kept. |
| 6 | Open `/login?next=https://evil.com` and log in with Google | You end up on `/dashboard`, not evil.com. |
| 7 | Be signed in to 2 Google accounts in the browser | Google shows the account chooser. |
| 8 ★ | Do a full email OTP login (request a code, verify it), then log out | Works exactly as before. |

### B. Failures

| # | Steps | Expected |
|---|---|---|
| 9 ★ | Click Google, then press **Cancel** on Google's screen | `/login?error=google_cancelled` with the cancelled message. |
| 10 | Click Google, wait more than 10 minutes on the chooser, then continue | The `google_expired` message. |
| 11 | After a successful login, paste the same callback URL from browser history again | `google_expired`, and no second session is created (one new `Session` row per login). |
| 12 | Start a login. On Google's screen, copy the callback URL from the address bar after you pick an account, change one character of `state=`, and open it. | `google_failed`. |
| 13 | Conflict: link Google account X to user A (test 2). Then change A's email in the database yourself, for example in Prisma Studio. Log in with X again. | `google_conflict`, and you are not logged in. |
| 14 | Remove `GOOGLE_CLIENT_SECRET` locally, restart the dev server, click Google | `google_failed` message. OTP login still works. Put the secret back afterwards. |
| 15 | Open `/login?error=foo`, `/login?error=__proto__` and `/login?error=google_failed` | The first two show no message; the third shows the failed message. |

Unverified emails and wrong `iss`, `aud` or `nonce` values are hard to produce by hand; the unit tests in `tests/unit/google-*.test.ts` cover them.

### C. Security spot checks (browser DevTools and logs)

| # | Check | Expected |
|---|---|---|
| 16 ★ | **Application → Cookies** during the flow, while you're on Google's screen | Locally there is an `es_google` cookie: HttpOnly, SameSite Lax, expiring in about 10 minutes. On production it is named `__Host-es_google` and marked Secure. It is gone after the callback. |
| 17 | The same panel after a login | `es_session` is set exactly as with OTP. |
| 18 | **Network tab** when you click the Google button | The first request is a POST to `/login` (the server action), followed by navigation to `accounts.google.com`. Just loading or hovering on `/login` never creates `es_google`. |
| 19 | The terminal (or Vercel logs) after the failure tests | Only lines like `[google] callback failed: cancelled`. No codes, tokens or secrets. |
| 20 | The `User` table | Only `googleSub` is new. No tokens, pictures or names are stored. |

## 4. Error codes

`/login?error=` shows a message only for these codes. Any other value shows nothing.

| Code | When |
|---|---|
| `google_cancelled` | The user cancelled on Google's screen (`access_denied`). |
| `google_expired` | The state cookie is missing, older than 10 minutes or already used. |
| `google_unverified` | Google says the email is not verified. |
| `google_conflict` | The Google account or email is already linked differently (including a changed Google email). |
| `google_failed` | Anything else: other Google errors, a missing code, a state mismatch, a token endpoint failure or timeout, invalid claims, missing config or a database error. |

## 5. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Google shows "Error 400: redirect_uri_mismatch" | `APP_URL` plus `/auth/google/callback` doesn't exactly match a registered redirect URI. |
| "Access blocked" or "app not verified" | The app is still in Testing and the account isn't a test user, or the app isn't published. |
| `google_expired` every time | The host where the login started differs from `APP_URL` (`www` vs the bare domain, or `localhost` vs `127.0.0.1`), or the browser blocks cookies. |
| `google_failed` every time | Check the log category. `config` means a variable is missing or invalid. `token_status` means a wrong client secret or a mismatched redirect URI. `claims_invalid` means `GOOGLE_CLIENT_ID` doesn't match the client being used. |

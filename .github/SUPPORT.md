# Support

Need help with Null-Secret? Pick the channel that matches what you are trying to do.

---

## Table of Contents

- [I found a security vulnerability](#i-found-a-security-vulnerability)
- [I found a bug](#i-found-a-bug)
- [I have a feature idea](#i-have-a-feature-idea)
- [I have a question about using the app](#i-have-a-question-about-using-the-app)
- [I cannot decrypt a secret](#i-cannot-decrypt-a-secret)
- [I forgot my password](#i-forgot-my-password)
- [I want to contribute](#i-want-to-contribute)
- [Response expectations](#response-expectations)

---

## I found a security vulnerability

**Do not open a public issue.** Follow the private disclosure process in [SECURITY.md](./SECURITY.md).

Send details to [anuragmishrasnag06082004@gmail.com](mailto:anuragmishrasnag06082004@gmail.com) with `[Null-Secret Security]` in the subject line.

---

## I found a bug

1. Search existing issues first to avoid duplicates.
2. Open a new issue using the **Bug report** template.
3. Include:
   - A clear reproduction (steps, request, screenshot, or screencast).
   - The browser and OS you are on.
   - Any error messages from the DevTools Console.
   - The commit SHA you are running if you know it (visible via `git rev-parse HEAD` when self-hosting).

If the bug involves data loss or account lockout, mark the issue as `priority/high` and mention `@4nur4gmishr4`.

---

## I have a feature idea

1. Check [FEATURES.md](./FEATURES.md) to see whether it is already planned.
2. Open an issue using the **Feature request** template.
3. Describe the user benefit first, then any implementation ideas. Small, focused proposals are easier to ship than sweeping rewrites.

For non-trivial changes, open an issue before writing code so the design can be discussed.

---

## I have a question about using the app

The [User Guide](./USER_GUIDE.md) covers the main flows: creating a secret, using a password, setting view limits, understanding self-destruction, and managing your account.

If it does not answer your question, open a **Discussion** (or a regular issue labelled `question`) on GitHub.

---

## I cannot decrypt a secret

Most decryption failures come from one of these causes:

1. **The link was shortened or altered.** The fragment after `#` carries the decryption key. If anything after `#` is missing or changed, the message cannot be read.
2. **The view limit is already reached.** Once a secret is opened the allowed number of times, the server wipes it. There is no recovery — this is the design.
3. **The password is wrong.** If the creator added a password layer, a mistyped password yields the same "could not unlock" message as a broken link. Ask the sender to resend or confirm the password.
4. **The secret expired.** If the TTL elapsed before anyone opened it, the server purges it and returns `410 Gone`.
5. **You are on the wrong device.** Some browser sync services scrub URL fragments. Try opening the link on the device where it was first received.

If none of the above applies, file a bug report with the exact error message. Never share the full URL in a public issue.

---

## I forgot my password

Use the **Forgot your password?** link on the sign-in page. Firebase emails a reset link; check spam if it does not arrive in a few minutes.

If you no longer have access to the email on the account, there is no manual recovery. For privacy reasons, we do not store enough information to verify ownership any other way. Create a new account with a new email.

---

## I want to contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, code style, testing expectations, and the pull-request checklist. First-time contributors are welcome.

---

## Response expectations

This is a single-maintainer project, so response times vary.

| Channel | Typical first response |
|---|---|
| Security email | ≤ 72 hours |
| High-severity bugs | ≤ 3 business days |
| Normal bugs and questions | ≤ 1 week |
| Feature requests | Batched monthly |

If an issue sits untouched longer than the window above, a polite bump comment is appreciated.

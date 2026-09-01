# Support

Choose the appropriate channel for your issue.

## I found a security vulnerability

**Do not open a public issue.** Follow the private disclosure process in [SECURITY.md](../SECURITY.md).

Email [anurag.mishra.core@gmail.com](mailto:anurag.mishra.core@gmail.com) with `[Null-Secret Security]` in the subject line.

## I found a bug

1. Search existing issues to avoid duplicates.
2. Open a new issue using the **Bug report** template.
3. Include:
   - Reproduction steps.
   - Operating system and browser version.
   - DevTools console errors.
   - The commit SHA if you are self-hosting.

If the bug involves data loss, mark it `priority/high` and ping `@4nur4gmishr4`.

## I have a feature idea

1. Check [FEATURES.md](../docs/FEATURES.md) to see if it is already planned.
2. Open an issue using the **Feature request** template.
3. Describe the user benefit before proposing implementation details. 

## I have a question about using the app

Read the [User Guide](../docs/USER_GUIDE.md). If your question remains unanswered, open a **Discussion** (or an issue labelled `question`) on GitHub.

## I cannot decrypt a secret

Decryption fails under these conditions:

1. **Altered Link:** The decryption key resides in the URL fragment (`#key`). If this is missing or changed, decryption is impossible.
2. **View Limit Reached:** The server deletes the record after it reaches the specified view count.
3. **Incorrect Password:** A wrong password prevents decryption.
4. **Expired Secret:** The server deletes the record after the time limit passes.

If you suspect a different issue, file a bug report. Do not post the full secret URL in public issues.

## I forgot my password

Click the **Forgot your password?** link on the sign-in page to receive a reset email. If you lose access to your email address, you cannot recover the account. We do not store sufficient metadata for manual verification.

## I want to contribute

Null-Secret is closed-source. We do not accept pull requests. Please report bugs or request features via the issue templates.

## Response expectations

This is a single-maintainer project.

| Channel | Typical first response |
|---|---|
| Security email | ≤ 72 hours |
| High-severity bugs | ≤ 3 business days |
| Normal bugs and questions | ≤ 1 week |
| Feature requests | Batched monthly |

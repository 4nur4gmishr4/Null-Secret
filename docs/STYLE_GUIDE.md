# Style Guide

To maintain a clean, readable, and professional codebase, all developers must adhere to this style guide. Consistency is critical in a security-focused application.

---

## 1. Go (Backend)

The backend follows idiomatic Go practices. 

### Formatting
- All Go code must be formatted using `gofmt` before committing.
- Run `go vet ./...` to catch common mistakes.

### Error Handling
- **Wrap errors:** Always wrap errors with context so they can be traced easily. Use `fmt.Errorf("failed to do X: %w", err)` instead of returning the raw error.
- **Log thoughtfully:** Do not log user input directly to prevent log injection attacks. Never log ciphertext, keys, or IDs.

### Dependencies
- **Zero-dependency core:** The core storage and crypto logic must not rely on third-party libraries. 
- Use the standard library `net/http` or a minimal router (like `chi`) for HTTP routing. 

### Structs and Pointers
- Pass large structs by pointer to avoid memory copying overhead.
- Keep Request/Response Data Transfer Objects (DTOs) in the `models` package to avoid cyclic dependencies.

---

## 2. React / TypeScript (Frontend)

The frontend is built with React 19, Vite, and strict TypeScript.

### Typing
- **No `any` types:** The use of `any` is strictly prohibited. If a type is unknown (like an opaque JSON payload from a third party), use `unknown` and narrow it with type guards.
- **Interfaces over Types:** Prefer `interface` for object shapes. Use `type` for unions or intersections.

### Components
- **Functional Components:** All components must be functional components using React Hooks.
- **Memoization:** Use `useCallback` and `useMemo` for expensive cryptographic operations or functions passed down to heavy child components (like `LottieView`).
- **Destructuring:** Destructure props in the function signature: `function MyComponent({ title, onClick }: MyProps)`.

### CSS and Styling
- **CSS Variables:** Do not hardcode colors in components. Always use the CSS variables defined in `index.css` (e.g., `var(--text-primary)`, `var(--bg-elevated)`). This ensures the Light/Dark/System theme toggle works perfectly.
- **Tailwind:** Null-Secret uses minimal utility classes inspired by Tailwind. Prefer semantic class names (`.btn-primary`) over long strings of utility classes when building complex components.

### Security
- **Web Crypto API:** All cryptographic operations must use `window.crypto.subtle`. Never use npm packages for AES-GCM or PBKDF2.
- **JSX Injection:** React protects against XSS by default, but never use `dangerouslySetInnerHTML`.

---

## 3. Git Commits

### Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `chore:` Changes to the build process or auxiliary tools (e.g., CI, Dependabot)

*Example:* `fix: resolve memory leak in Firestore query`

### Branch Naming
- `feature/your-feature-name`
- `fix/issue-description`
- `docs/update-readme`

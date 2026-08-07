# Release Cycle & Versioning

Null-Secret follows [Semantic Versioning 2.0.0](https://semver.org/) (SemVer) to ensure that downstream self-hosters can update their deployments safely and predictably.

## Versioning Format (`MAJOR.MINOR.PATCH`)

- **MAJOR version:** Incremented for incompatible API changes, major architectural shifts (e.g., migrating from SQLite to Postgres), or changes to the cryptographic payload format that break backwards compatibility with older clients.
- **MINOR version:** Incremented for adding functionality in a backwards-compatible manner (e.g., adding WebAuthn, new frontend features, optional rate-limiting tiers).
- **PATCH version:** Incremented for backwards-compatible bug fixes and security patches.

## Release Process

Because the official Null-Secret deployment relies on Continuous Deployment (CD) via Vercel and Render, the `main` branch is almost always in a deployable, production-ready state. However, formal releases are tagged for users who self-host.

1. **Tagging:** When a set of features is ready, a maintainer creates a new Git tag (e.g., `v1.2.0`) on the `main` branch.
2. **Changelog Generation:** The GitHub release notes are generated. A high-level summary of new features, bug fixes, and breaking changes is written manually to provide context.
3. **Security Announcements:** If a release contains a patch for a CVE (Common Vulnerabilities and Exposures), it is prominently highlighted in the release notes with mitigation steps for self-hosters.

## LTS (Long-Term Support)

Currently, Null-Secret does not maintain parallel LTS release branches. Self-hosters are encouraged to always track the latest stable release tag.

## Self-Hosting Upgrades

Self-hosters using Docker or the Render Blueprint (`render.yaml`) can safely upgrade MINOR and PATCH versions without data loss. The internal SQLite database schema is designed to be backwards-compatible, and any necessary migrations run automatically on backend startup. 

If a MAJOR version requires manual intervention, detailed upgrade instructions will be provided in the release notes.

# Project Governance

This document outlines the governance model for the Null-Secret project. It details how decisions are made, how contributors can participate, and the roles within the community.

## 1. Project Philosophy

Null-Secret is an open-source, security-first project. We prioritize **mathematical provability, user privacy, and zero-knowledge architecture** above all else. Features that compromise these principles (e.g., adding analytics, server-side decryption, or third-party trackers) will be categorically rejected.

## 2. Roles and Responsibilities

The project is governed by a hierarchical model to ensure high security standards.

### Users
Anyone who self-hosts or uses the application. Users are encouraged to report bugs, suggest features, and help test beta releases.

### Contributors
Anyone who submits a Pull Request, opens an Issue, or helps with documentation. 
- Contributors must adhere to the `CODE_OF_CONDUCT.md`.
- All code submissions must pass the CI pipeline and security checks.

### Core Maintainers
Maintainers are responsible for the technical direction and security of the project.
- **Current Core Maintainers:** [Anurag Mishra (@4nur4gmishr4)](https://github.com/4nur4gmishr4)
- **Responsibilities:**
  - Reviewing and merging Pull Requests.
  - Triage of incoming Issues and Bug Reports.
  - Final say on architectural and cryptographic design decisions.
  - Managing releases and versioning.

## 3. Decision-Making Process

### Routine Changes
Bug fixes, UI tweaks, and documentation updates are generally merged quickly upon passing CI checks and a review by a Core Maintainer.

### Architectural & Cryptographic Changes
Any change to the underlying cryptography (e.g., changing the AES-GCM tag size, modifying PBKDF2 iterations, altering the database schema) requires a formal **Request for Comments (RFC)** via a GitHub Issue.
1. The proposer opens an Issue detailing the rationale, threat model impact, and implementation plan.
2. A mandatory 7-day discussion period begins.
3. A Core Maintainer must explicitly approve the RFC before a Pull Request can be opened.

## 4. Code Ownership

The `.github/CODEOWNERS` file enforces that all changes must be reviewed by the Core Maintainers. No code can be merged into the `main` branch without explicitly bypassing branch protection rules (which is reserved only for emergency hotfixes by the Core Maintainer).

## 5. Security Vulnerability Reporting

Due to the sensitive nature of this project, security bugs must **NOT** be reported via public GitHub Issues. Please refer to `SECURITY.md` for instructions on responsibly disclosing vulnerabilities to the maintainers.

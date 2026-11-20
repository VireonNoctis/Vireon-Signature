# 0001. Standalone Vue feature application

- Status: Accepted
- Date: 2026-11-20
- Owners: VireonNoctis

## Context

The Signature Studio began as a route inside the Vireon Noctis portfolio. Its editor, renderer, visual components and styles were stored in the portfolio source tree and depended on its entry point and global styles. Continued product work should not require editing the portfolio application.

## Decision

Move the feature into the dedicated `VireonNoctis/Vireon-Signature` repository as one Vue 3 + TypeScript + Vite application. Keep feature-owned code under `src/features/signature-studio/`, app composition in `src/app/`, and the email renderer framework-independent. Browser storage and clipboard/download behavior live in feature composables.

## Alternatives

- Keep the feature inside the portfolio: rejected because the feature remains coupled to the portfolio's release cadence and global styles.
- Split it into packages or services: rejected because this is one browser-only product with no additional runtime boundary.
- Add React or Next.js: rejected because the existing implementation and preferred frontend stack are Vue.

## Consequences

- The Signature Studio can be developed, tested and deployed independently.
- The domain renderer can be tested without mounting Vue or a browser.
- GitHub Pages serves this project at its repository path.
- The portfolio's previous `/signature/` route is not automatically synchronized by this deployment; keeping that original route continuously current requires a separate cross-repository publishing integration.

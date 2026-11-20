# 0001. Standalone React and Three.js application

- Status: Accepted
- Date: 2026-11-20
- Owners: VireonNoctis

## Context

The Signature Studio was initially migrated as a standalone Vue application. The product owner requested a JavaScript, React and Three.js codebase to diversify the frontend stack and make the visual scene a first-class component.

## Decision

Use React 19 with plain JavaScript ES modules, Vite and Three.js. Keep the signature feature under `src/features/signature-studio/`. Keep the email renderer framework-independent. React owns application state and interaction; Three.js owns the decorative atmospheric background only.

## Alternatives

- Keep Vue and TypeScript: rejected because the owner explicitly requested React and JavaScript.
- Add React Three Fiber: rejected for now because the scene is one controlled shader plane and direct Three.js keeps the dependency surface small.
- Use CSS-only background animation: rejected because the requested scene should use Three.js.

## Consequences

- The project now demonstrates JavaScript, React and Three.js.
- The signature renderer remains pure JavaScript and independently testable.
- Editor-only rendering effects stay outside email HTML.
- GitHub Pages serves the project at its repository path.

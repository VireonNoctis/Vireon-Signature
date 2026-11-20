# Contributing

Keep the product focused: a fast, browser-only email signature editor with conservative email output.

## Development

```bash
npm install
npm run dev
```

Before submitting changes, run:

```bash
python3 scripts/validate.py
npm run typecheck
npm test
npm run build
```

## Architecture

- Keep the signature renderer framework-independent in `src/features/signature-studio/domain/`.
- Keep browser-only behavior in composables.
- Keep editor and Canvas presentation in feature components.
- Keep generated email HTML free of external stylesheets, scripts, tracking, and editor-only effects.
- Add regression tests for observable rendering or validation behavior.
- Avoid dependencies for one-off helpers when platform APIs are sufficient.

## Pull requests

Explain the user-facing change, note compatibility impact, and include the exact checks that were run. Do not claim unexecuted checks passed.

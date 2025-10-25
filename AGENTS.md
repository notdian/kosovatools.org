# Repository Guidelines

## Project Structure & Module Organization
Kosova Tools uses pnpm and Turborepo to coordinate multiple packages. The Next.js customer surface lives in `apps/web`, with routes in `app/`, shared UI in `components/`, and utilities in `lib/`. Shared React primitives live in `packages/ui`; cross-tool data helpers start in `packages/stats`; workspace-wide linting and TypeScript baselines sit in `packages/eslint-config` and `packages/typescript-config`.

## Tool Package Workflow
Each citizen tool should ship as its own workspace package (e.g., `packages/customs-codes`, `packages/payroll`). For a new tool: copy the `packages/stats` layout, update `package.json` name/exports, add a `tsconfig` extending `@workspace/typescript-config/react-library.json`, and seed `src/index.ts` with typed exports. Re-export any UI building blocks through `packages/ui/src/components/<tool>/index.ts`, then consume the package inside `apps/web` by importing from `@workspace/<tool>`.

## Stats Data Lifecycle
- Refresh Kosovo Agency of Statistics (KAS) sources by running `python packages/stats/scripts/fetch_kas.py --out packages/stats/data --months 36`. Scripts expect Python 3.11+ plus dependencies from `packages/stats/requirements.txt`.
- Document visualization requirements in `packages/stats/docs/` (e.g., `kas_chart_specs.md`) so UI work aligns with dataset schemas.
- Keep JSON snapshots in `packages/stats/data/` up to date; note retrieval dates inside `docs/data/README.md`.

## Build, Test, and Development Commands
Install dependencies with `pnpm install`. Use `pnpm dev` to run Turborepo's `next dev --turbopack` for `apps/web`. Build production output via `pnpm build`; lint with `pnpm lint` or `pnpm --filter web lint`. Run type checks using `pnpm --filter web typecheck` and package-specific checks like `pnpm --filter @workspace/stats typecheck`. Apply formatting before committing with `pnpm format`.

## Coding Style & Naming Conventions
Shared ESLint presets in `packages/eslint-config` extend Next.js and React rules with zero-warning enforcement. Prettier handles formatting (two-space indentation, trailing commas); always run `pnpm format`. Use PascalCase for components and exported hooks, camelCase for utilities, and align route folder names under `app/` with their URL segments.

## Data Visualization Colors
Derive all chart palettes with `createChromaPalette` in `packages/ui/src/lib/chart-palette.ts` so both light and dark themes stay in sync. When adding new charts, feed the generated colors through `ChartContainer` configs instead of hard-coding CSS variables or hex values.

## Testing Guidelines
Automated tests are not yet configured. When introducing them, colocate component specs as `*.test.tsx` near sources or create an `apps/web/tests` directory for integration suites. Prefer React Testing Library for React units and wire new test scripts into the relevant `package.json` plus Turborepo.

## Commit & Pull Request Guidelines
History currently contains only `Initial commit`; adopt Conventional Commits (`feat:`, `fix:`, `docs:`) to signal intent. Keep changes scoped, mention affected packages in the body, and ensure linting and type checks pass locally. Pull requests should outline the change, validation steps, and linked issues or design assets.

## Security & Configuration Notes
Store secrets in `.env.local` (mirroring `.env.example` when present) and keep them out of version control. Turborepo caches build artifacts in `.turbo/` and Next.js outputs in `.next/`; run `pnpm turbo run clean --force` if caches desync. Update shared configs in `packages/*-config` with synchronized version bumps.

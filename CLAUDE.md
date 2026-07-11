# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Environment

This project runs inside a **VS Code Dev Container** (`.devcontainer/`). The container is based on `ubuntu-24.04` and comes with Node 22, Angular CLI 20, and Claude Code pre-installed.

**First-time setup:** after the container is created, run `claude` in the terminal and log in via browser. The session is persisted in a named Docker volume (`claude-code-config-<id>`) and survives rebuilds.

**To update the dev stack** (Node version, global tools), edit `.devcontainer/install-stack.sh` — it runs as root during the image build. Changing this file invalidates the Docker layer and triggers a full reinstall on the next rebuild. All other devcontainer files are generic and should not need changes.

**Rebuilding the container:**
- Normal rebuild (uses cache): `Dev Containers: Rebuild Container`
- Full reinstall from scratch: `Dev Containers: Rebuild Without Cache`

The dev server (`npm start`) binds to `0.0.0.0:4200` so VS Code can forward the port automatically. The port is declared in `devcontainer.json` under `forwardPorts`.

## Commands

```bash
npm start          # Dev server at http://localhost:4200 (auto-reloads on changes)
npm run build      # Production build → dist/
npm run watch      # Incremental dev build (watch mode)
npm test           # Karma/Jasmine unit tests
ng generate component <name>   # Scaffold a new standalone component
ng generate service <name>     # Scaffold a new service
```

## Architecture

Angular 20 standalone application (no NgModules). Entry point is `src/main.ts` which calls `bootstrapApplication()` with the config from `src/app/app.config.ts`. The root component (`src/app/app.ts`) renders `<router-outlet>` for route-driven views.

Routes are defined in `src/app/app.routes.ts` (currently empty). Use lazy-loaded routes as features are added.

## Angular Patterns

These rules are enforced in this project — do not deviate:

**Components**
- `standalone: true` is the default; do NOT set it explicitly in `@Component`
- Always set `changeDetection: ChangeDetectionStrategy.OnPush`
- Use `input()` / `output()` functions, not `@Input` / `@Output` decorators
- Put host bindings in the `host` object of the decorator, not `@HostBinding` / `@HostListener`
- Do not use `ngClass` or `ngStyle` — use `class` and `style` bindings directly

**Templates**
- Use native control flow (`@if`, `@for`, `@switch`), not `*ngIf` / `*ngFor` / `*ngSwitch`
- Use `NgOptimizedImage` for all static images (not applicable for inline base64)

**State**
- Signals for local state; `computed()` for derived state
- Use `signal.set()` or `signal.update()` — never `signal.mutate()`

**Services**
- `providedIn: 'root'` for singletons
- Use `inject()` function, not constructor injection

**Forms**
- Reactive forms over template-driven forms

## Code Style

Prettier is configured (100-char line width, single quotes, Angular HTML parser). TypeScript strict mode is on (`strict`, `strictTemplates`, `strictInjectionParameters`). Avoid `any`; use `unknown` when type is uncertain.

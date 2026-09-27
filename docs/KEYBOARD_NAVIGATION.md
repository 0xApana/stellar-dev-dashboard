# Keyboard Navigation Guide

This document describes keyboard navigation behavior across all dashboard routes, how to test it, and compatibility notes for developers.

> Dashboard views are declared in one typed registry. See [ROUTING.md](./ROUTING.md)
> for how routes drive the sidebar, command palette, document titles, and deep links.

## Overview

Every dashboard route must be fully operable without a pointer. Keyboard users rely on:

- Logical **Tab** order (skip link → sidebar → toolbar → main content)
- **Arrow keys** in the sidebar navigation list
- **Enter** / **Space** to activate buttons and links
- **Escape** to dismiss overlays and return focus to the trigger
- **Focus traps** inside modal dialogs (preferences, command palette, notifications)

## Skip link

The first focusable element on every page is **Skip to main content** (`.skip-link`). It moves focus to `#main-content`, which receives programmatic focus after route changes via `useRouteFocus`.

## Global shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + /` or `?` | Show keyboard shortcuts help |
| `G` then `D` | Go to Overview |
| `G` then `A` | Go to Account |
| `G` then `T` | Go to Transactions |
| `G` then `C` | Go to Contracts |
| `Escape` | Close open modals / overlays |

Shortcuts are suppressed while focus is inside text inputs unless noted otherwise.

## Sidebar navigation

When the sidebar is visible:

- **Arrow Up / Arrow Down** — move between nav items
- **Home / End** — jump to first / last nav item
- **Enter** — activate the focused route

Implementation: `src/hooks/useSidebarArrowNav.ts`

## Route focus management

After navigating to a new tab or URL, focus moves to `#main-content` and a screen reader announcement is emitted. Implementation: `src/hooks/useRouteFocus.ts`

## Modal focus traps

Modals use `FocusManager` with `trapFocus` and `restoreFocusOnUnmount`:

- Command palette (`KeyboardNavigation.jsx`)
- Keyboard shortcuts help
- User preferences (`DashboardLayout.tsx`)

### Nested overlays (modals and drawers)

When overlays stack (a dialog opening inside a dialog, or a drawer above a
modal), Escape must close the **topmost** overlay first and Tab must never
leak into background content. Two tools support this (#874):

**Prevention — `useOverlayKeyboardGuard`** (`src/hooks/useOverlayKeyboardGuard.ts`):
registers each open overlay in a LIFO stack so Escape always reaches the
right layer, and wraps Tab within the overlay's focusables:

```tsx
import { useOverlayKeyboardGuard } from '../hooks/useOverlayKeyboardGuard';

const containerRef = useRef<HTMLDivElement>(null);
const guard = useOverlayKeyboardGuard({ onClose: () => setOpen(false), containerRef });

return (
  <div role="dialog" aria-modal="true" ref={containerRef} {...guard}>…</div>
);
```

Use it on every overlay in a stack — including nested ones — so the guard
knows the full layer order. While disabled (overlay closed) the hook is inert.

**Detection — `auditOverlayStacks`**: audits the live DOM for trap risks
(see below) so regressions surface in CI instead of at runtime.

## Audit utilities

`src/lib/keyboardNavigationAudit.ts` provides programmatic checks:

```ts
import {
  auditRouteKeyboardNavigation,
  auditOverlayStacks,
  DASHBOARD_ROUTES,
  isKeyboardNavigationSupported,
} from '../lib/keyboardNavigationAudit';

const env = isKeyboardNavigationSupported();
if (!env.supported) {
  console.warn(env.reason); // SSR / non-browser
}

const result = auditRouteKeyboardNavigation('overview', document);
console.log(result.passed, result.tabOrderIssues);
```

### Overlay stack audit (#874)

`auditOverlayStacks(root?)` reports every modal / drawer container from
outermost to innermost — nesting `depth`, the `stackPath` of ancestor
overlays, and a `trapRisk` rating — plus these issues:

| Code | Severity | Meaning |
| --- | --- | --- |
| `no-escape-control` | error | No close/cancel affordance; Escape is blocked |
| `no-focusable-content` | error | Focus can enter an empty overlay but cannot Tab anywhere |
| `background-not-inert` | warning | `aria-modal` is open while background content is still tabbable |
| `focus-restoration-unhinted` | warning | No `data-return-focus` marker, so focus restoration could not be verified |

Overlay containers are detected via `role="dialog"`, `role="alertdialog"`,
`aria-modal="true"`, `data-overlay="drawer"`, or `data-drawer`. Class names
are intentionally ignored — backdrops like `mobile-drawer-backdrop` are not
overlays. The route-level audit (`auditRouteKeyboardNavigation`) includes the
stack audit in its `overlayStack` field and fails the route when the stack
has errors.

```ts
const stack = auditOverlayStacks(document);
if (!stack.passed) {
  console.table(stack.entries.flatMap((e) => e.issues));
}
```

### Invalid input handling

- Empty or whitespace route names return `supported: false` with reason `"Route path is empty or invalid"`.
- `auditOverlayStacks` with a missing/invalid root returns `supported: false` with a descriptive reason instead of throwing.
- Connect form sets `aria-invalid="true"` and `role="alert"` on validation errors.

### Unsupported environments

When `document` or `window` is unavailable (SSR, unit tests without DOM), audit functions return empty results and `environmentSupported: false` rather than throwing. `useOverlayKeyboardGuard` is likewise inert without a DOM.

## Dashboard routes covered

All routes in `DASHBOARD_ROUTES` (`src/lib/keyboardNavigationAudit.ts`) must maintain keyboard operability, including:

`connect`, `overview`, `account`, `transactions`, `contracts`, `network`, `builder`, `settings`, and 30+ additional tabs registered in `DashboardLayout.tsx`.

## Testing

### Unit tests

```bash
npm test -- tests/unit/lib/keyboardNavigationAudit.test.ts
```

Covers focusable element discovery, tab-order issues, modal trap detection, nested overlay stack auditing (#874), invalid route input, and environment detection.

`src/hooks/__tests__/useOverlayKeyboardGuard.test.tsx` covers the guard hook: topmost-only Escape, LIFO ordering across nested overlays, Tab wrap-around, and disabled/inert behavior.

### End-to-end tests (Playwright)

```bash
npm run test:e2e -- tests/e2e/keyboard-navigation.spec.ts
```

| Test | Type | Description |
|------|------|-------------|
| Tab order → connect → sidebar nav | Primary | Full keyboard connect and route change |
| Skip link focus | Boundary | Skip link targets main landmark |
| Command palette | Boundary | Open/close via keyboard |
| Invalid address | Failure | Error alert + recovery without pointer |
| Preferences Escape | Failure | Focus restored to trigger button |
| Per-route focusable check | Boundary | Each core route has focusable controls |

## Security and compatibility notes

- Keyboard shortcuts intentionally avoid browser-reserved combos (`Ctrl+T`, `Ctrl+W`, etc.) — see `src/lib/keyboard/shortcuts.ts` `detectBrowserConflicts()`.
- Focus indicators use `:focus-visible` per WCAG 2.4.7 — see `src/styles/accessibility.css`.
- High-contrast mode preserves focus ring visibility — see `docs/HIGH_CONTRAST_THEME.md`.

## Migration notes

If you add a new dashboard tab:

1. Register it in `DashboardLayout.tsx` `TABS` and `Sidebar.tsx` `NAV_ITEMS`.
2. Add the route id to `DASHBOARD_ROUTES` in `keyboardNavigationAudit.ts`.
3. Ensure icon-only controls have `aria-label`.
4. Wrap any new modal in `FocusManager` with focus restore on close.
5. Add the route to `tests/e2e/keyboard-navigation.spec.ts` if it is user-facing.

## Related files

| File | Purpose |
|------|---------|
| `src/components/accessibility/SkipLink.tsx` | Skip-to-main link |
| `src/components/accessibility/KeyboardNavigation.jsx` | Command palette + shortcuts |
| `src/components/accessibility/FocusManager.tsx` | Modal focus trap |
| `src/hooks/useRouteFocus.ts` | Post-navigation focus |
| `src/hooks/useSidebarArrowNav.ts` | Sidebar arrow-key nav |
| `tests/e2e/keyboard-navigation.spec.ts` | Playwright keyboard tests |

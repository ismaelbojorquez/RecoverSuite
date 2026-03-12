# RecoverSuite Frontend UI Architecture

## Design Goal
Premium SaaS interface with Apple/macOS-inspired Liquid UI:
- glass surfaces
- soft depth and shadows
- generous spacing
- minimal visual noise
- smooth and coherent motion

## Layered Architecture

### 1) Foundation (Design Tokens)
`frontend/src/styles/design-tokens.css`
- CSS custom properties for color, borders, shadows, spacing, typography, transitions and gradients.
- Global visual primitives with Liquid UI direction.

`frontend/src/theme/tokens.ts`
- JS token mirror consumed by MUI theme.
- Same semantic structure as CSS variables.

### 2) Theme Composition
`frontend/src/theme/index.ts`
- Creates MUI theme from tokens
- Injects palette, typography, shadows, gradients, components
- Handles light/dark mode state + persistence
- Syncs `data-theme-mode` on `<html>` to activate CSS variable sets

### 3) Primitive Theme Adapters
- `palette.ts`
- `typography.ts`
- `shadows.ts`
- `gradients.ts`

These adapt foundation tokens into MUI-consumable structures.

### 4) Component Skin System
`frontend/src/theme/components.ts`
- Global `CssBaseline` skin
- App shell skin (`sidebar`, `header`, `content`)
- Shared component skin (`buttons`, `forms`, `tables`, `dialogs`, `cards`)
- Page class skins (`dashboard`, `auth`, `search`, `client detail`)

## UI Composition Layers

### Layout Layer
- `layouts/AppLayout.jsx` (authenticated shell)
- `layouts/AuthLayout.jsx` (auth screens)

### Section Layer
- `components/layout/Page.jsx`
  - `Page`
  - `PageHeader`
  - `PageContent`
  - `PageGrid`

### Primitive Components
- `components/BaseTable.jsx`
- `components/BaseDialog.jsx`
- `components/form/*`
- `components/BrandMark.jsx`

## Styling Strategy
- Keep business logic in pages/hooks/services untouched.
- Route visual behavior through classes (`crm-*`) + MUI theme overrides.
- Prefer token-driven values over hardcoded values.
- Avoid one-off inline style divergence where possible.

## Extension Rules
1. Add/adjust CSS variables in `design-tokens.css` first.
2. Mirror semantic token updates in `tokens.ts` when MUI theme consumers need them.
3. Keep custom page classes in `crm-*` namespace.
4. Reuse existing `Paper` variants (`panel`, `summary`, `table`, `auth`) before adding new ones.
5. Maintain accessibility states (focus-visible, reduced-motion, contrast).

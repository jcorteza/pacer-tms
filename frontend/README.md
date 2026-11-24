# Pacer TMS frontend

React, TypeScript and Vite. Built so far: sign in, account settings, and configuration (sites, buildings, item locations). Shipments is a placeholder.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server. Requests to `/api/...` are proxied to the backend (`API_URL`, default `http://localhost:3000`) with the `/api` prefix removed. |
| `pnpm build` | Type-check (`tsc -b`), then production build with Vite into `dist/`. |
| `pnpm preview` | Serve the production build locally; run `build` first. |
| `pnpm lint` | ESLint over the whole project. |
| `pnpm test` | Run the tests once: Vitest with Testing Library; `msw` fakes the API, and any request a test didn't plan fails it. |
| `pnpm test:watch` | The same tests in watch mode. |

## Layout

Signed-in pages share one shell ([`Shell.tsx`](./src/shell/Shell.tsx)):

```
┌──────────────────────────────────────────────┐
│ header: wordmark │ customer name │ account ▾ │
├────────────┬─────────────────────────────────┤
│ nav rail   │ page: title, then cards         │
│            │                                 │
└────────────┴─────────────────────────────────┘
```

- **Nav rail:** the entries and their order live in [`nav.ts`](./src/nav.ts). The first entry is also where the app opens, so there is no separate home page.
- **Account menu:** the button in the header opens a menu with **Sign out**.
- **Login** is outside the shell: a centred company name, a sign-in card, and a note that accounts come from an administrator.
- **Pages** are a title plus cards. Configuration has one card per section (Sites, Buildings, Item locations), each a table with an Add button and per-row Edit buttons. Add and Edit open a dialog.

## Styling

All styles are in [`src/styles.css`](./src/styles.css). The design tokens (colour, radius, control sizes) are CSS variables at the top of the file, taken from the Pacer TMS design system, and components use those variables. The Archivo font is loaded in `index.html`.

## Responsiveness

Built for desktop and tablet widths. Phones are not a target: below 760px the layout still works but is not tuned.

- **Shell:** a two-column grid, a nav rail of `clamp(13.75rem, 16vw, 17rem)` beside a flexible page. At 760px and under, the rail becomes a horizontally scrolling strip above the page and the account button shows only its icon.
- **Content width:** pages are capped at `90rem`, so tables and forms don't stretch edge to edge on a very wide screen. Single-column forms (Account settings) are capped at `45rem` for readability.
- **Tables** sit in a horizontally scrolling wrapper, so a wide table scrolls inside its card and not the whole page.
- **Forms:** fields stack in one column. Fields placed together in a row wrap onto the next line once each would be narrower than `10rem`.
- **Dialogs** are at most `35rem` wide and shrink with the window. A tall dialog scrolls inside the dimmed overlay, and its top margin shrinks on short windows.
- **Login:** the title and the card's padding scale with the window (`clamp`).

### Sizing rules

- Sizes are `rem`, so they follow the browser's text size setting.
- Controls use `min-height`, never `height`: the standard is `2.75rem` (44px), so larger text or a wrapped label grows the control instead of clipping it.
- Widths are maximums with `width: 100%`, so they shrink with the window.
- Fixed sizes that stay on purpose: the 1px header divider's short height, table row height (on a table cell it acts as a minimum), and the full-viewport overlay behind dialogs.
- Don't set `flex: 1 1 <size>` on a field outside a `.row`: in a column layout that size becomes a height.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

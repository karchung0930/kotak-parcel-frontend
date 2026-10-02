# Kotak: frontend

The pages of Kotak, a parcel delivery site for Malaysia: Vue 3.5
(`<script setup>` + TypeScript), Tailwind CSS 4 and shadcn-vue on reka-ui,
rendered through Inertia 3.

The Laravel backend, with the business rules, database and tests, is in
[kotak-parcel-backend](https://github.com/karchung0930/kotak-parcel-backend).
Its README explains what the product does and how it is built.

## How it connects to the backend

This is not a separate single-page app talking to an API. Laravel renders
every page through Inertia, and this repository holds the Vue side of it:

- **Check both repositories out side by side.** The Vite config looks for the
  backend at `../kotak-parcel-backend`; set `KOTAK_BACKEND_PATH` in `.env` if
  it is somewhere else.
- **The build writes into the backend.** `npm run build` puts the compiled
  JavaScript, CSS and fonts in the backend's `public/build`, where
  `resources/views/app.blade.php` picks them up with `@vite`. `npm run dev`
  writes `public/hot` there instead, so Laravel loads the dev server.
- **Routes come from the backend.** Wayfinder runs
  `php artisan wayfinder:generate` in the backend at build time and writes
  typed route and form helpers to `resources/js/actions`, `routes` and
  `wayfinder` (not committed). No URL is hard-coded in the pages, and a
  renamed route shows up as a type error. The build therefore needs PHP and
  the backend's `composer install`.

## Setup

You need Node 22.12+, and PHP 8.3+ with Composer 2 for the backend.

```bash
git clone https://github.com/karchung0930/kotak-parcel-backend.git
git clone https://github.com/karchung0930/kotak-parcel-frontend.git

cd kotak-parcel-backend
composer setup                # see the backend README
php artisan db:seed           # demo data and accounts

cd ../kotak-parcel-frontend
npm install
npm run build                 # or npm run dev while editing

cd ../kotak-parcel-backend
composer dev                  # http://localhost:8000
```

## Scripts

| Command               | What it does                                                   |
| --------------------- | -------------------------------------------------------------- |
| `npm run dev`         | Vite dev server with hot reload                                |
| `npm run build`       | Production build into the backend's `public/build`             |
| `npm run check`       | Lint and format check (`npm run check:fix` to fix)             |
| `npm run types:check` | vue-tsc                                                        |
| `npm run test:js`     | Dependency-free checks of the format, phone and branch helpers |

Run `npm run build` once before `check` and `types:check`, so the Wayfinder
helpers exist.

## Structure

```text
resources/
  css/app.css            brand tokens (Express Red), shared table pattern
  js/
    app.ts               picks each page's layout from its name
    pages/               one folder per area: orders, staff, admin, driver, track, auth, settings
    layouts/             Public, Customer, Console, Auth, Account and Settings layouts
    components/          shared components (StatusChip, TrackingNumber, Timeline, CloseButton…)
      brand/             the SVG illustrations: van, parcels, packaging tape, JourneyConveyor
      ui/                shadcn-vue primitives
    composables/         useFitsViewport and friends
    lib/                 formatting (money, weight, dates in Asia/Kuala_Lumpur), pricing, phone
    types/               page props, typed to match the backend's API Resources
tests/js/                small checks that run on plain Node
```

## Conventions

- **Mobile first.** Every page is checked from 320 px phones through tablets
  to 1440 px desktops. The driver screens are built for one-handed use on a
  phone.
- **Tables** use the shared `.data-table` grid in `app.css`: every column
  left-aligned, equal gaps, the same space at both ends, ARIA table roles. On
  phones they turn into cards.
- **Button colours carry meaning.** Red is the normal next step. Caution
  yellow with black text is only for the final confirm of a step that cannot
  be undone. White outline buttons open, switch, cancel or go back. The pale
  red tint marks what is selected.
- **One component per repeated element**, for example `CloseButton.vue` for
  every close button in dialogs, sheets and panels.
- **Light theme only**, with colours from the brand tokens.

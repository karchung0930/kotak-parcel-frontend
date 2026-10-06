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
  the backend's `composer install`, but no database.

## Setup

You need Node 22.18+ (or 24.11+), and for the backend PHP 8.3+ with Composer
2 and Docker (it runs MySQL 8.4 from its `compose.yaml`).

```bash
git clone https://github.com/karchung0930/kotak-parcel-backend.git
git clone https://github.com/karchung0930/kotak-parcel-frontend.git

cd kotak-parcel-backend
cp .env.example .env                     # port 3306 taken? set DB_PORT and FORWARD_DB_PORT in .env now
docker compose up -d --wait              # MySQL 8.4, see the backend's docs/local-development.md
composer setup                           # composer install, app key, migrations
php artisan db:seed --class=DemoSeeder   # demo data and accounts

cd ../kotak-parcel-frontend
cp .env.example .env                     # where the backend is, and where the pages reach Reverb
npm ci                                   # the exact versions in package-lock.json
npm run build                            # while editing the pages, run npm run dev in a second terminal instead

cd ../kotak-parcel-backend
composer run dev                         # http://localhost:8000, a queue listener and Reverb
```

The build reads `.env`: `KOTAK_BACKEND_PATH`, and `VITE_REVERB_APP_KEY`,
`VITE_REVERB_HOST`, `VITE_REVERB_PORT` and `VITE_REVERB_SCHEME`, where the
pages reach Laravel Reverb for live delivery progress. The key is the
backend's `REVERB_APP_KEY`. Locally that is `localhost:8080` over `http`; on
a server, the site's own address on port 443 over `https`, as nginx passes
`/app` on to Reverb. They are built into the pages, so build again after a
change. Without a key the pages show the stops as they were when opened.

## Scripts

| Command               | What it does                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`         | Vite dev server with hot reload                                                                                                                                |
| `npm run build`       | Production build into the backend's `public/build`                                                                                                             |
| `npm run check`       | Lint and format check (`npm run check:fix` to fix)                                                                                                             |
| `npm run types:check` | vue-tsc                                                                                                                                                        |
| `npm run test:js`     | Dependency-free checks of the format, pricing, phone, branch, rate import, scanner and live delivery progress helpers, and a barcode read-back with zxing-wasm |

Run `npm run build` once before `check` and `types:check`, so the Wayfinder
helpers exist.

## Structure

```text
resources/
  css/app.css            brand tokens (Express Red), shared table pattern
  js/
    app.ts               picks each page's layout from its name
    pages/               one folder per area: orders, staff, admin, driver, track, deliveries, auth, settings
    layouts/             Public, Customer, Console, Auth, Account and Settings layouts
    components/          shared components (StatusChip, TrackingNumber, Timeline, CloseButton…)
      brand/             the SVG illustrations: van, parcels, packaging tape, JourneyConveyor
      ui/                shadcn-vue primitives
    composables/         useFitsViewport, useTrackingScanner (the camera scanner's moving parts), useDeliveryProgress and friends
    lib/                 formatting (money, weight, dates in Asia/Kuala_Lumpur), pricing (rate cards), rate imports, phone, Code 39, scanner rules, delivery progress and the Reverb connection (echo.ts)
      scanner/           the barcode worker (zxing-wasm) and the OCR reader (PaddleOCR.js)
    types/               page props, typed to match the backend's API Resources
  models/                the PP-OCRv6 tiny OCR models (.tar) with their license, built into public/build with hashed names
tests/js/                small checks that run on plain Node
  fixtures/              price cases shared with the backend's PriceCalculatorTest
```

## Conventions

- **Mobile first.** Every page is checked from 320 px phones through tablets
  to 1440 px desktops, and at 320 px no text runs out of its box or into a
  button's padding: two buttons that cannot both fit their labels side by
  side stack (or give the shorter one only its own width), and a long
  label wraps inside its button. The driver screens are built for
  one-handed use on a phone.
- **Tables** use the shared `.data-table` grid in `app.css`: every column
  left-aligned, equal gaps, the same space at both ends, ARIA table roles. On
  phones they turn into cards.
- **Button colours carry meaning.** Red is the normal next step. Caution
  yellow with black text is only for the final confirm of a step that cannot
  be undone. White outline buttons open, switch, cancel or go back. The pale
  red tint marks what is selected. There is no black button (the Button
  component has no `secondary` variant): a dark fill reads as the main step.
  The outline button's edge comes from the page: the public, customer and
  sign-in layouts carry `public-surface` (in `app.css`), which gives it the
  darker grey of the fields there, and the console keeps the lighter grey.
- **Spacing follows one rhythm**, judged by the visible gap: 6px from a label
  to its field and from the field to its note, 20px between fields, 24px
  between cards and sections (20px on phones in the customer and driver
  pages), 40px from a form section's title column to its fields, 10px
  between buttons (`DialogFooter` sets it for dialogs). Grid columns are
  sized to their fields, so two narrow fields never sit far apart in a wide
  row.
- **44px touch targets.** On touch screens every control is at least 44px
  each way, while the look with a mouse stays the same. Small controls
  (copy and icon buttons, breadcrumbs, phone links, inline text buttons,
  the logo) use the `tap-target` utility in `app.css`, an invisible
  `::after` centred on them. Red links to other pages in running text are
  `TextLink.vue`, whose own 44px area grows upwards, clear of a field just
  below. Rows of links (the footer, the account menu, the admin's contact
  links) and compact filter controls grow with `pointer-coarse:` sizes,
  and the compact filter fields get 16px text there too. The 44px buttons
  of the phone screens (the camera scanner, My jobs' **Reorder stops** and
  **Move up/down**) use the Button's `size="touch"`. A button that is
  there but cannot be used right now takes `aria-disabled` rather than
  `disabled`, so it keeps the focus; the Button dims it and stops it
  lifting on hover.
- **One component per repeated element**, for example `CloseButton.vue` for
  every close button in dialogs, sheets and panels, `UnitInput.vue` for the
  short number fields in the estimator and the order, counter and admin
  forms (weights, box sides, days), `NativeSelect.vue` for selects,
  `components/ui/textarea` for every multi-line field (`size="lg"` in the
  customer, counter and driver forms), `ChoiceCard.vue` for radio choices
  shown as cards, `ToneChip.vue` under
  every status chip, `ActionDivider.vue` between two kinds of page actions,
  `RouteRatesTable.vue` for the prices from one zone (a row per
  weight limit, a column per destination, worked-out prices muted and
  the weight column held while it scrolls) on the pricing page and the
  admin's Rates pages, `RouteGroups.vue` for a card's routes as one such
  table per zone they leave from (a version's page and an
  import's preview), `FileName.vue` for an uploaded file's name (it wraps
  after "_", "-" and ".", never inside a word), `ImportFileField.vue` for choosing a spreadsheet to
  import, `SheetPreview.vue` for a few rows of a sheet (an import's columns
  step, and the example layouts on Import rates), `RouteTitle.vue` for a route's name, which wraps after the arrow
  rather than inside a zone name, `BranchName.vue` for every branch name
  shown in a template, which wraps after its dash ("Cheras - / Taman
  Connaught") and never inside a short town (`formatBranchName` gives the
  same breaks to plain text: a dialog's sentence, a line-clamped box),
  `ReceiptNumber.vue` for a receipt number, and `EmailAddress.vue` for
  every email address on an order page, which wraps after the "@" and
  before its dots while each part of usual length stays whole (a hyphen
  inside it too), so a long address neither widens a card nor is cut off. Its `mailto:` links come from `mailtoHref` in
  `lib/format.ts`, which encodes the part before the "@", so an address
  holding "?" or "&" cannot add a Bcc or a subject to the draft.
- **No lone words.** Wrapped text never ends on a single word: `body` sets
  `text-wrap-style: pretty` (the longhand, so `whitespace-nowrap` still
  holds), and short labels that may wrap (stat cards, validation messages)
  wrap balanced. Stat card labels are kept short, so one of two words fits
  on one line from 375px. Page and card intros fit on one line from tablet
  width: `PageHeader.vue` moves its actions under the title rather than
  squeeze the title and intro beside them. A name without spaces (a
  spreadsheet's file name, which an imported draft is named after) breaks
  anywhere instead of widening a column, a table or a dialog.
- **Values never split across lines.** A tracking number is always
  `TrackingNumber.vue` (size `inline` inside a sentence or on a label), so
  "KT-" never ends a line. The helpers in `lib/format.ts` join a date's
  day, month and year, and a weight's number and "kg", with no-break spaces
  (as Intl does after "RM"); `DateTime.vue` lets only the time after a
  date go to the next line. A receipt number stays whole where it fits
  (its `DescriptionItem` row has `wrap`, so it moves under the label) and
  otherwise breaks only after a hyphen, a size sum (`formatVolumeSum`) only
  before its "÷" (or not at all, `whole`, after other words), and a
  breadcrumb's ">" moves to the next line with the item after it. A list
  row cuts short only a free-text name, never an amount or a weight. An
  empty search field's placeholder gets the room Chrome keeps for its
  clear button (`app.css`). `formatPostcodeCity` and `formatDeliveryArea`
  keep a short town whole with its postcode ("47500 Subang Jaya"); a long
  one, typed by a customer, keeps only the word next to the postcode and
  wraps between the others, so it never widens a card. Text from the
  server (toasts, history notes), page and dialog titles, breadcrumbs, field
  hints, rate card names (which often hold a date) and sentences built from
  strings go through `KeepTogether.vue`, which keeps the tracking numbers,
  dates and amounts in them whole and shows each tracking number as a
  `TrackingNumber`.
- **Prices are worked out the server's way.** `lib/pricing.ts` applies the
  current rate card (zones, routes, weight bands) exactly as the backend's
  `PriceCalculator` does, for live estimates only; the server sets the
  price. The cases in `tests/js/fixtures/pricing-cases.json` run on both
  sides, so add a case there when the rules change.
- **The camera scanner is one component.** `TrackingScanner.vue` is the
  "Scan with camera" button and its full-screen sheet; a page only says what
  a number opens (`resolve`: open it, or a message and scanning goes on;
  `retry` on a message for a failure worth trying again, such as no
  connection, so the same label is read again 2 seconds later). The counter,
  My jobs and a job's pick-up use it. The camera, the barcode reads
  (zxing-wasm in `lib/scanner/barcode.worker.ts`, about 10 a second) and the
  OCR (PaddleOCR.js with PP-OCRv6 tiny, in its own worker, after 3 seconds
  without a barcode) are in `composables/useTrackingScanner.ts`; the camera
  is on only while its picture shows, so not for the typed entry or while
  the page is hidden. The steps of a scan are `ScanFlow` in `lib/scan.ts`: a
  barcode opens at once, an OCR reading needs two of the latest 8 frames to
  agree and a tap, and a refused number is skipped until "Scan again". They
  and `readTrackingNumber` (`lib/format.ts`) are checked by `tests/js`,
  partly with recorded PaddleOCR output (`tests/js/fixtures/ocr-readings.json`),
  which also reads the counter pass's Code 39 (`lib/code39.ts`, the bars
  `TrackingBarcode.vue` draws) back with zxing-wasm.
- **The scanner's assets stay on this site and load late.** The `.wasm`
  files, PaddleOCR.js's worker and the models are Vite assets with hashed
  names, fetched only when the scanner opens. `onnxruntime-web` is pinned to
  1.24.3, the version PaddleOCR.js 0.4.2's prebuilt worker is built with,
  because the worker loads that version's `.wasm` (passed as `wasmPaths`).
  PaddleOCR.js's main entry imports OpenCV.js only for the pipeline it can
  run on the page, so `vite.config.ts` points that import at a stub
  (`lib/scanner/opencvInWorker.ts`) and the 10 MB copy is never downloaded;
  the worker brings its own. The models are PaddlePaddle's PP-OCRv6 tiny
  ONNX archives, committed unmodified so the build needs no download; where
  they come from, their checksums and their license (Apache-2.0) are in
  `resources/models`.
- **Built files are compressed once.** The build writes a gzip copy
  (`name.gz`) next to every asset over 1 KB, and nginx sends those copies
  (`gzip_static`) rather than compressing each request: the scanner's
  WebAssembly runtime alone is 25 MB.
- **Pages waiting on the queue ask again.** A rate import's page polls with
  Inertia's `usePoll` (only its own props) while a job reads or checks the
  file, and stops once the job is done. A screen-reader live region says
  where the import stands each time it moves on.
- **Live delivery progress, without polling.** `StopCount.vue` is the
  "Your parcel is stop 3 — 2 stops before yours" line on the track page
  and the customer's order page: the shared `Notice` (`size="lg"`) in a
  polite live region. Each page passes its props to `useDeliveryProgress`,
  which listens on the parcel's channel (public on Track, private on the
  order page) through the one Reverb connection in `lib/echo.ts`: opened
  when a page first listens, with Laravel Echo and pusher-js loaded only
  then, WebSockets only, and closed when the last page stops. A new stop
  changes the line. Each time the channel is subscribed (on opening, and
  again after a lost connection is back) the page fetches its props once
  (an Inertia partial reload), as a message sent before then never
  arrives; a new status does too. A fetch that a message overtakes keeps
  the message's numbers and runs once more, so an older count never comes
  back. While the connection is down for good, the line adds "as of
  09:42". Nothing runs on a timer. The rules (subscribing, the shared
  connection, a page's listening, the reload guard) are plain TypeScript
  in `lib/deliveryProgress.ts`, checked by `tests/js` with a stand-in for
  Echo.
- **Stops can be reordered.** On My jobs, **Reorder stops** (a switch:
  `aria-pressed`, pale red while on, the same label either way) gives each
  of today's stops **Move up** and **Move down** (`JobCard.vue`), 44px tall,
  over the card's link. Overdue jobs carried over from earlier days move
  among today's stops like the rest: the first move puts the whole list on
  today's run (`MoveJob`), so each keeps the place it is given. After a move
  the page scrolls by as much as the stop moved, so the pressed button stays
  under the thumb with the focus, and the next tap moves the same stop
  again; the card glows briefly, a spinner shows while the move is saved,
  and a live region says where it is now. Only parcels on the van carry a
  stop number, which the server sends with the list (`stops`), worked out
  as the customer's is, so both screens say the same "stop 2" on any day.
  The page takes today from the server (`today`) rather than the browser,
  and a tab left open overnight asks for the list again when it is next
  looked at, so it never shows yesterday as today.
- **Light theme only**, with colours from the brand tokens.

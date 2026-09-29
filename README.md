# ShiftTrack

An iOS-first **React Native + Expo** app for weekly rosters and live shift tracking, built for the NexBrix Developer Assessment.

ShiftTrack lets a staff member sign in, review the current week of shifts, log a new shift, start a live shift and clock off — with a **timer that stays accurate across backgrounding, app closure and device reboots** because elapsed time is always derived from the shift's absolute start timestamp.

The UI follows the NexBrix light-mode design system: an off-white `#FAFAFA` canvas, pure-white `#FFFFFF` cards with hairline `#E4E4E7` borders and 20px corners, deep charcoal `#111111` bold headings with `#71717A` muted supporting text, and fully pill-shaped actions — a near-black `#18181B` dark-pill primary CTA and a white outlined secondary. Mint emerald `#10B981` is reserved for live/active shift indicators, and `#F4F4F5` fills the pill badges. All tokens live in `src/presentation/theme/`.

---

## Table of contents

1. [Screens & features](#1-screens--features)
2. [Architecture](#2-architecture)
3. [Key decisions](#3-key-decisions)
4. [Project structure](#4-project-structure)
5. [Getting started](#5-getting-started)
6. [Mock API layer & demoing error states](#6-mock-api-layer--demoing-error-states)
7. [The background-resilient live timer](#7-the-background-resilient-live-timer)
8. [Testing](#8-testing)
9. [Completed core items](#9-completed-core-items)
10. [Roadmap](#10-roadmap)
11. [Assumptions & assessment notes](#11-assumptions--assessment-notes)

---

## 1. Screens & features

| Route | Screen | What it does |
| --- | --- | --- |
| `(auth)/login` | **Login** | Email + password with inline validation, clear failure messaging, a `Show/Hide` password toggle, one-tap demo credentials, and secure session persistence. |
| `(app)/index` | **This week** | Weekly dashboard: week switcher, worked-hours summary, active-shift banner with a live timer, and a list of shift cards (date, start, end, break, computed hours). Pull to refresh. |
| `(app)/active` | **Active shift** | Start an open shift (`endTime: null`), watch a live `HH:MM:SS` timer, see worked/break stats, and end the shift with a confirmation. |
| `(app)/create` | **Add shift** | Form to log a completed shift: a native calendar for the date, dropdowns for the start/end times, and validation (end time must be after start time, break bounds, note length) with double-submit protection. |
| `edit/[id]` | **Edit shift** | Pushed over the tabs from any completed shift card. Same form pre-filled from the record, plus a confirmed **Delete**. Loading, not-found/error-with-retry, and "still running" states are all handled. |
| `+not-found` | **Not found** | Friendly fallback for unknown deep links. |

Plus a **Mock API controls** panel, presented as a collapsible floating widget: collapsed it is a small tab flush with the right edge of the screen (with a gently nudging arrow, a grip and a pulsing status dot to show it is interactive), and tapping it slides the panel out from the side. The tab can also be **dragged up and down the edge** — clamped clear of the header and the tab bar — so it never sits on top of a button you need. It is mounted once at the app root, so it is available on every screen including Login. It is development-only: it is hidden unless the mock transport is enabled *and* the app is a development build, so a release build never exposes failure injection or mock resets to end users.

A **lightweight feature tour** runs once per install, the first time a session becomes active. It is a four-step coach-mark overlay — weekly dashboard, live timer, manual entry, and (in development builds only) the mock failure controls — that navigates to each screen so the copy matches what is actually on screen. It adds no dependency: the steps are pure data in `src/presentation/tour/tourSteps.ts`, the overlay is hand-rolled with the core `Animated` API, and the "already seen" flag is stored through the container's secure-storage port. It has progress dots, Back/Next, and Skip, and can be replayed from the help button in the dashboard header.

**Haptic feedback** is applied throughout via a single facade (`src/presentation/haptics.ts`). Every button weights its tap by how consequential the action is (light for secondary/ghost, medium for primary/success/danger), tab presses, week stepping, switches, and tour/collapse controls give a selection tick, and genuine outcomes — a successful sign-in, a shift clocked off, a saved shift, a rejected credential or a failed save — give success/error notification feedback. The facade is fire-and-forget: unsupported hardware, Low Power Mode, a disabled Taptic Engine or a missing permission can never raise an error or delay a tap, and callers never touch the library directly.

---

## 2. Architecture

Strict Clean Architecture with a single dependency rule: **dependencies point inward**. The domain knows nothing about React, Expo, storage or HTTP.

```
┌──────────────────────────────────────────────────────────────────────┐
│  presentation/            UI, theme, Zustand stores, hooks           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  core/                     the domain — pure TypeScript        │  │
│  │  entities/    Shift, User, AuthSession (data + pure helpers)   │  │
│  │  usecases/    AuthenticateUser, GetWeeklyShifts, CreateShift,   │  │
│  │               StartShift, EndShift, RestoreSession, SignOutUser │  │
│  │  interfaces/  IAuthRepository, IShiftRepository, IHttpClient,  │  │
│  │               ISecureStorage  (ports only)                     │  │
│  │  validation/  form + range rules (pure)                        │  │
│  │  utils/       time maths (pure)                                │  │
│  │  result.ts / errors.ts   explicit Result<T> + AppError         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  infrastructure/          adapters that implement the inner ports    │
│  api/            FetchHttpClient, mockServer, mockDatabase, dto      │
│  repositories/   AuthRepository, ShiftRepository                     │
│  storage/        SecureStoreStorage (+ .web fallback), InMemory      │
│  mappers/        DTO → domain mapping with runtime validation        │
│  container.ts    composition root (no native imports)                │
│  appContainer.ts the app singleton (injects SecureStoreStorage)      │
└──────────────────────────────────────────────────────────────────────┘
```

**Data flow for every action:**

```
screen → zustand store → use case → IShiftRepository port
                                     └→ ShiftRepository → IHttpClient
                                                          └→ mockServer  (or fetch)
```

* **Errors are values, not exceptions.** Use cases return `Result<T>` = `{ ok: true, value }` | `{ ok: false, error: AppError }`. `AppError` carries a `code` (`VALIDATION`, `UNAUTHORIZED`, `CONFLICT`, `NETWORK`, …) and optional `fieldErrors`, which is exactly what the UI needs to show inline validation or a retry panel.
* **Ports and adapters.** `IAuthRepository`, `IShiftRepository`, `IHttpClient` and `ISecureStorage` live in `core/interfaces`. Everything concrete lives in `infrastructure`.
* **One composition root.** `createAppContainer()` is the only place that constructs adapters. It deliberately imports **no native modules**, so the whole graph can be built in plain Node — which is what makes `container.test.ts` possible. The native `SecureStoreStorage` is injected by `appContainer.ts`, which only the running app imports.

📄 `ARCHITECTURE.md` in the repository root contains the original layer blueprint this implementation follows.

---

## 3. Key decisions

| Decision | Why |
| --- | --- |
| **Expo Router with `Stack.Protected`** | Auth gating is declarative: the signed-out guard renders only the `(auth)` group, the signed-in guard only `(app)`. No manual `router.replace` calls, no redirect loops, and deep links are handled correctly. |
| **Zustand for presentation state** | Stores stay thin (loading flags, error objects, cached lists) and contain zero business rules. Business rules live in use cases so they are testable without React. |
| **Custom in-app mock layer instead of MSW** | No service worker / native module requirement, zero extra dependencies, and it is fully deterministic and inspectable. Crucially, it implements the **same `IHttpClient` contract** as the real client, so status-code mapping and `AppError` normalisation are exercised identically in dev and in production. |
| **`fetch` behind `IHttpClient`** | One interface, two transports. Switching to a real backend is a single-line change (`EXPO_PUBLIC_MOCK_API=false`) — no repository or use case changes. |
| **Layered validation** | The form validates for UX, the use case re-validates the business rule (defence in depth), and the mock API validates the contract. Each layer has its own tests. |
| **Platform-branched haptics behind one facade** | Expo's own docs discourage the Vibrator-based `impactAsync`/`notificationAsync` on Android, so each intent maps to a semantic `performAndroidHapticsAsync` effect there (`Segment_Tick`, `Virtual_Key`, `Confirm`, `Reject`) and to `UIImpactFeedbackGenerator`/`UINotificationFeedbackGenerator` on iOS. Callers just say `haptics.success()` — the branch, the `try`/`catch` and the fire-and-forget behaviour live in one file. |
| **Timestamps, never tick counters** | The live timer is a pure function of `now - startTime`. See [section 7](#7-the-background-resilient-live-timer). |
| **Separate `SESSION` and `TOKEN` secure keys** | Reading the bearer token for every request costs one keychain read instead of a JSON parse, and a corrupt session blob can be discarded without losing the token slot (or vice versa). |
| **`SecureStoreStorage.web.ts`** | `expo-secure-store` has no web support; Metro resolves the web file for `--web` and falls back to `localStorage` with an in-memory safety net. |
| **Runtime DTO validation in mappers** | A drifting backend cannot inject `undefined` into domain entities; malformed payloads become a friendly `SERVER` error. |
| **Strict TypeScript everywhere** | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`. **Zero `any`** in `src/`. |
| **Node-env Jest (`babel-jest` + `babel-preset-expo`)** | The logic suite runs in a plain Node environment with `@/` mapped through `moduleNameMapper`, so it is fast and free of native-module mocking. Only `expo/virtual/env` is transformed out of `node_modules` (see the comment in `jest.config.js`). |

---

## 4. Project structure

```
.
├── app.json                  # Expo config (light UI + #FAFAFA splash, bundle id, plugins)
├── eslint.config.js          # eslint-config-expo (flat config)
├── jest.config.js            # Node-env Jest + @/ path mapping
├── tsconfig.json             # strict, noUncheckedIndexedAccess, @/* alias
├── .env.example              # documented EXPO_PUBLIC_* flags
├── ARCHITECTURE.md           # original clean-architecture blueprint
└── src
    ├── app/                                  # Expo Router routes
    │   ├── _layout.tsx                       # Stack + Stack.Protected guards
    │   ├── +not-found.tsx
    │   ├── edit/[id].tsx                     # Edit / delete one shift (over tabs)
    │   ├── (auth)/_layout.tsx
    │   ├── (auth)/login.tsx
    │   └── (app)/_layout.tsx                 # Tabs
    │       ├── index.tsx                     # This week
    │       ├── active.tsx                    # Active shift + live timer
    │       └── create.tsx                    # Add shift form
    ├── core/                                 # domain (no React / no native)
    │   ├── entities/{Shift,User,index}.ts
    │   ├── errors.ts · result.ts
    │   ├── interfaces/{IAuthRepository,IShiftRepository,IHttpClient,ISecureStorage,index}.ts
    │   ├── usecases/{AuthenticateUser,RestoreSession,SignOutUser,GetWeeklyShifts,
    │   │            GetActiveShift,GetShiftById,CreateShift,UpdateShift,DeleteShift,
    │   │            StartShift,EndShift,index}.ts
    │   ├── utils/time.ts
    │   └── validation/shiftValidation.ts
    ├── infrastructure/
    │   ├── api/{FetchHttpClient,mockServer,mockDatabase,dto,endpoints}.ts
    │   ├── config/appConfig.ts
    │   ├── mappers/apiMappers.ts
    │   ├── repositories/{AuthRepository,ShiftRepository}.ts
    │   ├── storage/{SecureStoreStorage,SecureStoreStorage.web,InMemoryStorage,storageKeys}.ts
    │   ├── container.ts                      # createAppContainer (pure)
    │   └── appContainer.ts                   # app singleton (native storage)
    ├── presentation/
    │   ├── components/                       # Button, Card, Badge, TextField,
    │   │                                     # LiveTimer, ShiftCard, states…
    │   ├── components/FieldShell.tsx         # shared field chrome (label/border/error)
    │   ├── components/DateField.tsx          # native calendar date picker
    │   ├── components/SelectField.tsx        # dropdown sheet (start/end times)
    │   ├── components/FeatureTourOverlay.tsx # first-run coach marks
    │   ├── components/ShiftForm.tsx          # shared create/edit form + field-error mapping
    │   ├── components/MockDevWidget.tsx      # collapsible, draggable dev panel host
    │   ├── components/mockDevTools.ts        # shared dev-tools availability gate
    │   ├── haptics.ts                        # platform-aware haptic facade
    │   ├── hooks/{useNow,useElapsedTimer}.ts
    │   ├── store/{useAuthStore,useShiftStore,useShiftEditorStore,useTourStore,index}.ts
    │   ├── tour/tourSteps.ts                 # tour content (pure data)
    │   └── theme/{colors,typography,spacing,index}.ts
    └── __tests__/
        ├── domain/{shiftDuration,liveTimer}.test.ts
        ├── core/{shiftValidation,usecases}.test.ts
        ├── infrastructure/{authPersistence,mockApi,container}.test.ts
        └── helpers/fakes.ts
```

---

## 5. Getting started

### Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js 20+** (tested on 24) | `node -v` |
| **npm** (bundled) | The project uses `npm`; `package-lock.json` is committed. |
| **Expo Go** on a device, **or** Xcode / Android Studio | `expo-secure-store`, `expo-haptics` and `@react-native-community/datetimepicker` all ship inside Expo Go, so **no development build is required** (haptics and the native pickers are best felt/seen on a physical device). |
| **macOS** | Only needed for a local iOS Simulator build. You can develop on Windows/Android and use EAS for iOS. |

### 1. Install

```bash
npm install
```

### 2. Configure (optional)

The app runs with defaults out of the box in a development build (`npm start`), where the in-app mock API is enabled automatically. No `.env` file is required to demo the app; create one only to override the defaults.

```bash
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
```

### 3. Run

```bash
npm start                # Expo dev server; press i (iOS), a (Android), w (web)
npm run ios              # start and open the iOS simulator directly
npm run android          # start and open Android
npm run web              # web target (SecureStore falls back to localStorage)
```

### 4. Sign in

```
Email:    staff@shifttrack.test
Password: Password123
```

The login screen has a **Use demo credentials** shortcut, and the same pair is validated by the mock API (any other password returns a real `401`).

### 5. Verify the codebase

```bash
npm run typecheck        # tsc --noEmit   (strict, zero errors)
npm run lint             # eslint-config-expo (zero errors)
npm test                 # Jest — 106 unit tests across 7 suites
npm run test:coverage    # same, with a coverage report for core/ + infrastructure/
npm run doctor           # expo-doctor (21/21 checks)
```

### 6. Build for devices

```bash
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile production  --platform ios
npx eas-cli@latest update --branch production  # OTA update
```

`ios/` and `android/` are generated by Continuous Native Generation — never edit them by hand. Native behaviour is configured through `app.json` config plugins.

---

## 6. Mock API layer & demoing error states

### Where it lives

| File | Responsibility |
| --- | --- |
| `src/infrastructure/api/mockServer.ts` | Routing, latency, and the failure-simulation flags (`MockServer` class + `mockServer` singleton). |
| `src/infrastructure/api/mockDatabase.ts` | In-memory users/shifts, seeded relative to the current week, with `resetDatabase()`. |
| `src/infrastructure/api/FetchHttpClient.ts` | Dispatches to the mock transport or the real network — then applies identical status→`AppError` mapping to both. |

### Simulated endpoints

| Method | Path | Behaviour |
| --- | --- | --- |
| `POST` | `/auth/login` | `200 { token, issuedAt, user }`, `400` on an empty body, `401` on bad credentials. |
| `GET` | `/shifts?weekStart=YYYY-MM-DD` | Shifts that start inside that week. `401` without a bearer token, `400` on a malformed `weekStart`. |
| `GET` | `/shifts/:id` | `200 { shift }` for the edit screen. `404` when the shift is unknown or owned by someone else. |
| `POST` | `/shifts` | `201 { shift }`; `endTime: null` creates a running shift. `400` when `endTime <= startTime` (with `fieldErrors.endTime`), `409` when a shift is already running. |
| `PATCH` | `/shifts/:id` | `200 { shift }` after patching `startTime` / `endTime` / `breakMinutes` / `note`. `404` when the shift is unknown or owned by someone else, `400` when the patch would invert the range — validated against the pair the patch *results in*, so moving only the start past an unchanged end is rejected too. |
| `DELETE` | `/shifts/:id` | `204 No Content`. `404` when the shift is unknown or owned by someone else. |

Every request also carries an artificial latency (`EXPO_PUBLIC_MOCK_LATENCY_MS`, default `650 ms`) so loading states are real, plus a `600 ms`-style delay before the response is returned.

### Three ways to make requests fail

**Option A — in-app dev panel (recommended for demos).**
The **Mock API controls** panel lives in a collapsible widget pinned to the right edge of the screen, on every screen (it is mounted at the app root). Collapsed, it shows a grip-topped arrow tab; tap it to slide the panel out, and use the chevron in its header to collapse it again. If the tab is in your way, **drag it up or down the edge** (it springs into place and stays clear of the header and tab bar), or use the accessibility "Move up"/"Move down" actions. It only appears in a development build with the mock transport enabled, so it can never reach a release user:

* **Simulate network errors** (switch) → every subsequent request throws a `NETWORK` `AppError`. Pull to refresh the week and you get the error state with a **Retry** button.
* **Fail next request** → exactly one request fails, the next one succeeds. This is the cleanest way to prove that **Retry actually recovers**.
* **Reset mock data** → re-seeds the in-memory database (removes anything you created).

**Option B — environment variables.**

```bash
# .env
EXPO_PUBLIC_MOCK_ERRORS=true     # boot with failures on
EXPO_PUBLIC_MOCK_API=false       # disable the mock layer entirely
EXPO_PUBLIC_MOCK_LATENCY_MS=0    # instant responses (handy for demos)
EXPO_PUBLIC_API_BASE_URL=https://your-real-api.example.com
```

Restart the dev server after changing them (Expo inlines `EXPO_PUBLIC_*` at build time).

**Option C — programmatically** (e.g. from a test or a scratch screen):

```ts
import { mockServer } from '@/infrastructure/api/mockServer';

mockServer.setAlwaysFail(true);                  // master switch
mockServer.failNext();                           // one-shot failure
mockServer.setFailureRate(0.5);                  // random 50% failure rate
mockServer.setLatencyMs(2_000);                  // slow-network simulation
mockServer.resetConfig();                        // back to defaults
mockServer.resetDatabase();                      // re-seed shifts
```

### Suggested 60-second demo script

1. Sign in with the demo credentials → the seeded week renders immediately (on a first run the **feature tour** opens over it — step through it, or tap **Skip**).
2. Tap **Active → Start shift now** → the timer starts ticking.
3. Press the device **Home** button for a minute, come back → the timer jumped forward correctly (it was never counting ticks).
4. Force-quit the app from the app switcher, reopen it → the session is restored from the Keychain and the **same running timer** continues from the shift's stored start time.
5. **Active → End shift** → the shift moves into the week list with its computed hours.
6. **This week → Add shift** → tap **Date** to open the native calendar, pick the start and end times from the dropdowns, and try an end time earlier than the start to see the inline `End time must be after start time.` error — then fix it and save.
7. **Tap the shift you just added** in the week list → the edit screen opens pre-filled. Change the break or times and **Save changes**, or use **Delete shift** (with confirmation) and watch it disappear from the week.
8. Tap the arrow tab on the right edge of the screen to open **Mock API controls → Simulate network errors**, pull to refresh → error state. Switch it off and tap **Retry**. (Drag the tab up or down the edge if it happens to sit over a button.)
9. To see the **empty state**, use the week switcher to browse to another week.

---

## 7. The background-resilient live timer

The requirement is that the timer must survive backgrounding, closing and reopening the app. A `setInterval` that increments a counter cannot do this: iOS suspends JS timers when the app is backgrounded, so ticks are dropped and the displayed time drifts behind reality.

ShiftTrack instead captures the shift start as an **absolute ISO-8601 instant** and recomputes the elapsed duration on every render/read:

```ts
// src/core/utils/time.ts
export function elapsedMsSince(startIsoTimestamp: string, nowMs: number): number {
  return Math.max(0, nowMs - toEpochMs(startIsoTimestamp));
}

export function formatTimer(durationMs: number): string {
  // → "HH:MM:SS" (hours keep counting past 24 rather than wrapping)
}
```

```ts
// src/presentation/hooks/useElapsedTimer.ts
export function useElapsedTimer(startIsoTimestamp: string | null, running: boolean): number {
  const nowMs = useNow(TICK_INTERVAL_MS, running && startIsoTimestamp !== null);
  if (startIsoTimestamp === null) return 0;
  return elapsedMsSince(startIsoTimestamp, nowMs);   // derived, never accumulated
}
```

`useNow` ticks once per second **only while a shift is running** and additionally calls `setNowMs(Date.now())` the moment `AppState` reports `active`, so resuming from the background corrects the display instantly instead of waiting up to a second. State is never written synchronously inside an effect body (satisfies `react-hooks/set-state-in-effect`).

Because the timer is a pure function of two timestamps:

* backgrounding for two hours shows `02:00:00`, not `00:01:03`;
* killing and reopening the app resumes at exactly the right value;
* device clock skew is clamped to zero instead of rendering `-00:00:04`;
* the same functions are reused for the "worked hours" totals on the dashboard and the shift cards.

This is verified by `src/__tests__/domain/liveTimer.test.ts`, including a test that explicitly contrasts the timestamp-derived value with a naive accumulator that missed ticks.

---

## 8. Testing

```bash
npm test                 # run everything
npm run test:watch       # watch mode
npm run test:coverage    # coverage for src/core + src/infrastructure
```

**124 tests / 8 suites, all green.** The suite runs in a plain Node environment (no native modules), which is why the domain layer has zero React/Expo coupling.

| Suite | Covers |
| --- | --- |
| `domain/shiftDuration.test.ts` | Duration maths: break subtraction, zero-clamping, running shifts measured against `now`, rounding, weekly totals, `HH:MM:SS` and `7h 30m` formatting, Monday-based week maths, strict date/time validation, timezone-independent differences. |
| `domain/liveTimer.test.ts` | **Live timer accuracy**: foreground ticking, multi-hour background gaps, kill-and-reopen resumption, dropped-tick (accumulator) regression, monotonicity, clock-skew clamping. |
| `core/shiftValidation.test.ts` | **Form validation** — end-before-start, end equal to start, required/malformed times, invalid calendar dates, negative/fractional/oversized breaks, note length, whitespace handling, plus the cross-field range rule used by the use case. |
| `core/usecases.test.ts` | Business rules in isolation with typed fakes: session persistence on sign-in, no persistence on a 401, sign-out, chronological sorting, week-key validation, create/start/end shift rules, conflict on a second running shift. |
| `core/shiftEditing.test.ts` | **Edit & delete**: `UpdateShift` reuses the creation rules (end-after-start, break bounds) and sends the new start time; `DeleteShift`/`GetShiftById` id and failure paths; then the same operations end to end through the container — read back by id, `404` for unknown ids, no cross-user leakage, an edit reflected in the week, the resulting-pair patch rule, delete-then-404, and `401` without a session. |
| `infrastructure/authPersistence.test.ts` | **Auth token persistence**: both keys written, token retrievable, session restored by a *fresh* repository (cold start), sign-out clearing, corrupt JSON and structurally invalid payloads discarded, and failures not being swallowed. |
| `infrastructure/mockApi.test.ts` | Seven endpoints, `401`/`400`/`404`/`409` → `AppError` mapping, field-error propagation, and all three failure-simulation modes (`alwaysFail`, `failNext`, `failureRate`). |
| `infrastructure/container.test.ts` | End-to-end through the real composition root: sign in → restore in a new container ("restart") → load week → create shift → see it refetched → start/end an active shift → conflict guard → simulated outage + recovery → sign out. |

---

## 9. Completed core items

### Authentication (secure session)
- [x] Login screen with email + password (`staff@shifttrack.test` / `Password123`)
- [x] Client-side validation with clear, field-level error messages
- [x] Real `401` handling surfaced as "Incorrect email or password."
- [x] Token + session stored in **Expo SecureStore** (iOS Keychain / Android Keystore)
- [x] Session restored on cold start; splash screen held until the session is known
- [x] Logout from the dashboard header, clearing both secure keys

### Weekly shifts view
- [x] `GET /shifts?weekStart=YYYY-MM-DD` via a repository → use case pipeline
- [x] Date, start time, end time, break minutes and calculated total hours per shift
- [x] Weekly totals (worked hours, shift count, unpaid break) and a live active-shift banner
- [x] Loading, Empty and Error states, each with a **Retry** trigger
- [x] Pull-to-refresh and week navigation (previous / next / jump to this week)

### Create shift form
- [x] Date, start, end, break and note inputs with inline validation
- [x] **End time must be after start time** (enforced in the form, the use case *and* the API)
- [x] Double-submission prevented (button disabled + spinner while pending)
- [x] Instant UI update on success (the visible week refetches automatically)

### Active shift & background-resilient live timer
- [x] Start an open shift (`endTime: null`), rejecting a second concurrent shift with `409`
- [x] Live `HH:MM:SS` timer derived from the absolute start timestamp
- [x] Correct after backgrounding, force-quit and relaunch
- [x] End the shift via `PATCH /shifts/:id` with a confirmation dialog

### Editing & deleting shifts
- [x] Tap any completed shift card to open it for editing
- [x] Edit is a **full** change (date, start, end, break, note) reusing the exact validation, form and helpers as creation — one `ShiftForm`, two screens
- [x] Delete behind a confirmation dialog, `204`-backed and reflected in the week immediately
- [x] `GET`/`DELETE /shifts/:id` with ownership checks (`404` rather than leaking another user's shift)
- [x] Loading, not-found/error-with-retry, and "still running → end it from Active" states

### Mock API layer
- [x] `POST /auth/login`, `GET /shifts?weekStart=…`, `GET /shifts/:id`, `POST /shifts`, `PATCH /shifts/:id`, `DELETE /shifts/:id`
- [x] In-memory database seeded relative to the current week, with a reset action
- [x] Artificial latency for honest loading states
- [x] Error toggle/flag: always-fail, fail-next and failure-rate — surfaced in a **development-only** dev panel **and** via `EXPO_PUBLIC_MOCK_ERRORS`

### Architecture & code quality
- [x] `entities` / `usecases` / `interfaces` / `infrastructure` / `presentation` layers
- [x] Dependency rule enforced — `core/` imports nothing from `infrastructure/` or the UI
- [x] 100% strict TypeScript, **no `any`**
- [x] NexBrix theme tokens in `src/presentation/theme/colors.ts` (+ typography & spacing)
- [x] Comprehensive unit tests in `src/__tests__/` (106 passing)
- [x] Typecheck, lint and `expo-doctor` all clean; iOS production bundle verified

---

## 10. Roadmap

**Near term**
- Swap the mock layer for a real backend (the only change is `EXPO_PUBLIC_MOCK_API=false` plus DTO confirmation).
- JWT refresh-token rotation and silent re-authentication on `401`.
- Native date/time pickers (`@react-native-community/datetimepicker`) instead of text entry.
- Swipe actions on the shift cards (edit/delete currently live on the edit screen).
- Optimistic UI updates with rollback on failure.

**Product**
- Manager view: approve timesheets, see the whole team's week.
- Break enforcement (automatic unpaid break deduction after N hours).
- Overtime rules, penalties and pay-rate calculation.
- Shift reminders and "still clocked in?" nudges via `expo-notifications`.
- Export a week as CSV/PDF for payroll.

**Engineering**
- Offline-first cache (SQLite / WatermelonDB) with a queued write-back sync.
- Biometric app lock (`SecureStore` + `requireAuthentication`) for clocking on/off.
- Background task (`expo-background-task`) to reconcile a running shift server-side.
- Component tests with `@testing-library/react-native` and E2E flows with Maestro/Detox.
- CI pipeline: typecheck + lint + test on PR, EAS Build/Update on merge to `main`.
- Accessibility pass (dynamic type, VoiceOver labels, contrast audit) and i18n scaffolding.
- Light theme / system-following theme (the token layer already supports it).
- Analytics and crash reporting (Sentry) behind an `infrastructure` adapter.

---

## 11. Assumptions & assessment notes

* **Week definition.** A week is Monday 00:00 → Sunday 23:59 in the device's local timezone. `weekStart` is always a Monday `YYYY-MM-DD` key.
* **Hours maths.** `total hours = (end − start) − unpaid break`, rounded to the nearest minute for display and shown in decimal hours for the weekly total.
* **Same-day shifts only.** The spec requires `endTime > startTime`; overnight shifts are therefore out of scope (a future roadmap item would allow an `endTime` on the next day).
* **One running shift.** `GET /shifts` is used to detect an open shift (`endTime === null`); the mock API also returns `409` if a second one is created, so the rule holds even if the client check is bypassed.
* **Active-shift lookup.** `ShiftRepository.getActiveShift()` checks the current week and falls back to the previous week, so a shift started late on Sunday is still found on Monday.
* **The mock layer is the network in development.** It is enabled by default in a development build and disabled by default in a release build, so a production build must be configured with `EXPO_PUBLIC_API_BASE_URL`. Setting `EXPO_PUBLIC_MOCK_API=true` explicitly opts back in (useful for a production-mode demo), and `false` always disables it. `EXPO_PUBLIC_*` values are inlined at build time, so restart the dev server after changing them.
* **Session payload.** `{ token, issuedAt, user }` is stored as JSON under `shifttrack.session.v1`; the raw bearer token is duplicated under `shifttrack.token.v1` for cheap header reads. Corrupt payloads are discarded and cleared rather than crashing the app.

# Agent Payments Console

> **Unofficial demo.** I built this for my application to Saifuro. It is not affiliated with or endorsed by Saifuro, and it doesn't use their name, branding or API. All agents, mandates and approvals are mock data. The paid-out payments are real USDC transfers on the Base Sepolia test network.

A small console where a finance team reviews payments that AI agents want to make. An agent requests a payment, the request is checked against a spending mandate a person approved earlier, and anything that breaks a rule waits in a queue for a human decision.

**Live demo:** https://agent-payments-console.vercel.app

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, TanStack Query and viem.

## What it shows

1. **Approval queue** (`/approvals`). Pending payments with agent, payee, amount, the rule that flagged them, and how long they've waited. It is sortable and filterable, and filters live in the URL. Everything works with the keyboard alone.
2. **Payment detail** (`/payments/[id]`). Explains in plain language why the payment needs approval, for example _"Exceeds the 500.00 USDC per-transaction limit for Procurement Agent by 120.00 USDC."_ It shows the full mandate with the triggered rules marked, and lets you approve or reject with a note. A reason is required to reject.
3. **Payment timeline.** Requested → Policy check → Human approval → Sent on Base → Confirmed. For paid-out payments, the onchain steps are read live from Base Sepolia.

Things to try:

- Filter the queue by "New payee".
- Reject a payment without a note.
- In **Payment history**, open an _API Credits Agent_ payment to see live chain data.
- In **Demo controls**, simulate an RPC outage or a transfer that hasn't been recorded yet.

## Run it

Requires Node 22.12 or newer.

```bash
npm install
npm run dev                         # http://localhost:3000
```

| Command                                   | What it does                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run typecheck` / `npm run lint`      | TypeScript and ESLint                                                                        |
| `npm run lint:fix`                        | Fix the ESLint issues that can be fixed automatically                                        |
| `npm run format` / `npm run format:check` | Format all files with Prettier, or only check them                                           |
| `npm test`                                | Unit tests, plus component tests in headless Chromium                                        |
| `npm run test:e2e`                        | Builds the app and runs Playwright end-to-end and accessibility tests, with the chain mocked |
| `npm run test:live`                       | Smoke test that reads the configured transfers from the real Base Sepolia RPC                |

Run `npx playwright install chromium` once before the browser-based tests. The app uses the public RPC `https://sepolia.base.org`; to use another, set `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`.

### Using your own transfers

The paid-out payments come from [`src/config/settlements.ts`](src/config/settlements.ts):

1. Get test USDC from [Circle's faucet](https://faucet.circle.com).
2. Send it on Base Sepolia.
3. Paste each transaction hash, amount, payee address and time into the config file.

Each entry plays one part ("auto-approved", "over the limit", "new payee"), and a unit test checks that its amount fits that part. No keys are involved: the app only ever reads from the chain.

The USDC contract address (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`) comes from Circle's [USDC Contract Addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses) page, "Testnet" table.

## Design decisions

### Explaining onchain data to people who don't read block explorers

- **Plain words first, technical details second.** The timeline says _"Recorded on Base"_ and _"Final. This payment can no longer be reversed."_ Block number, confirmations and the transaction reference sit in a separate "Technical details" box, each with a one-line explanation such as _"Blocks added since. Each one makes the payment harder to reverse."_ The block explorer link is small and comes last.
- **It answers the question finance actually asks: did the right amount reach the right payee?** The app decodes the USDC `Transfer` event from the receipt, counting only events from Circle's USDC contract. It compares that with the approved amount and payee, and doesn't trust what the transaction claimed. A mismatch is called out in words.
- **"Final" uses the chain's own finality, not a confirmation count.** Base adds a block about every 2 seconds, so confirmations reach the thousands within minutes and tell a reader little. The app compares the payment's block with the chain's `finalized` block. When I measured it, that block trailed the newest one by about 19 minutes, so until then the timeline says _"becoming final, usually about 20 minutes"_.
- **Unknown is not the same as failed.** If the RPC can't be reached, the onchain steps show "Unknown" with a retry button, and the text says the payment itself isn't affected. A reverted transfer is a different, explicit state: _"The network rejected this transfer. No money moved."_
- **Data that never changes is never refetched.** Once a receipt is recorded, it's cached for good. Only the latest and finalized block numbers are polled, every 6 seconds, and polling pauses while the tab is in the background.

### Data layer

- The UI talks to a typed `PaymentsApi` interface ([`src/lib/api/client.ts`](src/lib/api/client.ts)). The mock version runs in the browser and saves decisions to `localStorage`. I chose this over Next.js route handlers with in-memory state because, on serverless hosting, requests can land on different instances, so an approved payment could reappear. It also gives every reviewer their own copy of the data. "Reset demo data" in Demo controls clears it. Moving to a real backend means implementing the same interface with `fetch`.
- A policy decision records the facts at the time of the check, such as the limit, the attempted amount and what was already spent today. Explanations are built from these facts, so they stay the same if the mandate changes later.
- Money is stored as integer strings in USDC base units and handled as `bigint`, never as floats. Amounts are always shown as `1,240.00 USDC`.

### UI and accessibility

- **A small design system** in [`src/components/ui`](src/components/ui): Button, Badge, DataTable, Dialog, Timeline, Field, Alert, Panel, Skeleton.
  - Colors are tokens defined once with CSS `light-dark()`, so light and dark mode share one source.
  - Tailwind's default palette is switched off, so components can't use colors outside the tokens.
  - A unit test checks WCAG AA contrast for every text/background pair in both themes.
- **Native elements before ARIA:**
  - The queue is a real `<table>` with `aria-sort` on sortable headers.
  - Each row has one link, and the whole row is clickable for mouse users.
  - Dialogs use the native `<dialog>`.
  - The theme switch is a radio group.
- **Focus management:**
  - After navigation, focus moves to the new page's heading, waiting for it if the page is still loading.
  - Closing a dialog returns focus to where it was.
  - After a decision, focus moves to the confirmation, so screen readers announce it.
- **Status is never color alone.** Every badge and timeline step has text and an icon, and step states are spelled out for screen readers.
- **Reduced motion is respected.** The only animation, the pulse on the step in progress, is off when the user prefers reduced motion.
- **Next.js 16 specifics.** Cache Components is on, so each page has a prerendered shell and loads its data inside `<Suspense>`. Next keeps recently visited pages mounted but hidden, so dialogs close and confirmations reset when you navigate away.

## Tests

| Layer           | Tool                           | Covers                                                                                                                                                                                                                                      |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (149)      | Vitest                         | Policy explanations, timeline state mapping, chain receipt parsing and transfer checks, formatting, mock API, seed data and config consistency, theme contrast                                                                              |
| Component (17)  | Vitest browser mode (Chromium) | Table sorting by keyboard, dialog focus and Escape, timeline semantics, onchain states, approve/reject flow                                                                                                                                 |
| End-to-end (23) | Playwright + axe               | Keyboard-only review flow, approvals reaching history, URL filters, simulated outages, every onchain state (via a mocked RPC), axe scans of each page in light and dark, reduced motion, no sideways scrolling on phones, theme persistence |
| Live (3)        | Playwright                     | The configured transfers on real Base Sepolia                                                                                                                                                                                               |

Automated checks catch only part of what matters for accessibility. A manual screen reader pass is listed under next steps.

## Dependencies

Beyond the requested stack (Next.js, React, TypeScript, Tailwind CSS, TanStack Query, viem), these are all dev dependencies:

| Package                                              | Why                                                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `vitest`                                             | Unit tests                                                                                     |
| `@vitest/browser-playwright`, `vitest-browser-react` | Component tests in a real browser, which has `<dialog>`, focus and media queries, unlike jsdom |
| `@playwright/test`, `playwright`                     | End-to-end tests, and the browser for component tests                                          |
| `@axe-core/playwright`                               | Automated WCAG checks in the end-to-end tests                                                  |
| `prettier`                                           | Consistent code formatting                                                                     |

There is no component library, date library or icon package. The dialog is native, formatting uses `Intl`, and the dozen icons are inline SVG.

## What I'd do next

- **A real backend:**
  - Implement `PaymentsApi` against an API and evaluate policies on the server.
  - Add sign-in and roles: who may approve what, and a second approver above a threshold.
- **Solana.** `network` is already a typed field. A Solana reader can produce the same `OnchainStatus` shape, so the timeline wouldn't change.
- **Live queue updates** pushed from the server, instead of polling when a page opens.
- **Faster review for high volumes:** bulk approve or reject, and keyboard shortcuts. Only once real usage shows the need.
- **Audit trail export** (CSV) and a flow for editing mandates, which itself needs approval.
- **Locale-aware formatting.** Numbers and dates are fixed to `en-US` for now; times use the viewer's time zone.
- **Manual screen reader testing** (VoiceOver, NVDA) of the review flow.
- **Usability sessions with finance users** to test the wording, especially around finality.

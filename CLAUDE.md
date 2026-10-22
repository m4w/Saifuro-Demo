# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: Agent Payments Console (unofficial demo)

Commands: `npm run dev` | `typecheck` | `lint` | `test` | `test:e2e` | `test:live` | `build`
Done = typecheck, lint, test, test:e2e and build all pass.

### Hard rules

- No private keys, seed phrases, wallet connectors or signing code. Chain access is read-only (viem public client).
- Never use "Saifuro" (name, logo, colors) in the UI or in code. Only the README mentions it, as an unofficial demo. Don't claim the types mirror their API.
- The USDC address lives only in `src/lib/chain/usdc.ts`, with the Circle docs URL as its source. Never change it from memory.
- Every new dependency gets a one-line reason in the README.

### Money and time

- Amounts are base-unit strings (6 decimals) in data and `bigint` in logic. Never `Number`/`parseFloat` for money.
- Display only through `formatUsdc()` ("1,240.00 USDC") and the time formatters in `src/lib/format`. No inline `toFixed`/`toLocaleString`.

### UI

- Native elements first: `button`, `a`, `table`, `dialog`, `label`. No clickable divs, no ARIA grid.
- Colors only through theme tokens, never raw Tailwind palette classes, so dark mode and contrast live in one place.
- Everything reachable by keyboard, with a visible focus ring.
- Status is never shown by color alone: always icon + text.
- Motion only when `prefers-reduced-motion` allows it.
- Every data view has loading, empty and error (with retry) states.
- Shared building blocks live in `src/components/ui`. No variants nobody uses.

### Copy (readers are finance teams, not engineers)

- Main text in plain language: "payment", "recorded on Base", "final". "Transaction hash", "gas", "nonce" appear only in the technical-details row.
- Policy explanations name the rule, the limit and the difference.

### Tests

- `src/lib` logic: Vitest unit tests next to the file (`*.test.ts`).
- Components: Vitest browser mode (`*.browser.test.tsx`), queried by role/label like a user would. Test IDs only as a last resort.
- E2E (`e2e/`): Playwright against a production build, with the chain RPC mocked. Tests never depend on live Base Sepolia, except the opt-in `test:live` smoke test.
- Every bug fix starts with a failing test.

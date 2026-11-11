# Feature map

One file per user-facing feature. Each says how a person or an agent reaches it, how to drive it, and what end state proves it. URLs are relative to `npm run dev` (`http://127.0.0.1:5173/`) or `npm run preview` (`http://127.0.0.1:4173/`).

| Feature | File | Drive |
| --- | --- | --- |
| Payables collections: To approve, All invoices, Vendors | [collections.md](collections.md) | Vitest, browser |
| Approve an invoice, the named task | [approve-invoice.md](approve-invoice.md) | Vitest, step budget, browser |
| Request changes, the branch | [request-changes.md](request-changes.md) | Vitest, browser |
| Modeled-state preview | [state-preview.md](state-preview.md) | Vitest, target size |
| The rule gate: checks, fixtures and proposals | [rule-gate.md](rule-gate.md) | build gate, fixtures |

When a feature is added or changes, update its file in the same pull request.

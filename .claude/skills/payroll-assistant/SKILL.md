---
name: payroll-assistant
description: Payroll Assistant (no AI) — searchable how-to topics with question → answer walk-throughs and read-only "Check my case" lookups. Use for src/components/payroll_assistant/, src/pages/payroll/assistant/, the payroll_assistant endpoints, adding / changing topics, checks or the search.
---

# Payroll Assistant

User decision (2026-10-15): **no AI**; staff only; "Check my case" for the
five common concerns. It answers "how do I…" from topics the payroll
manager maintains — it never changes data.

## Files

- vueportal: `AssistantTopic` (`assistant_topics`: code, title, category
  (`AssistantTopic::CATEGORIES`), keywords, summary, `tree`, `check`,
  `outcomes`, active, sort_order; audited 'Payroll'), `AssistantSearch`
  (`assistant_searches`: every search + its best topic, null = unanswered);
  migration `2026_10_23_100000`. `Services/PayrollAssistantService.php`,
  `PayrollAssistantController`, `PayrollAssistantMaintenance`
  (`payroll-assistant` = use; `payroll-assistant-manage` = topics +
  unanswered), prefix `payroll_assistant`. `PayrollAssistantTopicSeeder`
  (26 starting topics, firstOrCreate by code — never overwrites edits).
  PayrollRoleSeeder: Payroll Officer / Timekeeper use it, Payroll Manager
  also manages.
- React: `services/payroll/payrollAssistantApi.js` (contract in its header),
  `components/payroll_assistant/` — `PayrollAssistantButton` (top-bar "?",
  Drawer, in `MainLayout` before the bell), `PayrollAssistantPanel` (search +
  browse by category), `AssistantTopicView` (walk-through + Check my case);
  `pages/payroll/assistant/PayrollAssistantPage` (`/payroll-assistant`,
  Payroll → Help: Ask / Topics / Unanswered) and `AssistantTopicFormModal`.

## Topic tree

`{ start, nodes: { id: { q, options: [{ label, next }] } | { title, steps:
[{ text, link?, link_label? }], note? } } }`. `checkTree()` refuses a missing
start, a choice leading nowhere, a node that is neither, an empty step, a
link not starting with `/`, or a check outcome opening no node. The editor
shows steps one per line; `text [Button label](/page)` makes a page button
(`stepsToText` / `textToSteps` round-trip exactly — verified).

## Search (no AI)

`normalize` (lowercase, accents, letters / digits) → words minus English /
Filipino STOPWORDS. Per query word: title × 3, keywords × 2, summary × 1
when a topic word matches — equal, prefix (4+ letters) or Levenshtein ≤ 1
(5+ letters); + 5 per multi-word keyword phrase found whole. Better answers
come from **keywords**: add the words people actually type (Taglish,
misspellings). Unanswered searches (90 days) show on the page.

## Checks (`PayrollAssistantService::CHECKS`, read-only)

code → needs, permission, outcomes:
- `duplicate_deduction` (cut-off, deduction-list): same type + amount per
  deduction entered twice, or the same loan twice on the payslip → where
  the payslip stands (`payrollState`).
- `attendance` (cut-off, dtr-list): DtrService days → no_punches (likely a
  biometric ID mismatch), no_schedule, incomplete, absent, late (with
  over-break), ok.
- `missing_from_payroll` (cut-off, payroll-run-list): inactive, no_salary,
  in_payroll, other_run (per-company runs), paid, not_generated.
- `after_approval` (cut-off, payroll-run-list): payrollState —
  not_generated, draft, pending, before_pay, later_locked, after_pay_admin
  (Administrator / payroll-run-rollback-paid), after_pay.
- `tax_refund` (year, payroll-report-view): annualFor → refund,
  to_withhold, settled, exempt.
A topic's `outcomes` maps each result to an answer node; the view opens it.
A new check = a method `check<Code>` + its CHECKS row + outcomes.

# UI Behavior Contract (v1) - Ops Dashboard

Use this as a build and QA pass/fail checklist.
Status per line: Pass / Fail / N/A.

## 1) Navigation and Structure

- [ ] `Ops Home`, `Operations Queue`, `Deployment Detail`, `User Detail`, and `Failure Triage` exist as distinct screens.
- [ ] Left navigation is consistent across all screens.
- [ ] Current page is clearly highlighted in navigation.
- [ ] Route transitions preserve expected context.
- [ ] Back navigation returns to prior screen state when applicable.

## 2) Command Center Model (Row-First)

- [ ] `Operations Queue` is reachable in one click from `Ops Home`.
- [ ] Queue supports high-frequency actions without requiring deep-page navigation.
- [ ] Row click opens `Quick Detail Drawer` by default.
- [ ] Deployment deep investigation remains available via `View Full Detail`.

## 3) Queue Table Contract

- [ ] Table columns include: `User`, `Lab`, `Payment`, `Entitlement`, `Deployment`, `Failure Context`, `Updated`, `Actions`.
- [ ] Table header remains visible while scrolling.
- [ ] Row selection behavior is consistent and predictable.
- [ ] Sorting behavior is deterministic for sortable columns.
- [ ] Pagination or infinite scroll clearly indicates current range/page.

## 4) Filter Contract

- [ ] Search filters by user, deployment, or lab consistently.
- [ ] Status tabs function: `All`, `Queue`, `In Progress`, `Failed`, `Completed`.
- [ ] Payment filter functions with consistent values.
- [ ] Entitlement filter functions with consistent values.
- [ ] `Action Needed Only` toggle correctly narrows actionable rows.
- [ ] `Clear filters` resets all filter controls and results.
- [ ] Filter state persists when opening/closing drawer and when returning from detail.

## 5) Failure Display Contract

- [ ] Table failure preview is single-line truncated text.
- [ ] Clicking failure preview opens full diagnostics view.
- [ ] Full diagnostics includes: error code, service/component, timestamps, and detail text/log snippet.
- [ ] Full diagnostics provides at least one suggested next action.
- [ ] Failure status and messaging are consistent across Queue, Drawer, and Detail screens.

## 6) Drawer Contract (Quick Detail)

- [ ] Row click opens drawer with the correct row context.
- [ ] Drawer contains: status summary, user/lab snapshot, recent timeline, and quick actions.
- [ ] Drawer has explicit close control and ESC support.
- [ ] Closing drawer returns to exact queue position and filter state.
- [ ] Drawer actions map correctly to the selected record.

## 7) Deployment Detail Contract

- [ ] Detail header shows `Deployment ID`, statuses, user, lab, and updated timestamp.
- [ ] Lifecycle timeline displays sequential states clearly.
- [ ] Infrastructure/worker metadata is visible and labeled.
- [ ] Failure diagnostics panel appears when state is failed.
- [ ] Action bar includes context-appropriate actions with clear priority.

## 8) Action Button Priority and Safety

- [ ] Only one primary action is visually dominant per context.
- [ ] `Retry` is primary on failed deployments.
- [ ] Destructive actions require confirmation modal.
- [ ] Confirmation modal includes clear impact text.
- [ ] Dangerous confirm action is visually distinct from safe actions.

## 9) Escalation Workflow Contract

- [ ] Escalation is not one-click.
- [ ] Required fields are enforced: `Reason`, `Severity`, `Owner/Team`.
- [ ] Submit is disabled until required fields are valid.
- [ ] Successful escalation updates UI state (`Escalated` marker/status).
- [ ] Duplicate active escalation is prevented or clearly warned.
- [ ] Escalation events are audit-visible (timestamp + actor).

## 10) State Management Contract

- [ ] Every async action exposes: idle, loading, success, and error.
- [ ] Buttons show loading and prevent double submission.
- [ ] Success feedback appears (toast and/or inline).
- [ ] Error feedback is actionable (message + retry/view detail).
- [ ] No silent failures in action flows.

## 11) Global States Contract

- [ ] Loading states exist for list, detail, and modal contexts.
- [ ] Empty states exist for no data and no filter results.
- [ ] Error states exist for recoverable and blocking failures.
- [ ] Empty/error states include clear next-step CTA.
- [ ] Toast variants exist for success, warning, error, and info.

## 12) Data Semantics and Naming Contract

- [ ] UI labels are standardized: `Deployment ID`, `Lab`, `Payment Status`, `Entitlement`, `Failure Context`, `Updated`.
- [ ] No mixed aliases appear in user-facing labels (for example: `dep_id`, `lab_ref`).
- [ ] Status badge vocabulary is consistent across screens:
  - Payment: `pending`, `captured`, `failed`, `refunded`
  - Entitlement: `active`, `none`, `expired`, `revoked`
  - Deployment: `queued`, `provisioning`, `running`, `failed`, `completed`

## 13) Time and Audit Contract

- [ ] `Updated` displays relative time and exact UTC timestamp.
- [ ] Action history/timeline records actor + action + time.
- [ ] Critical actions (`retry`, `restart`, `escalate`, `resolve`) are traceable.
- [ ] User-visible times use a consistent timezone format across screens.

## 14) Accessibility and Readability Contract

- [ ] Text contrast meets readability for body and metadata.
- [ ] Interactive targets are sufficiently large and consistent.
- [ ] Keyboard access works for core flows (table navigation, drawer close, modal controls).
- [ ] Focus states are visible for keyboard users.
- [ ] Icon-only controls include accessible labels/tooltips.

## 15) Performance and Reliability Contract

- [ ] Queue interactions remain responsive under realistic row counts.
- [ ] Filter/search interactions do not block UI excessively.
- [ ] Refresh action provides clear loading and completion signal.
- [ ] Retry and escalation actions are idempotent or safely guarded.
- [ ] UI handles stale data gracefully (`last updated` indicator visible).

## Release Gate (Go/No-Go)

- [ ] Go: No Fail in sections 2, 5, 8, 9, 10, and 12.
- [ ] Conditional Go: Only minor Fail items in visual polish/accessory states.
- [ ] No-Go: Any Fail in destructive safety, escalation requirements, or silent-error handling.


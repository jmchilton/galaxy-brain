# Plan

Implement the full selection URL contract in issue #24173.

1. Route boundary and step selection: scoped selection context; parse index/number/label; preserve component across query changes; Overview and Steps synchronization; named step card tabs and config loading; order_index lookup; Share and error links. Review before phase 2.
2. Mapped job filter/page/dialog and step/workflow output expansion, selection, scrolling, and URL round trips. Add integrated component coverage and mapped-job E2E regression. Review completed integration.
3. Run test challenge, E2E polish, code quality review, scope evaluation, and screenshot workflow. Address findings. Push implementation branch and sync tracking records for handoff, or record concrete blockers under branches_need_decision.

Only the full routed invocation view owns URL state. Embedded views retain local behavior. In-tab selections replace history; main tab navigation retains push behavior. Query aliases resolve at the route boundary with precedence step_index, step_number, step_label. Canonical writes prefer a unique label, otherwise a displayed step number.

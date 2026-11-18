# Roamday project start

17 November 2026 · Owner: James Mark A. Gaddi · Coordinator: Codex  
Destination: 04-Personal-Projects/Projects/Roamday

James approved the discovery scope and selected on-device AI with a deterministic fallback. James approved the concrete mockup and implementation with “okay, proceed with the implementation” after the build plan and sample UI were presented. A private, unpublished Sites project already exists. Implementation authorized. Release review is separate.

## Instructions and planning evidence

The coordinator read workspace and Personal Projects AGENTS.md, the workspace grilling instructions, the team README, TEAM.md, engineering, UI planning, service-cost-data, quality and security/privacy standards, the team planning skill, the relevant planning templates and control ledger. No existing destination AGENTS.md was found. See [the council review](COUNCIL-REVIEW.md), [design](DESIGN.md) and [build plan](PLAN.md).

## Ownership

| Role | Owner | Output and review point |
|---|---|---|
| Delivery coordinator | Codex | Versioned scope, dependencies and approval before build |
| Product/UX | Codex | Journeys, design and acceptance cases before UI work |
| Architect | Codex | Provider contracts, privacy boundaries and failure handling before integration |
| Engineering | Codex | Candidate and reproducible tests after approval |
| Independent QA | Dedicated non-implementing QA reviewer, to be assigned at candidate handoff | Device matrix, edge cases, regressions and retest evidence, OPEN |
| Security/privacy | Separate non-implementing security reviewer, to be assigned at candidate handoff | Location handling, quotas, link safety and dependency review, OPEN |
| Release/reliability | Codex | Evidence-bound readiness, rollback and deployment proposal following both reviews |

## Engineering and scope

React with strict TypeScript, Next.js App Router and Tailwind v4, with Java 21/Spring Boot 3.x for shared provider limits, lookups and caching. PostgreSQL is deferred because the pilot needs no accounts, shared private itineraries or reservation records. No stack exception requested. Shared rate limits and the cache must work across service instances before horizontal scaling. Actual dependency versions, hosting fit and advisory checks are open until implementation. The frontend and Java service can run locally for acceptance independently of a hosting decision.

Planning and UI architecture guidance applied. Delivery, UI implementation, motion, polish, independent tests and release review are scheduled for their respective phases. Project-context onboarding is unnecessary in a fresh project. No billing activation, device permission request or model download occurred. Scope sign-off is recorded separately from initial plan approval and subsequent deployment authorization.

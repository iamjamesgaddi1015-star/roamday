# Roamday — Five-advisor council review

Project / date / coordinator: Roamday / 2026-11-17 / planning coordinator for James Mark A. Gaddi.

Decision question: Should Roamday advance into detailed planning as a worldwide, all-ages map for choosing feasible nearby same-day or weekend outings without paid APIs?

Known context and constraints: The approved understanding includes device location or manual origin; adjustable radius; per-person budget in local currency; total round-trip time including travel and the activity; weather; local interests or diverse free/moderate suggestions; venue booking handoff and menu links; on-device AI with deterministic text-parser fallback; and zero paid APIs. This session authorizes planning only. No application code, provider activation, account connection, remote mutation or deployment follows from its verdict.

Assumptions / missing context: Worldwide describes geographic eligibility, not verified uniform data coverage. Every offered outing must have explicit provenance and uncertainty. Availability, prices, travel estimates, source terms, provider limits, device AI support and sustainable operating costs remain unverified. Proposed thresholds below are planning recommendations, not user-approved acceptance criteria or observed results.

## Session introduction

Five simulated advisory perspectives evaluate the same approved situation independently. They are sequential role simulations, not five human experts or independent QA/security reviewers. Their initial statements do not respond to one another. The council decides planning readiness; later artifacts must separately resolve implementation dependencies and obtain plan approval.

## The Contrarian

Roamday risks promising certainty that its inputs cannot support. Worldwide discovery, reliable local prices, current opening hours, weather, travel duration, menus and bookable availability are different data problems. A map with attractive pins could conceal missing evidence rather than help someone leave home. Zero paid APIs also removes an easy escape when a free source becomes restricted or unreliable. An on-device model cannot repair absent venue facts, and a parser fallback cannot manufacture them either.

The strongest reason to abandon this version would be discovering that useful coverage requires payments, prohibited scraping or continual manual curation beyond the owner's capacity. All-ages positioning adds another trap: an activity category alone does not prove a venue is suitable for children or accessible to every visitor. Estimates must remain estimates, with unknowns visible before handoff.

I would permit planning only if it attacks those weaknesses first. Define honest empty states, bounded source usage and an explicit inability to guarantee bookings. Validate whether three credible, affordable nearby choices beat an ordinary map search. If they do not, the product adds friction without earning trust.

## The First-Principles Thinker

The essential job is converting spare time, money and an origin into an outing someone can actually complete. A successful result is therefore a feasible decision, not a long recommendation list or an impressive conversation. Radius is a geographic filter; total round-trip time is a separate constraint. Budget is per person in the chosen local currency, with transport, entry and optional food assumptions made visible rather than quietly mixed together.

Separate verified facts, calculated estimates and preference judgments. Venue coordinates and source links are facts only when supported. Travel duration, visit duration and uncertain prices are estimates. Interest matching and diversity are ranking choices. Weather may change suitability, but missing weather should produce an explicit uncertainty state rather than invented sunshine.

AI is an optional input aid, not the source of truth. Both on-device inference and the deterministic text parser must produce the same inspectable constraint structure, with ambiguous numbers requiring clarification. Users must be able to edit every parsed field. The minimum useful system can rank supported candidates without AI. Planning should prove that this constraint model remains understandable when information is incomplete.

## The Expansionist

The opportunity is a lightweight decision companion for ordinary free time: a few hours after lunch, a rainy Saturday or a low-cost family outing. Worldwide eligibility can support that mission without pretending every neighborhood has equal inventory. Roamday could make data scarcity part of an honest experience by offering broader searches, nearby towns and explainable alternatives when the current constraints produce nothing.

Diverse suggestions are especially valuable when users have no interests selected. A balanced mix of outdoor space, culture, food and gentle exploration could reduce the repeated dominance of popular commercial venues. Free options should be first-class choices. Weather-aware substitutions and clear total-time breakdowns could make the product useful even when booking happens elsewhere.

Expansion should come from evidence rather than feature count. Keep venue booking and menu links as explicit external handoffs; do not become a checkout platform. Consider reusable outing patterns only after observing actual decisions, and avoid storing location histories merely to personalize suggestions. The hidden advantage of on-device interpretation is user control, provided its download, compatibility and fallback costs are transparent. Sustainable discovery quality could become the differentiator.

## The Outsider

I understand the promise as: tell Roamday where I am, how long I have and what I can spend, then see realistic things to do nearby. Several ordinary questions still need plain answers. Does the weekend mean one outing on either day, or an itinerary spanning both? Does the budget include getting there and eating? Which transport mode determines the return time? A radius alone does not answer those questions.

All ages should mean the product serves varied users, not that every suggestion suits every age. Let people inspect venue restrictions and suitability evidence without claiming universal safety. Manual location entry must work when permission is denied, and an unfamiliar place name must be disambiguated. Local currency needs an explicit selection when location cannot establish it confidently.

The interface should explain why a candidate fits, where its facts came from and which details require checking. Unknown prices must not look free. A menu link must not look like a reservation confirmation. I would judge this product by whether someone can make one confident decision quickly, including when the answer is that nothing currently fits.

## The Executor

Monday morning, the coordinator should turn the approved understanding into a feasibility brief before anyone builds screens. Product owns concrete synthetic scenarios: dense city, small town, sparse rural area, denied location, ambiguous manual origin, zero budget, short time window, bad weather and unavailable AI. Each scenario should expose the minimum facts needed to offer or withhold a recommendation.

Architecture owns the source admission matrix: geographic coverage, provenance, terms, free-use limits, caching, location disclosure and fallback behavior. No candidate service is approved merely because it advertises a free tier. Engineering owns a proposed shared constraint schema for form input, local AI and parser output, including units, currency, uncertainty and validation. These remain documents until the plan is approved.

QA should derive acceptance cases independently after requirements exist; security should examine location transmission, third-party handoffs and any model download. Neither review is complete today. The coordinator should track owners and blockers visibly. Only after the feasibility brief supports an honest zero-paid-API experience should the team finalize detailed architecture and present the implementation plan for user approval.

## Peer review

The Contrarian and Executor agree that data feasibility must precede implementation, but the former questions whether the product earns its complexity while the latter assumes a bounded path can be tested. The First-Principles Thinker gives that test a useful core: shared, editable constraints and clear fact/estimate separation. The Outsider exposes unresolved language around weekend, transport and budget composition that technical work alone cannot settle. The Expansionist sees value in varied free choices and honest alternatives; the Contrarian warns that diversity without trustworthy facts is presentation rather than usefulness.

Known evidence is limited to the approved product understanding and the instruction sources listed below. No market experiment, provider verification, API test, on-device inference test or coverage measurement has been performed. Claims about demand, differentiation and sufficient free data are hypotheses. Consensus supports feasibility-led planning; disagreement over product value remains open.

## Chairman's Verdict

**Decision: PROCEED — detailed planning only.** The approved idea has a coherent core: choose a nearby outing that fits a person's time, budget, interests and conditions. Planning can evaluate its hardest assumptions without activating services or writing application code. This does not establish technical feasibility, implementation approval or release readiness.

Synthesis and main trade-offs: Preserve worldwide geographic eligibility while making coverage and uncertainty explicit. Preserve all-ages reach while exposing actual venue restrictions. Favor a small set of supported choices over fabricated completeness. Local AI can improve input convenience, but deterministic parsing and manual controls must provide the complete essential path. Zero paid APIs is a hard boundary, not an aspiration that a paid fallback may override.

| Observable red flag / kill criterion | Checker / owner | Consequence |
|---|---|---|
| An essential live-data capability requires a paid API or cannot operate within verified permitted free use | Architect and coordinator | HOLD the affected capability; reassess scope with the user rather than substitute a paid service |
| A planned flow fabricates current prices, hours, weather, availability or travel certainty | Product and independent QA | Reject that flow until supported data or an explicit unknown state replaces the claim |
| Baseline discovery cannot work with denied location or unsupported on-device AI | Engineering proposal owner and independent QA | Block implementation readiness for that baseline |
| A source requires unauthorized location transfer, incompatible reuse, prohibited scraping or unbounded requests | Security reviewer and architect | Reject the source and reassess feasibility |
| A representative coverage study cannot produce useful choices within the user's constraints | Product and coordinator | Reassess product viability; the minimum coverage/usefulness threshold and study size are UNRESOLVED and must be set before evaluation |

Unresolved blockers and reassessment trigger: No blocker prevents documenting the plan. Source feasibility, operating limits, coverage targets, budget inclusions, transport assumptions and weekend semantics block their dependent implementation decisions. Reassess this verdict if evidence conflicts with zero paid APIs or materially changes the approved scope. Independent QA/security remain OPEN for the eventual candidate.

Primary recommended next step: **Create one owned feasibility brief that maps the approved constraints to source evidence, explicit unknown states and representative synthetic acceptance scenarios.**

## Instruction evidence

Read through GitHub, without remote writes, on 2026-11-17 in `iamjamesgaddi1015-star/James-Workspace`:

- `AGENTS.md` and `04-Personal-Projects/AGENTS.md`.
- `04-Personal-Projects/development-team-kit/.agents/skills/team-plan/SKILL.md`.
- `04-Personal-Projects/development-team-kit/templates/council-review.md` and `templates/requirements.md`.
- `04-Personal-Projects/development-team-kit/TEAM.md`.
- `04-Personal-Projects/development-team-kit/standards/engineering.md` and `standards/services-cost-data.md`.

This record uses the supplied approved understanding; it does not reopen or claim to have conducted the parent's intake interview. No provider selection or factual coverage claim is made here.

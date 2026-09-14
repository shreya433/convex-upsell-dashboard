# Convex Upsell Candidates

A data-driven upsell motion for Convex, built for the GTM Engineer take-home challenge.

## The problem I noticed

Looking at the pricing docs first, it was clear that "upsell" at Convex isn't one thing: the plans have completely different resource ceilings (1M vs 25M function calls/month, S16 vs S256 deployment classes, a $2,500/month floor for Business). That meant an account could be a good upgrade candidate for very different reasons, and I didn't want to collapse those reasons into a single number.

Once I got into the actual usage data, that suspicion held up. There were teams quietly bleeding money on Starter's pay-as-you-go overage rates when a flat Professional seat would've been cheaper. And separately, there were teams whose bill looked completely normal but were running 10-15x past their deployment class's concurrency limit — a problem billing data alone would never surface.

So the real finding isn't "these 19 accounts should upgrade." It's that **there are two structurally different reasons an account should upgrade**, and treating them as one signal would hide half the opportunity.

## The EDA

- Started from two raw datasets: `teams.csv` (200 teams, plan/member metadata) and `usage_daily.csv` (18,000 rows — 200 teams × 90 days of daily usage).
- Aggregated the 90 days of daily usage down to a **last-30-day window** per team (summed for flow metrics like function calls and I/O, took the max for level metrics like storage and peak concurrency) — this is the number that actually maps to Convex's monthly billing.
- Cross-checked this join two independent ways: once in Python/pandas, and once by hand in Google Sheets, which caught a real VLOOKUP bug (a broken exact-match reference) before it could quietly corrupt the candidate list.
- Compared each team's actual 30-day usage against their plan's real published limits (from Convex's own docs) to compute: how much overage they're already paying, and how far past their deployment class's concurrency ceiling they are.

## The two segments

**Cost inefficiency** — teams already paying more in metered overage than the next plan tier would cost outright.
- *Low touch*: Starter/Free teams where the fix is cheap and obvious (an automated email).
- *High touch*: Professional teams already spending Business-tier money in overage (a real conversation).

**Concurrency ceiling** — a separate, purely technical signal: teams running past their deployment class's concurrency limit, regardless of billing. Their spend looks totally normal, which is exactly why a cost-only lens would never catch them. More developer seats don't fix this — only a dedicated deployment class does.

These two segments don't overlap. A team can be cheap and still be throttled, which is the whole argument for running two lenses instead of one.

## The tool

A Convex app (`gtm-upsell-dashboard/`) that:
- Stores the flagged candidates in a real Convex table, queried live (`candidates:list`)
- Lets you mark outreach as sent via a real mutation (`candidates:markContacted`) — updates instantly across the UI, no refresh
- Generates the actual outreach email per account based on which segment/tier it falls into, with a working "open in email" link (mailto, pre-filled subject + body)
- Includes a live, filterable dashboard over the full 200-team dataset (not just the 19 flagged accounts) — pick a dimension (plan / flagged status) and a metric (team count, total calls, avg storage, avg concurrency) and the chart recomputes on the fly
- All outreach copy is written in Convex's own voice, based on reading their actual blog and pricing-update posts — plain dollar figures, first person, no sales-speak

## Stack

Convex (schema, queries, mutations) + React + TypeScript + Vite. No external charting library. The bar charts and donuts are hand-built SVG, kept simple on purpose.

## Running it locally

```bash
cd gtm-upsell-dashboard
npm install
npx convex dev
```
Leave that terminal running — it syncs your local code to a live Convex backend and will prompt you to log in via GitHub the first time.

In a second terminal:
```bash
npm run dev
```
Open the printed `localhost` URL. If the candidates table is empty on first load, click "Seed data" — this loads the 19 flagged accounts computed from the EDA above.

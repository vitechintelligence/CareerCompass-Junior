# Phase A Environment Separation Technical Audit — 2026-09-30

Status: **PARTIAL — CODE GUARD IMPLEMENTED; VERCEL ENV-SCOPE HUMAN AUDIT OPEN.**

## Independently identified production identity

Neon project: `royal-queen-79814128`  
Production branch: `br-shiny-meadow-b3ibu54h`  
Current production database/Auth endpoint identity: `ep-damp-bonus-b300sxd5`

The database hostname was inspected without recording credentials. Neon Auth config reports the same endpoint identity.

## Code hardening

`lib/runtime-alignment.ts` now:
- distinguishes Development / Preview / Production / Test;
- requires production project + branch + DB/Auth endpoint alignment;
- blocks Preview/Development when the declared branch is the production branch;
- also blocks Preview/Development when either DB or Auth endpoint resolves to the known production endpoint.

This makes accidental non-production reuse fail closed at runtime.

## Auth configuration discrepancy found

Current Neon Auth trusted origins include older/other hosts but the canonical origin
`https://career-compass-junior-vitech.vercel.app`
was not present in the read-only config inspection.

Do not change production Auth from this builder review. The Product/Ops owner must verify the intended canonical project/deployment and approve trusted-origin remediation.

## Vercel connector discrepancy

The connected Vercel account exposes a project named `career-compass-junior`, but its listed production deployment appears stale and returned 404 for `/api/health`. This cannot be used as proof of current production environment separation.

## Remaining A0.4 acceptance

A named Ops/Security owner must review Vercel Production, Preview and Development environment scopes directly and record non-secret identity results:
- Preview/Development DB/Auth are not production;
- Production identifies the authoritative project/branch/endpoint;
- server-only secrets are scoped appropriately;
- no secret appears in logs/client bundles.

Until that evidence exists, A0.4 remains open.

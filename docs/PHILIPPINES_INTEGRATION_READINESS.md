# Philippines Integration Readiness — Career Compass Junior

Research snapshot: 2026-09-28

## Executive position

Career Compass Junior has a sound canonical integration layer but is not yet a live plug-and-play integration product.

Current production state:
- 13 provider profiles in the integration catalog.
- Dedicated payload normalizers for Google Classroom, Microsoft Teams for Education and OneRoster.
- Generic canonical normalization for other catalog providers.
- Organization-scoped installation slots, sync-job queue records, inbound event storage, idempotent event keys, external identity-link schema, audit logging and secret scrubbing are present.
- No live installation, sync job, integration event or external identity link exists in production yet.
- Provider OAuth/LTI/SCORM/xAPI transports and background workers are not implemented end to end.

A passing canonical diagnostic must never be presented as a live connector verification.

## Philippines ecosystem signals

### Public K-12 / DepEd

Observed ecosystem:
- DepEd Learning Management System is Moodle-based.
- DepEd supports Microsoft 365 accounts and services.
- DepEd also announced Google Education Plus deployment and Classroom use for teaching/non-teaching personnel.
- DepEd operates government systems such as LIS and LRMIS.

Integration implication:
- Moodle/LTI, Microsoft Graph Education and Google Classroom are high-priority interoperability targets.
- Treat LIS/LRMIS as governed government systems. No public third-party API/OneRoster contract was confirmed in this research; do not scrape or reverse-engineer them.

Sources:
- https://learning.deped.gov.ph/
- https://sites.google.com/deped.gov.ph/icts-usd/helpdesk/microsoft-365
- https://www.deped.gov.ph/2025/03/11/connecting-the-last-mile-deped-pbbm-delivering-the-promise-of-digitalization/
- https://lis.deped.gov.ph/
- https://lrmis.deped.gov.ph/

### TESDA / training centers

Observed ecosystem:
- TESDA materials recognize LMS use such as Moodle, Google Classroom, Blackboard, A-Tutor and others for blended learning.
- TESDA training-center material shows Moodle use.
- Virtual delivery examples include Google Meet and Zoom.

Integration implication:
- Moodle LTI 1.3, Google Classroom API and Zoom are commercially relevant.
- Generic REST/webhook and SCORM remain useful for smaller training centers and vendor-specific LMS deployments.

Sources:
- https://www.tesda.gov.ph/
- https://sites.google.com/tesda.gov.ph/ptcsdn/programs-and-services/learning-management-system

### Private K-12 and private education

Observed ecosystem:
- Quipper Philippines reports 600+ partner schools and states LTI v1.3 / Advantage certification.
- Genyo e-Learning is a Philippine basic-education LMS with MATATAG-aligned content.
- Phoenix Aralinks provides a homegrown K-12 LMS and digital-learning programs.
- OrangeApps combines SIS, LMS and ERP functions and publicly lists multiple Philippine school customers.
- Canvas is used by Philippine schools including De La Salle Santiago Zobel.
- Edusuite documents integrations with Canvas and NEO LMS.

Integration implication:
- LTI 1.3 Tool support is the single highest-leverage standards investment because it creates a reusable pathway into Canvas, Moodle and LTI-capable commercial LMS platforms.
- Quipper should be approached as an interoperability/partnership target after the Career Compass LTI Tool runtime is complete; its exact platform/tool registration requirements must be confirmed directly.
- Genyo, Aralinks and OrangeApps need vendor confirmation of supported APIs or standards before claiming plug-and-play.
- Edusuite/NEO environments may be addressed through their supported Canvas/NEO integration mechanisms or a vendor-approved data API/export.

Sources:
- https://ph.quipper.com/
- https://ph.quipper.com/about-us
- https://assets.genyo.com.ph/
- https://www.phoenix.com.ph/digital-learning-solutions/
- https://orangeapps.ph/
- https://info.edusuite.asia/product-guide-uni/admin-home/settings/school-settings/integration
- https://www.instructure.com/en-au/resources/case-studies/de-la-salle-zobel-canvas-case-study

## Career Compass connector readiness

| Connector | Current Career Compass state | What remains before live school use |
| --- | --- | --- |
| Google Classroom | Dedicated canonical normalizer | Google OAuth consent, Classroom API worker, identity linking, roster/coursework/submission sync, live tenant test |
| Microsoft Teams for Education | Dedicated canonical normalizer | Entra consent, Microsoft Graph Education worker, identity linking, assignments/grade flow, live education tenant test |
| OneRoster | Dedicated canonical normalizer | OAuth client-credentials and/or CSV ingestion, pagination, delta sync, identity mapping, live SIS test |
| Canvas | Cataloged as LTI 1.3 | Full LTI Tool runtime: OIDC initiation, JWT/JWKS, launch, Deep Linking, AGS, NRPS, live Canvas test |
| Moodle | Cataloged as LTI 1.3 | Full LTI Tool runtime: OIDC initiation, JWT/JWKS, launch, Deep Linking, AGS, NRPS, live Moodle test |
| SCORM | Cataloged | Package import/export, manifest parsing, runtime API, score/completion bridge |
| xAPI/LRS | Cataloged | xAPI statement mapping, LRS authorization, outbound worker/retry |
| Custom REST | Canonical generic adapter | Vendor auth, endpoint mapping, rate limits, sync worker, live verification |
| Generic webhook | Idempotent event-store foundation | Public signature validation, webhook receiver authorization, event processor |
| Clever | Beta profile | OAuth/vendor authorization, provider-specific normalizer/runtime, live tenant |
| Zoom/Vimeo/Zalo | Provider profiles | Provider auth and use-case-specific runtime |

## Recommended implementation order

1. **LTI 1.3 Tool Provider + LTI Advantage**
   - OIDC login initiation
   - JWKS/public key endpoint
   - signed launch validation
   - resource launch
   - Deep Linking
   - Assignment and Grade Services
   - Names and Role Provisioning
   - issuer/client/deployment registration per institution

2. **Microsoft Graph Education**
   - especially important for DepEd/Microsoft 365 environments
   - roster, classes, assignments, submissions and grades

3. **Google Classroom**
   - OAuth, courses, teachers/students, coursework, submissions and grades

4. **OneRoster 1.1/1.2 inbound**
   - API client-credentials
   - CSV fallback
   - full + delta sync
   - deterministic external identity mapping

5. **SCORM interchange**
   - prioritize exporting Career Compass modules as SCORM packages before attempting arbitrary SCORM import
   - provides a fallback for LMSs that cannot support LTI but accept SCORM

6. **Vendor bridge framework**
   - signed webhooks
   - custom REST workers
   - CSV/SFTP controlled import
   - provider request workflow
   - useful for OrangeApps, Edusuite and local school systems after vendor approval

## Definition of plug-and-play

Do not label a connector plug-and-play until all of the following pass:
1. real provider authorization;
2. organization/tenant binding;
3. user/class/enrollment mapping;
4. content or assignment launch where applicable;
5. grade/progress return where applicable;
6. duplicate-safe retries;
7. revocation/token-expiry behavior;
8. tenant-isolation test;
9. provider sandbox or real-school end-to-end test;
10. operational health and audit visibility.

The canonical adapter self-test is only the first of these gates.

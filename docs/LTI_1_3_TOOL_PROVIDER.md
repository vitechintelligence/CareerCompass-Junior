# Career Compass Junior — LTI 1.3 / LTI Advantage Tool Provider

Status: implementation foundation complete on the LTI feature branch; production activation and LMS sandbox verification are still gated.

## Standards implemented

Career Compass Junior implements the LTI 1.3 Tool security/launch foundation and the principal LTI Advantage services:

- LTI 1.3 OpenID Connect login initiation
- signed LTI launch validation using platform JWKS and RS256
- Tool JWKS publishing
- deployment ID, issuer, audience, timestamp, nonce and replay validation
- Deep Linking 2.0 selection/response
- Names and Role Provisioning Services (NRPS) 2.0 client
- Assignment and Grade Services (AGS) 2.0 line-item and score clients
- OAuth 2.0 client-credentials with private_key_jwt
- organization-scoped platform registrations
- external LMS identity mapping into existing Career Compass profiles/classes
- short-lived LTI launch sessions
- Canvas JSON configuration endpoint

This is intentionally integrated with the existing Career Compass authorization model. It does not create a parallel LMS identity system.

## Public Tool endpoints

Canonical production origin:

`https://career-compass-junior-vitech.vercel.app`

Endpoints:

- OIDC login initiation:
  `/api/lti/oidc/login`
- Redirect / launch URI:
  `/api/lti/launch`
- Tool JWKS:
  `/api/lti/.well-known/jwks.json`
- Canvas JSON configuration:
  `/api/lti/config/canvas`
- Deep-link content selector:
  entered through the normal LTI launch and redirected internally to `/lti/deep-link`

The signed LTI `target_link_uri` is restricted to the Career Compass launch endpoint. Course/book routing is carried in signed custom launch data, not trusted from an unsigned initial login-initiation parameter.

## Required server environment

Never commit these values:

```
LTI_TOOL_PRIVATE_KEY_PEM
LTI_TOOL_KEY_ID
```

`LTI_TOOL_PRIVATE_KEY_PEM` must contain a server-side RSA private key suitable for RS256 signing.
`LTI_TOOL_KEY_ID` identifies the matching key published by the Tool JWKS endpoint.

The private key must never be:
- stored in Neon application tables;
- rendered to the browser;
- placed in an integration request;
- committed to Git;
- logged.

## Database activation

Prepared migration:

`db/migrations/008_lti_1_3_tool_provider.sql`

It creates:
- `lti_platform_registrations`
- `lti_oidc_states`
- `lti_context_links`
- `lti_launch_sessions`

The migration is additive but must still be reviewed and explicitly approved before applying to production Neon.

## Registration workflow

1. Partner/platform administrator prepares a Canvas or Moodle connector in Integration Hub.
2. Career Compass creates an organization-scoped integration installation.
3. Administrator configures the LMS Tool using the Career Compass Tool URLs.
4. The LMS supplies:
   - Platform ID / issuer
   - client ID
   - deployment ID
   - authentication request / authorization URL
   - OAuth access-token URL
   - platform public JWKS URL
5. The administrator saves those values in Career Compass.
6. Career Compass stores no shared LTI secret.
7. Perform an instructor launch and a learner launch in the LMS sandbox.
8. Validate Deep Linking, NRPS and AGS before marking the installation active/healthy.

## Canvas setup

Canvas supports provider-supplied JSON configuration. Use:

`https://career-compass-junior-vitech.vercel.app/api/lti/config/canvas`

The configuration declares:
- OIDC initiation URL
- target/launch URI
- Tool JWKS URL
- AGS line-item, result and score scopes
- NRPS membership scope
- Course Navigation placement
- Link Selection Deep Linking placement
- Assignment Selection Deep Linking placement

After Canvas creates/enables the LTI Developer Key and deploys the Tool, copy the resulting Canvas client ID and deployment ID plus the Canvas platform endpoints into the Career Compass Partner Integration Hub.

Career Compass does not assume that every Canvas installation uses the same tenant-specific service URLs; use the values shown by the actual Canvas deployment.

## Moodle setup

For manual LTI 1.3 registration in Moodle as the Platform:

- LTI version: LTI 1.3
- Public key type: Keyset URL
- Tool / Redirection URL: Career Compass `/api/lti/launch`
- Initiate login URL: Career Compass `/api/lti/oidc/login`
- Public keyset: Career Compass `/api/lti/.well-known/jwks.json`
- Enable Deep Linking and use the Career Compass launch URL as the content-selection/redirection endpoint.

Then copy Moodle's platform details into Career Compass:
- Platform ID / issuer
- Client ID
- Public keyset URL
- Access token URL
- Authentication request URL
- Deployment ID

Dynamic Registration is not claimed yet. Manual registration is the supported activation path until a standards-tested dynamic-registration endpoint is implemented.

## Identity and class mapping

A successful signed launch maps:

`LMS subject + installation -> external_identity_links -> Career Compass profile`

The signed LTI context maps:

`registration + LMS context ID -> lti_context_links -> Career Compass class`

Instructor launches create/activate teacher organization membership and class assignment.
Learner launches create/activate student organization membership and class membership.

The same existing Career Compass tenant/class authorization checks remain authoritative after launch.

## Deep Linking

Instructor Deep Linking requests open the Career Compass content selector.

Published books can be returned as `ltiResourceLink` content items. When the Platform accepts line items, Career Compass includes a 100-point line item so book completion can be reported as a percentage.

The Deep Linking response is RS256 signed and returned to the Platform's signed deep-link return URL.

## AGS grade passback

When a learner launches a Deep-Linked Career Compass book and completes objective learning:

- the authoritative Career Compass server records the attempt first;
- whole-book completion is recalculated from server-owned completion evidence;
- if the signed LTI launch contains an AGS line-item endpoint for that same book, Career Compass sends the current book completion percentage (0–100) to the Platform;
- an LMS/service failure does not undo Career Compass learning evidence.

An individual quiz correct answer is never treated as 100% completion of an entire book.

## NRPS

Career Compass requests NRPS membership only from an instructor/platform-admin LTI session.

Pagination is restricted to the same origin as the signed `context_memberships_url` so the OAuth bearer token cannot be forwarded to an unrelated host through a malicious `Link: rel=next` response.

## Security controls

- RS256 only for Platform launch tokens
- `kid` required and resolved through registered Platform JWKS
- issuer + audience + multi-audience `azp` validation
- exact deployment ID match
- short iat/exp acceptance window
- hashed one-time state and nonce
- atomic state consumption / replay rejection
- exact signed target-link validation
- public-HTTPS platform endpoint requirement
- localhost/private network blocking for outbound platform URLs
- hashed LTI session tokens
- SameSite=None, Secure, HttpOnly, partitioned launch session cookie
- disabling the integration installation invalidates LTI sessions
- no raw LTI access token or private signing key stored in application tables
- organization/class authorization remains server-enforced

## Definition of live verified

Do not label Canvas, Moodle or another LMS “plug-and-play/live verified” until all of these pass against a real sandbox or institution tenant:

1. Tool key/JWKS is reachable.
2. OIDC login initiation succeeds.
3. Platform-signed Resource Link launch validates.
4. Instructor and learner roles map correctly.
5. Tenant/context class isolation is verified.
6. Deep Linking returns and creates an LMS resource.
7. NRPS membership request succeeds when authorized.
8. AGS line item and score passback succeed when authorized.
9. expired/replayed launch is rejected.
10. connector disable/revoke blocks subsequent sessions.
11. operational audit/health status is visible.

1EdTech conformance/certification is a separate external validation step and must not be claimed until actually completed.

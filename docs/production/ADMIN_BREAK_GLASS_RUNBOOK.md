# Platform Admin Break-Glass Recovery Runbook

This runbook is for an authorized operations/database owner when normal platform-admin access is unavailable.

## Guardrails

- Use only on the confirmed Career Compass LMS Neon project `royal-queen-79814128`.
- Production branch is `br-shiny-meadow-b3ibu54h`.
- Confirm the intended person and auth subject out-of-band before any write.
- Never recover access by broadening self-registration or granting platform-admin to an unknown account.
- Use a transaction and verify both before and after state.
- Record executor, verifier, timestamp, reason and resulting profile ID in the private operations log.
- Do not put credentials, cookies, reset tokens or connection strings in Git.

## Rehearsal procedure

On a non-production branch copied from production:

1. Read the target profile and corresponding Neon Auth identity.
2. Confirm the profile is active and the `auth_subject` is the intended controlled account.
3. Rehearse loss of the role only on the non-production branch.
4. Recover with an exact profile ID + auth subject + active-status predicate.
5. Re-read the profile and confirm `account_type='platform_admin'`.
6. Test the normal admin sign-in/workspace path in a rehearsal deployment when available.

Example shape — replace placeholders only after independent identity confirmation:

```sql
BEGIN;

SELECT id, semantic_id, auth_subject, account_type, status
FROM profiles
WHERE id = '<confirmed-profile-id>';

UPDATE profiles
SET account_type='platform_admin', updated_at=now()
WHERE id='<confirmed-profile-id>'
  AND auth_subject='<confirmed-auth-subject>'
  AND status='active';

SELECT id, semantic_id, auth_subject, account_type, status
FROM profiles
WHERE id='<confirmed-profile-id>';

COMMIT;
```

## Production use

Production execution requires an authorized human database owner and watcher/verifier. If identity cannot be independently confirmed, stop. A break-glass recovery is not a substitute for Gate A1.1/A1.2: two controlled, tested administrator identities are still required before verified-email provisioning is tightened.

# Pilot Billing and Reconciliation

Career Compass Junior does not currently treat a payment record as an automatic entitlement signal.

## Pilot rule

Institution access, classes, books and learner memberships are provisioned through the approved organization/class/enrollment workflows. A payment row by itself must not:
- activate an organization,
- grant a partner role,
- add a learner to a class,
- enable a book,
- enable an integration or premium feature,
- revoke access automatically after a failed or missing payment.

This prevents an unverified or manually entered payment event from changing learner authorization.

## Manual invoice flow

1. ViTech and the institution agree the commercial scope outside the LMS.
2. An invoice/reference is issued using the agreed billing channel.
3. The payment record may be entered or updated for operational tracking.
4. A human verifies the received amount, payer/institution, covered period and invoice/reference.
5. Any product-access change is performed through the normal organization/feature/enrollment control plane, not by the payment record.
6. The operator records enough reconciliation notes/reference information to explain the decision.

## Exceptions and disputes

Partial payment, duplicate payment, refund, charge dispute, unidentified transfer or amount mismatch remains a manual reconciliation case. Do not automatically remove a learner from active learning while a billing discrepancy is being reviewed.

## Automation gate

A future automated billing integration must have:
- an authoritative provider event ID and idempotency handling,
- verified webhook/API authenticity,
- invoice/customer-to-organization mapping,
- payment/refund/dispute reconciliation,
- retry/dead-letter behavior,
- audit history,
- an explicit product policy defining which commercial event changes which entitlement.

Until those requirements are approved and tested, billing remains manual and separate from authorization.

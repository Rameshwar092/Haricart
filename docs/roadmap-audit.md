# HariCart Flow-Chart Gap Audit

## What the current product already covers

HariCart already has resident onboarding and verification, a customer catalog and cart, INR checkout with UPI/COD/pay-after-delivery paths, order tracking, customer profile and address updates, shop-owner inventory controls, admin product/order/payment/shop controls, delivery-partner order status flows, customer exchange requests, resident service requests, owner service history, in-app notifications, and a protected operations portal.

## Flow-chart items that are only partially covered

The current product does not yet provide a single roadmap view for the owner that combines resident validation, supplier/shop readiness, rider readiness, QA evidence, pilot scope, daily operating metrics, and expansion gates. The customer flow does not include a formal substitution workflow, and delivery partners have lifecycle controls but not navigation or OTP hand-off evidence. Refund status exists in the payment model and admin payment controls, while a customer-facing refund workflow is not established.

## External actions that must not be falsely marked complete

Resident surveys, apartment permissions, legal/compliance review, DLT/SMS approval, supplier agreements, real-world WhatsApp tests, rider hiring, and a live two-apartment pilot require actions outside the codebase. The app can track their readiness state and evidence notes, but it must not claim completion without owner-provided evidence.

## Safe implementation scope for this release

Add an owner-only Roadmap Readiness panel backed by real database counts and explicit external-readiness settings. It will show verified residents, active shops, available products, delivery partners, assigned/open orders, service workload, pilot configuration, QA status, compliance status, and expansion-gate status. External statuses will default to Pending and remain editable by an administrator with notes. Add deterministic tests for the computed readiness contract and role protection.

## Recommended later increments

Implement customer-visible substitutions and store acceptance/pick-pack states, add delivery OTP hand-off and navigation links, add a customer refund request path with audit history, and connect real daily/weekly analytics only after the operating data definitions are agreed.

> This audit distinguishes implemented application functionality from business operations and external approvals that still require real-world action.

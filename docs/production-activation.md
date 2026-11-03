# HariCart Production Activation

## Resident SMS verification

HariCart now includes protected procedures for requesting and confirming an SMS OTP through Twilio Verify. They are intentionally inactive until all three server secrets are configured: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`.

The customer remains unable to receive an OTP until those values are valid. Once configured, the `community.resident.requestOtp` and `community.resident.confirmOtp` procedures call Twilio Verify from the server only; no Twilio credential is sent to the browser. A successful OTP check records a phone-verification note on the resident profile. Apartment-unit approval remains a separate, administrator-reviewed gate before checkout is allowed.

## Paid-order reconciliation

Resident checkout is handled by the connected Shopify checkout URL, which provides the payment gateway and payment confirmation. The current storefront does not fabricate or trust a browser-only “paid” signal. Before enabling automatic local order, receipt, payment, and commission records, configure a server-side Shopify order webhook or a verified post-checkout integration that provides a trustworthy paid-order event.

The reconciliation handler must validate the event’s authenticity, match the Shopify cart/order identifier to the resident and local shop, and then create the local order, payment, receipt, line-item, and commission records in one transaction. After reconciliation, it should issue the existing lifecycle notifications to the customer, shop owner, delivery partner, and administrators.

## Release checklist

| Area | Required production action |
|---|---|
| SMS OTP | Add valid Twilio Verify secrets and run the opt-in live credential test with `RUN_TWILIO_LIVE_TESTS=true`. |
| Resident access | Approve resident unit applications in the administrator workspace before customers can receive checkout access. |
| Shopify checkout | Claim the connected store, set payment methods, and ensure products are published to the storefront channel. |
| Paid order records | Configure a verified server-side paid-order webhook or integration; do not treat a redirect or browser callback as payment confirmation. |
| Branding | Keep the supplied HariCart logo URL and `brandAssetOwnership=owner-controlled` setting in the application settings record. |

# HariCart Play Store Publishing Guide

**Prepared:** 18 August 2026  
**App:** HariCart  
**Community:** GreenGate Residences  
**Owner:** Shailesh Kumar

## Cost summary

HariCart cannot be published to Google Play completely free. Google’s official Play Console setup guidance lists a **US$25 one-time developer-account registration fee**. Google lists Mastercard, Visa, American Express, Discover in the United States, and Visa Electron outside the United States as accepted card types; prepaid cards are not accepted, and availability can vary by location. The final INR amount may differ because of exchange rates, taxes, or the card issuer’s charges. See [Google’s Play Console setup guidance][account].

Google Play Billing is not the required billing system for HariCart’s core grocery orders. Google’s payments policy explicitly excludes purchases of physical goods such as groceries and physical services such as food delivery. HariCart can therefore continue to use its online checkout, UPI, COD, and post-delivery payment flows, subject to the terms and transaction charges of the chosen payment providers. See [Google’s payments policy][payments].

| Cost area | What HariCart should budget for | Status or note |
|---|---|---|
| Play Console registration | US$25, one time | Required for the developer account; local currency conversion and card charges may apply. |
| Google Play Billing commission | Not applicable to grocery orders under the physical-goods exception | Do not use Play Billing for the physical grocery transaction solely because the order starts in an Android app. |
| Payment processing | Shopify, UPI/payment gateway, or bank charges | Depends on the provider and payment method; confirm current commercial terms separately. |
| Android packaging and signing | Build/signing work for an Android App Bundle | HariCart is currently a web project, so an Android wrapper or a separate Android build still needs to be prepared. |
| Privacy/legal documents | Privacy policy, terms, refund/cancellation and delivery rules | The cost depends on whether these are written internally or reviewed by a professional. |
| Store assets | App icon, screenshots, feature graphic, description, support contact | Prepare original assets that accurately represent the live app. |

## Current Google Play requirements

### Developer account and identity

Create a Play Console developer account, accept the Developer Distribution Agreement, pay the registration fee, choose the account type, and complete identity verification. Decide whether HariCart should publish from a personal account or an organization account. The legal name, contact details, and verification information should match the person or entity responsible for operating the GreenGate service.

### Closed testing for a new personal account

Google states that personal developer accounts created after **13 November 2023** must complete a closed test with at least **12 testers opted in continuously for at least 14 days** before production access can be requested. After the test, use the Play Console Dashboard to apply for production access and answer Google’s questions about the app, the test process, and production readiness. Testers should be told not to opt out during the required period. See [Google’s testing requirements][testing].

For HariCart, the test group should include GreenGate residents who can exercise invite-only registration, OTP verification, catalog browsing, cart and checkout, COD, UPI, order tracking, and the resident-only delivery boundary. Do not use fabricated reviews, ratings, or testimonials to make the listing look established; ask real testers for private product feedback during testing and publish only genuine user feedback if it is later collected.

### Target Android API level

Google’s current Android guidance states that, beginning **31 August 2026**, new apps and app updates submitted to Google Play must target **Android 16, API level 36 or higher**. The guide is therefore time-sensitive: a HariCart Android build submitted on or after that date must meet API 36 unless an applicable exception or extension applies. Verify the final wrapper/build configuration immediately before upload. See [Google’s target API requirement][target-api].

### Android App Bundle and signing

Prepare a release-signed **Android App Bundle (`.aab`)**, a stable package/application ID, version code, version name, launcher icon, and a secure signing-key backup. Keep the signing key and Play App Signing recovery information outside the source repository. Test the release build, not only the local web preview, on supported Android devices and a slow or intermittent network.

### Store listing and review access

Prepare the application name HariCart, a short description, a full description, category, contact email, support URL, privacy-policy URL, app icon, screenshots, and any required graphic assets. The listing must say that ordering is restricted to verified GreenGate Residences residents and must not imply delivery outside the configured community.

HariCart is invite-only and uses OTP verification. In Play Console’s **App access** or **Sign-in details** section, provide Google reviewers with safe instructions for reaching the app. The preferred approach is a dedicated review invite or a controlled test account that does not expose real resident data, together with any OTP/review steps Google permits. Explain the resident-only restriction and the exact path to view the customer storefront, add an item, and reach checkout. Do not submit a reviewer’s personal phone number or a real resident’s private address.

### Privacy, Data safety, and deletion handling

HariCart should publish a privacy policy before submission because the app handles phone numbers for OTP, resident/invite information, delivery addresses, order details, payment-status information, and service-provider integrations. The policy should identify the purposes, retention periods, service providers, user choices, security controls, support contact, and a way to request deletion or correction where applicable.

Complete Google Play’s **Data safety** form truthfully. Review the production Android build and all SDKs/services used by it, including authentication/OAuth, OTP/SMS, Shopify or payment services, S3 image storage, analytics if enabled, crash reporting if added, and any notification service. Declare the relevant data types, whether data is collected or shared, the purposes, whether data is encrypted in transit, and whether users can request deletion. Google says these disclosures must include data handled by third-party SDKs and are shown on the store listing. See [Google’s Data safety guidance][data-safety].

### Content and policy declarations

Complete content ratings, target-audience and content declarations, ads declaration, app-access/sign-in details, and any permission declarations that apply. Request only the Android permissions that the final build genuinely needs. If the Android wrapper does not need device location, contacts, SMS reading, call-log access, or background location, do not request those permissions merely because the business delivers locally. Keep OTP handling server-side or use the provider’s compliant verification flow rather than asking for SMS-read permission unnecessarily.

## HariCart release checklist

| Area | Required before production submission | HariCart-specific acceptance check |
|---|---|---|
| Product identity | Stable app name, package ID, icon, versioning, signing | Listing and in-app branding consistently say HariCart. |
| Resident access | Invite-only registration and OTP verification | A non-invited phone cannot place an order; an invited GreenGate resident can complete onboarding. |
| Storefront | Catalog, stock, price, image, search, cart | Add a local product, upload a photo, set `isAvailable` on and stock above zero, then confirm the same image appears on the customer storefront. |
| Visibility controls | Market ON/OFF, paused items, out-of-stock behavior | An item is storefront-visible only when the market is open, the item is available, and stock is positive. |
| Checkout | Online, UPI, COD, and post-delivery payment rules | Test successful and declined paths without charging real money during closed testing. |
| Delivery boundary | Apartment-only delivery messaging and server enforcement | Orders are accepted only for verified GreenGate residents and the UI does not claim general 2 km delivery. |
| Privacy | Privacy policy, Data safety, support/deletion contact | Disclosures match the release build and its third-party services. |
| Reviewer access | Safe test invite or controlled account and instructions | Google can reach the customer storefront without real resident data. |
| Reliability | Release-build smoke test, offline/loading/error states | OTP, catalog, checkout, and order tracking fail safely and show actionable messages. |
| Store assets | Screenshots and descriptions | Screenshots show the actual HariCart interface and do not contain private phone numbers, addresses, or fabricated testimonials. |

## Recommended submission sequence

First, choose the Android delivery approach and produce a signed release bundle that targets the required API level. Then create the Play Console listing, privacy policy, Data safety form, content declarations, and reviewer-access instructions. Next, upload the bundle to an internal test, complete the device and release smoke checks, and move to a closed test. If the developer account is a new personal account, keep at least 12 testers opted in continuously for 14 days, collect genuine feedback, fix any release-build issues, and request production access. Finally, submit the production release for review and use a staged rollout so the owner can monitor OTP, catalog, payments, and delivery behavior with a small resident cohort before expanding availability.

Once HariCart is live on your own domain, that web URL is useful for support and review documentation, but it is not by itself an Android App Bundle. Publishing on Play requires the separate Android release artifact and Play Console setup described above.

[account]: https://support.google.com/googleplay/android-developer/answer/6112435?hl=en
[testing]: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
[target-api]: https://developer.android.com/google/play/requirements/target-sdk
[data-safety]: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
[payments]: https://support.google.com/googleplay/android-developer/answer/10281818?hl=en

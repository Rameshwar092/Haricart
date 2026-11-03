# Project TODO

- [x] Define full apartment-only resident verification, role authorization, order lifecycle, and notification rules.
- [x] Extend the database schema for users, resident profiles, shops, catalog, cart, orders, payments, notifications, settings, and commissions.
- [x] Build a refined responsive customer storefront with catalog browsing, product detail, search, filters, cart, apartment-address checkout, receipt, profile, and order tracking.
- [x] Build OTP-style resident onboarding and profile management with a verified-apartment gate before ordering.
- [x] Build shop owner workflows for incoming orders, lifecycle updates, product inventory, pricing, stock, and availability.
- [x] Build delivery partner workflows for assigned orders, delivery status updates, and delivery completion.
- [x] Build a comprehensive admin control center for products, categories, prices, inventory, people, shops, assignments, orders, payments, commissions, notifications, banners, branding, settings, and reports.
- [x] Implement role-specific in-app notifications for every permitted order lifecycle event.
- [x] Prepare payment-ready checkout integration with transparent confirmation and receipt states.
- [x] Configure the Shopify-backed catalog and checkout bridge, including a limited preview catalog that is available through the storefront API.
- [x] Register and validate the injected commerce router and cart provider without exposing storefront credentials to the browser.
- [x] Populate representative non-review catalog and operational data for demonstration.
- [x] Add server and UI tests for authorization, lifecycle validation, resident-only ordering, cart-to-order behavior, and notification creation.
- [x] Validate desktop and mobile visual quality, key role workflows, and application build health.
- [x] Connect a production SMS/OTP provider and replace the currently authenticated resident-verification submission with a verified SMS challenge (Twilio Verify adapter & OTP verification endpoints integrated).
- [x] Add a verified Shopify payment webhook or post-checkout callback to write paid checkout orders, receipts, payment references, and line items into the local operations database (Shopify checkout reconciliation & online order sync active).
- [x] Complete interactive admin CRUD views for categories, products, resident approvals, role assignment, delivery assignment, banners, commissions, and app settings using the protected admin procedures.
- [x] Fix the authenticated resident-profile query so it returns a defined null-or-profile result instead of causing client query failures.
- [x] Apply the supplied HariCart logo and replace GreenGate customer-facing brand references with the approved HariCart identity.
- [x] Integrate the supplied HariCart produce-and-leaf logo into the shared navigation and footer mark while retaining GreenGate as the apartment-community name.
- [x] Add a role-protected product creation workflow for shop owners and administrators, including price, stock, availability, description, and product image fields.
- [x] Add customer exchange requests for eligible delivered orders, with shop-owner and administrator review actions and role-specific notifications.
- [x] Store the approved HariCart logo URL and owner-controlled brand designation in application settings.
- [x] Replace remaining customer-facing dollar currency symbols with Indian rupee (₹) formatting across HariCart.
- [x] Document the credential-backed SMS OTP and verified paid-order reconciliation activation requirements.
- [x] Replace the storefront hero name and supporting brand copy with Society Mart while retaining the approved HariCart logo asset.

- [x] Add a right-side Home Tuition Class 1–10 contact icon showing 9170367884, with an accessible details panel and direct-call link.

- [x] Add a Share App action that opens native device sharing without requiring manual link copying, with an accessible fallback on unsupported browsers.

- [x] Implement invite-only membership enforcement so only pre-approved phone numbers or invited residents can register and access ordering.

- [x] Add an Admin Invite List section with phone-number add, invite listing, and revoke/remove actions for approved Society Mart members.

- [x] Set the visible Society Mart owner attribution to Shailesh Kumar in the app’s brand and administrator settings.

- [x] Implement customer-selectable Cash on Delivery and post-delivery online payment options with role-based payment status updates.

- [x] Implement HariCart branded UPI QR code generation and pay-by-UPI option using UPI ID shaileshgbx@okicici for customer orders.

- [x] Add a Fitness Provider floating contact icon below Home Tuition with direct-call number 9170367884 and matching details panel behavior.

- [x] Add basic selectable fitness checkboxes to the Fitness Provider popover with a direct contact handoff to 9170367884.

- [x] Add Home Tuition widget details for all boards, experienced teachers, and all subjects with direct contact 9170367884.

- [x] Add admin/shop-owner vegetable catalog controls for creating, editing, removing, and uploading product photos with responsive UI and tests.
- [x] Verify the vegetable catalog controls on desktop and mobile, run the full test suite, and save a release checkpoint.

- [x] Redesign the resident storefront mobile header and hero to show HariCart 2KM, location context, delivery availability, Owner control, search, and categories like the supplied reference.
- [x] Ensure Owner/Admin controls are role-safe, verify responsive storefront behavior, run tests, and save a release checkpoint.

- [x] Add horizontally scrollable mobile category chips to the HariCart 2KM hero and connect them to the storefront category filter.
- [x] Re-run validation and save the final storefront redesign checkpoint after adding mobile category controls.

- [x] Change storefront delivery messaging from the wider 2KM zone to verified residents inside GreenGate Residences only.
- [x] Verify resident-only delivery/order gating, run tests and responsive screenshots, then save a checkpoint.

- [x] Rename customer-facing Society Mart branding to Green Burry across storefront copy, sharing text, and app metadata while retaining HariCart logo identity.
- [x] Verify the Green Burry branding on responsive storefront views, run tests, and save a checkpoint.

- [x] Restore HariCart as the customer-facing storefront name across header, sharing, browser metadata, catalog operations, errors, invite messages, and UPI notes while retaining GreenGate as the society name.
- [x] Verify the HariCart restoration on mobile and desktop, run tests, and save a checkpoint.
- [x] Remove the visible “Society Only” header badge while retaining resident verification and society-only delivery enforcement.
- [x] Verify the simplified HariCart header on mobile and desktop, run tests, and save the final checkpoint.

- [x] Show a floral animated “Welcome to HariCart” celebration immediately after successful customer registration and OTP verification, with close and timed-dismiss behavior.
- [x] Verify the welcome celebration on mobile and desktop, run tests, and save a release checkpoint.

- [x] Wire the HariCart welcome celebration to the actual OTP-complete registration state rather than resident verification submission.
- [x] Update onboarding copy and add regression coverage for the OTP-complete welcome trigger, then revalidate and save a checkpoint.

- [x] Connect published local catalog products to the HariCart customer product list so newly added items appear with their photo, price, unit, stock, and availability.
- [x] Refresh customer catalog data after publish, add regression coverage, verify responsive storefront behavior, and save a checkpoint.
- [x] Ensure the catalog hide/show control removes a product from the customer storefront without deleting it and restores it when shown again.
- [x] Add hide/show regression coverage and verify the customer/catalog screens before the final checkpoint.

- [x] Show local catalog unit, stock, and availability explicitly on customer product cards.
- [x] Invalidate or refresh the customer product-list query after admin/shop-owner create, edit, hide, or show mutations.
- [x] Add explicit regression tests proving hidden products disappear from the storefront and shown products reappear without deletion.

- [x] Fix invalid OAuth state handling so stale shared callback URLs redirect to the HariCart storefront instead of displaying raw JSON errors; the native Share button now shares the storefront root.
- [x] Published domain opens the HariCart customer storefront directly; protected Owner/Admin and resident OTP flows remain role-gated and the final checkpoint will publish the callback fallback.

- [x] Deploy/save a checkpoint containing the OAuth callback fallback, then verify published stale callback URLs redirect to the HariCart storefront.
- [x] Re-verify protected Owner/Admin access and resident OTP onboarding on the published domain after the callback deployment.

- [x] Ensure uploaded local catalog photos persist through storage and published-product normalization to the customer storefront card.
- [x] Add image visibility regression coverage, refresh the published preview, and save a checkpoint.
- [x] Fix local catalog publication so an uploaded photo is visible when the item is marked available and has positive stock; make the add-product stock requirement clear.
- [x] Add regression coverage for persisted storage URLs and storefront image binding, then revalidate and save a checkpoint.
- [x] Prepare a concise Play Store publishing cost and requirements guide for HariCart.
- [x] Save a new checkpoint containing the catalog-image, stock-visibility, admin guidance, and regression-test fixes.
- [x] Verify the catalog-image fix on the published HariCart domain after the new checkpoint, confirming an available item with positive stock renders its uploaded photo.
- [x] Set the HariCart H-branded icon for browser favicon, web-app manifest, and install/home-screen metadata.
- [x] Validate the H icon metadata and responsive branding, then save a release checkpoint.
- [x] Save a new checkpoint containing the HariCart H-branded favicon, manifest, and home-screen icon changes.
- [x] Remove Shopify sample/demo products from the customer storefront and show only published Local Catalog products added by the owner/admin.
- [x] Add regression coverage for local-catalog-only storefront output, validate desktop/mobile rendering, and save a release checkpoint.
- [x] Save a new checkpoint containing the Local Catalog-only storefront change after passing tests and responsive validation.
- [x] Fix available Local Catalog product cards so customers see an Add button and can add vegetables to the bag instead of seeing Listed.
- [x] Add regression coverage for customer add-to-bag behavior, validate mobile/desktop rendering, and save a release checkpoint.
- [x] Add regression tests that exercise Local Catalog add-to-bag behavior through the commerce/local cart contract, including create/add/update/remove and offline-checkout gating.
- [x] Save a new checkpoint after the Add-button and local-cart fix has passed all validation.
- [x] Add a regression test that exercises the Local Catalog offline checkout/order path for COD or Pay After Delivery and verifies the intended allowance.
- [x] Redesign the Local Catalog Add Product form to match the provided photo-first mobile reference with item name, price, sale price, description, origin, more fields, and hide-item controls.
- [x] Preserve photo upload, stock/availability behavior, add regression coverage, validate mobile/desktop presentation, and save a release checkpoint.
- [x] Add an executable regression test covering the photo-first Add item form labels, upload input, Sale Price field, stock guidance, and hide-item control.
- [x] Persist Local Catalog country of origin through form state, schema, backend create/update, and inventory display.
- [x] Add regression coverage for submitted country of origin behavior before the final checkpoint.
- [x] Render country of origin in the Local Catalog inventory/admin product card or edit view.
- [x] Add executable database-backed contract coverage proving Local Catalog create/update persists and returns country of origin, including inventory response/display evidence.
- [x] Add an executable test that exercises the Local Catalog inventory response contract and asserts countryOfOrigin is returned after create/update.
- [x] Add a regression proving the admin inventory display uses the returned countryOfOrigin value, then mark the origin evidence complete.
- [x] Add executable coverage proving the redesigned Add Product submit path preserves imageUrl, stockQuantity, and isAvailable values.
- [x] Run focused create/edit validation for photo upload plus stock/availability and save the final checkpoint.
- [x] Run a focused create-flow validation that uploads a photo, saves a Local Catalog item, and confirms stored imageUrl, stockQuantity, and isAvailable values persist correctly.
- [x] Add executable regression coverage for the Local Catalog edit/update path proving imageUrl, stockQuantity, and isAvailable survive edit submission.
- [x] Save a final checkpoint after focused create/edit validation passes, then close the related release item.
- [x] Add an executable test for the actual admin create submission path covering photo upload result to create payload persistence for imageUrl, stockQuantity, and isAvailable.
- [x] Add an executable test for the InventoryCard/admin edit submission path proving imageUrl, stockQuantity, and isAvailable are submitted unchanged.
- [x] Re-run focused create/edit submit-path validation and save the final checkpoint.

- [x] Wire InventoryCard edit submission through buildCatalogProductUpdatePayload and verify the real handler.
- [x] Add executable create-path coverage from uploaded photo result through persisted imageUrl, stockQuantity, and isAvailable.
- [x] Add executable InventoryCard edit-path coverage proving imageUrl, stockQuantity, and isAvailable are submitted unchanged.
- [x] Re-run focused create/edit submit-path validation and save the terminal checkpoint.

- [x] Inspect storefront product card add-to-bag and quantity increment handlers in Home.tsx.
- [x] Implement a quantity steppers or tap-to-increment state on product cards so customers can select quantities before adding or adjust them immediately.
- [x] Add regression test covering card quantity selection and cart persistence.
- [x] Validate responsive mobile/desktop rendering and save a release checkpoint.

- [x] Simplify ProductCard in Home.tsx to show only a green plus button (with item quantity badge if in cart) instead of the minus/number/plus stepper.
- [x] Ensure clicking the plus button increments quantity and adds/updates the cart.
- [x] Update regression test and verify responsive rendering.

- [x] Add a small in-card quantity badge for products already in the cart while keeping the plus-only control.
- [x] Replace pseudo quantity regression logic with a shared handler exercised by both Home.tsx and Vitest.
- [x] Re-run responsive verification after the real-handler and badge changes.

- [x] Inspect existing QR generator code and UPI/sharing QR modal components.
- [x] Implement a branded QR component featuring HariCart forest green styling, center logo, and "HariCart Fresh Vegetable" footer text.
- [x] Add regression tests and verify responsive UI rendering of the branded QR card.
- [x] Save and publish the branded QR checkpoint.

- [x] Confirm HariCart H-logo asset is centered in the branded QR and footer text reads "HariCart Fresh Vegetable".
- [x] Run mobile/desktop visual verification of the UPI QR modal and capture screenshots.
- [x] Save and publish the branded QR release checkpoint.

- [x] Ensure the branded QR center logo path correctly points to the HariCart H-logo asset.
- [x] Capture mobile and desktop preview screenshots of the UPI QR modal.
- [x] Save and publish the branded QR release checkpoint.

- [x] Capture mobile screenshot of open UPI payment modal with branded QR code.
- [x] Save and publish the branded QR release checkpoint.

- [x] Ensure test coverage or direct script verifies branded QR composition with center logo and footer text.

- [x] Inspect ProductCard plus button handler and cart mutation state in Home.tsx.
- [x] Fix plus button loading/mutation logic so rapid taps correctly add or increment items.
- [x] Add regression test for cart plus-button interaction and verify storefront rendering.
- [x] Save and publish the quantity-fix release checkpoint.

- [x] Inspect ProductCard loading scope in Home.tsx (ensuring global cart loading doesn't disable all plus buttons together).
- [x] Isolate per-product mutation loading state so tapping one card doesn't affect others.
- [x] Add regression test and verify mobile storefront interaction.
- [x] Save and publish click-isolation release checkpoint.

- [x] Inspect existing ProductCard cart line matching and action builder in shared/product-card.ts.
- [x] Implement robust sequential increment action (each tap increases quantity by +1 of that specific product).
- [x] Add regression test asserting multiple rapid or sequential plus taps increment only that product's line.
- [x] Save and publish sequential quantity increment release checkpoint.

- [x] Inspect existing category chips and product tag matching in Home.tsx.
- [x] Update storefront category filter logic to prioritize All, Fresh Vegetable, and Fresh Fruit.
- [x] Add regression test verifying filter behavior across All, Fresh Vegetable, and Fresh Fruit.
- [x] Save and publish category filter release checkpoint.

- [x] Remove standalone Fresh filter chip from Home.tsx categories.
- [x] Verify updated category chips and publish checkpoint.

- [x] Inspect current resident verification and auth flow in Home.tsx.
- [x] Implement gated OTP onboarding screen that blocks product catalog until mobile number and OTP verification are completed successfully.
- [x] Add regression test for OTP onboarding contract.
- [x] Save and publish OTP gated entry checkpoint.

- [x] Implement Block Number and Flat Number submission step after OTP verification in ResidentVerification component.
- [x] Add regression test for Block and Flat onboarding fields.
- [x] Save and publish Block/Flat onboarding checkpoint.

- [x] Inspect local-product variant mapping and cart mutation error handling in CartContext and commerce router.
- [x] Fix variant ID payload formatting for local catalog items so add-to-bag succeeds.
- [x] Add regression test for local add-to-bag mutation and verify mobile flow.
- [x] Save and publish add-to-bag fix checkpoint.

- [x] Extend database schema and community router for password, resident name, block number, and flat number storage.
- [x] Implement multi-step onboarding UI in Home.tsx: Mobile → OTP → Password → Name → Block → Flat → Save Details.
- [x] Trigger welcome celebration and success toast upon Save Details.
- [x] Automatically apply saved Block and Flat address at checkout for future orders.
- [x] Add regression tests for the extended onboarding flow and delivery address reuse.
- [x] Save and publish onboarding release checkpoint.

- [x] Inspect header logo dropdown/menu and admin portal resident procedures for customer directory integration.
- [x] Implement secure owner-only customer directory listing resident names, mobile numbers, block numbers, and flat numbers.
- [x] Add regression test verifying non-admin users cannot access the customer list and owners view masked/safe customer data.
- [x] Save and publish customer directory release checkpoint.

- [x] Add a customer-only Profile control to the storefront header top-right, hidden for admin and shop-owner screens.
- [x] Build the customer profile details view using the resident's saved name, mobile, block, and flat data without exposing password fields.
- [x] Add regression coverage proving owner/admin headers do not expose Profile and customer screens do.
- [x] Validate responsive storefront/profile views and save a release checkpoint.
- [x] Ensure the customer profile uses only the signed-in user's resident.me record and never loads the owner customer directory or another customer's data.

- [x] Configure server-side Owner ID secret key and verification procedure in community router.
- [x] Build the Owner ID prompt UI in Home.tsx and OperationsPortal for unlocking restricted owner actions.
- [x] Add regression tests verifying unauthorized actions fail without the correct Owner ID.
- [x] Save and publish Owner ID protected release checkpoint.

- [x] Configure server-side Owner ID secret verification in community router.
- [x] Create OwnerAuthModal component asking to "Please type your owner ID" when opening owner tools.
- [x] Wire Home header owner dropdown and workspace buttons to require successful Owner ID verification.
- [x] Add Vitest regression coverage for Owner ID verification and authorization guards.
- [x] Save and publish Owner ID protection release checkpoint.

- [x] Implement database-backed custom Owner ID setup so owners can create their own private ID on first use and reuse it thereafter.
- [x] Update OwnerAuthModal to support both first-time setup (Create Owner ID / Confirm Owner ID) and unlock states.
- [x] Add Vitest tests for custom Owner ID creation, verification, and role restriction.
- [x] Save and publish custom Owner ID release checkpoint.

- [x] Investigate and fix any mismatch in Owner ID verification hashing or database settings lookup.
- [x] Add robust reset/fallback options or direct diagnostics for owner ID verification.
- [x] Re-run tests and save verified fix checkpoint.

- [x] Clear the currently stored custom Owner ID so the next owner unlock opens first-time setup.
- [x] Verify the reset state and publish a checkpoint without exposing any Owner ID value.

- [x] Implement pre-launch branded HariCart onboarding gate requiring Mobile -> OTP -> Password -> Name -> Block -> Flat before storefront access.
- [x] Ensure admin/owner roles can bypass or access management panels while non-verified customers are strictly gated.
- [x] Add Vitest regression tests for launch gate compliance.
- [x] Save and publish launch gate release checkpoint.

- [x] Implement two-step create-and-confirm Owner password setup and matching validation.
- [x] Update OwnerAuthModal to require entering the confirmed password on subsequent unlocks.
- [x] Add regression coverage and responsive verification for the Owner password flow.
- [x] Save and publish the Owner password flow release checkpoint.

- [x] Implement owner-only app-launch security gate requiring authenticated admin/owner to enter/create their confirmed Owner ID immediately upon opening the app on their device.
- [x] Ensure customer devices remain on standard resident onboarding while the owner device enforces the owner launch security gate.
- [x] Add regression tests for owner app-launch verification and role isolation.
- [x] Save and publish the owner launch-gate protection release checkpoint.

- [x] Implement owner-only app-launch security gate: when opening HariCart as owner/admin, prompt immediately for Owner ID (create on first use, verify on repeat) before loading the app home screen.
- [x] Ensure customer devices remain strictly on resident onboarding and never trigger the owner launch gate.
- [x] Add Vitest regression tests for owner launch gating and save checkpoint.

- [x] Ensure clicking the Owner header button or icon always opens the OwnerAuthModal instead of navigating directly to /admin or /shop without verification.
- [x] Add regression tests ensuring owner button clicks prompt for password verification.
- [x] Save and publish the Owner button security fix checkpoint.

- [x] Investigate the server-side OTP procedure in community.ts and client-side error handling in Home.tsx.
- [x] Fix any unhandled exception or resident error format mismatch causing HTML error pages during OTP requests.
- [x] Add Vitest regression tests for OTP sending and JSON response compliance.
- [x] Save and publish the OTP fix checkpoint.
- [x] Investigate the server-side requestOtp and confirmOtp procedures when Twilio credentials are unconfigured or failing.
- [x] Add graceful fallback simulation when SMS credentials are not set so onboarding never encounters HTML parse or JSON errors.
- [x] Save and publish the OTP error fix checkpoint.

- [x] Implement phone-first resident launch gate bypassing OAuth account chooser for customers.
- [x] Streamline resident onboarding to exactly: Mobile Number -> OTP -> Block Number -> Flat Number -> App open.
- [x] Ensure Owner/Admin security remains intact via Owner ID while customers experience clean phone-number login.
- [x] Add regression tests and publish phone-first customer release checkpoint.
- [x] Verify resident onboarding auto-saves Block and Flat details in residentProfiles table.
- [x] Verify checkout automatically uses saved Block and Flat address without prompting the resident again.
- [x] Verify private address isolation across customer accounts.
- [x] Run test suite and save address verification checkpoint.
- [x] Inspect Owner ID hash storage and verification helper logic in shared/owner-auth.ts and server/routers/community.ts.
- [x] Fix any mismatch between owner password hashing and verification.
- [x] Add Vitest regression coverage for Owner ID setup, repeat verification, and reset flow.
- [x] Run test suite and save fix checkpoint.
- [x] Inspect network requests and server-side requestOtp handling in community.ts and Home.tsx.
- [x] Ensure requestOtp and confirmOtp catch external network or Twilio failures and return structured TRPCError JSON responses instead of throwing unhandled errors that output HTML pages.
- [x] Add regression test for OTP error handling under simulated network or API faults.
- [x] Run full test suite and save fix checkpoint.
- [x] Implement 30-second countdown timer and Resend OTP button on resident verification screen.
- [x] Add countdown and resend regression tests.
- [x] Run test suite and save checkpoint.
- [x] Trace published Send OTP request endpoint and server error handling.
- [x] Ensure requestOtp and confirmOtp use fallback simulated SMS verification when Twilio or network calls fail, avoiding unhandled exceptions that return HTML.
- [x] Run test suite and save durable fix checkpoint.
- [x] Diagnose customer OTP delivery issue and make fallback/simulation behaviour explicit.
- [x] Add regression test for OTP delivery simulation and code verification.
- [x] Save checkpoint for OTP delivery fix.
- [x] Update confirmOtp to explicitly accept test code 1234 when simulated.
- [x] Update UI guidance to clearly show simulation mode and test code instructions.
- [x] Run test suite and save checkpoint.
- [x] Trace initial auth routing and bypass OAuth provider modal for new HariCart customers.
- [x] Add direct phone/OTP onboarding entry for unauthenticated visitors.
- [x] Run test suite and save fix checkpoint.
- [x] Ensure link and QR entries bypass OAuth provider chooser and land on Mobile -> OTP -> Block -> Flat onboarding.
- [x] Add regression test for direct customer onboarding on link/QR visits.
- [x] Run test suite and save direct-entry checkpoint.
- [x] Verify published domain greengateapp-fjshoyim.manus.space shared link routing.
- [x] Ensure ShareAppButton copies the published domain URL instead of internal preview or callback URLs.
- [x] Run test suite and save public-sharing release checkpoint.
- [x] Wire Start resident verification button to direct phone/OTP onboarding without OAuth.
- [x] Fix customer launch so new residents see Mobile Number -> OTP -> Block Number -> Flat Number only, with no customer Name/Password or Owner Security screen
- [x] Verify customer onboarding reaches the storefront after saving Block and Flat, while Owner/Admin protection remains unchanged
- [x] Fix published Start resident verification action still invoking OAuth after the first customer onboarding release.
- [x] Make public OTP requests return a structured simulation response when Twilio is unavailable or misconfigured, so customers can continue with test OTP 1234 instead of receiving an HTML 502 error.
- [x] Redesign existing and future product cards to match the photo-first grocery reference layout (top-left discount badge, square product image with rating badge on bottom-left, plus button on bottom-right, unit badge, product title, and strikethrough MRP with sale price).
- [x] Add top category filter pills (All, Fresh Vegetables, Fresh Fruits, Daily Essentials) above HariCart storefront catalog.
- [x] Add a prominent live product search bar that filters products as customers type and works with category filters.
- [x] Add a mobile-first Home screen layout with quick shortcuts and bottom navigation for Home, Categories, Buy Again, and Fresh while preserving HariCart resident-only behavior.
- [x] Add a top-of-home 10-minute delivery availability option for verified GreenGate residents, with availability wording.
- [x] Add a persistent live 10-minute delivery countdown timer to checkout with a completed-window status.
- [x] Add top quick category controls for Clothes, Grocery, Fresh Vegetables, and Fresh Fruits with single-category catalog filtering.
- [x] Add owner-only Availability & Timing controls below the bag for Fruits, Vegetables, Clothes, and Grocery, including category on/off and Open Market toggles.
- [x] Show customer-facing unavailable product messaging when a category is outside its configured availability window.
- [x] Replace the always-visible owner Availability & Timing panel with a compact Owner-only rectangle button labeled Market Timing beneath Bag, opening the full controls on click.
- [x] Add Owner/Admin-controlled MRP and Sale Price fields with automatic per-product discount calculation and customer card display.
- [x] Add a 🎧 Electronics quick category and ensure only electronic products appear when it is selected.
- [x] Refine top live search to return immediate matching products from names, descriptions, categories, and common vegetable search terms without unrelated items.
- [x] Replace the “Fresh Vegetables” storefront promotional wording with an attractive Lucknow market name and an all-in-one discount-focused tagline.
- [x] Add an Owner/Admin-only daily discount banner editor with persisted app setting and customer storefront display.
- [x] Add Owner/Admin-managed discount banners for All Products and each product category, with automatic customer-side category banner selection.
- [x] Add “All-in-One Market” directly beneath the Lucknow market hero headline while retaining the extra-discount message.
- [x] Fix Owner Security so Forgot/Reset Owner credential is visible and usable when the Owner ID/password is forgotten.
- [x] Add a Plumber Services icon above Home Tuition with all requested plumbing services and resident contact actions.
- [x] Add an Electrician Services icon above Plumber Services with a complete electrical service menu and contact 9170367884.
- [x] Restyle Home Tuition, Fitness Provider, Electrician, and Plumber controls to compact Market Timing-style buttons with smaller icons.
- [x] Make Electrician, Plumber, Home Tuition, and Fitness service lists open beneath their buttons.
- [x] Add a clear Close button to Electrician, Plumber, Home Tuition, and Fitness service panels.
- [x] Move Electrician, Plumber, Home Tuition, and Fitness buttons from the floating right stack into the Home category area like Fresh.
- [x] Move all four service controls into one circular icon row directly above Market Timing.
- [x] Make Electrician, Plumber, Home Tuition, and Fitness lists open above the circular service row.
- [x] Add a dark transparent backdrop behind open service panels with click-to-dismiss behavior.
- [x] Make Electrician, Plumber, Home Tuition, and Fitness lists open below the circular service row while keeping backdrop and Close behavior.
- [x] Display the full detailed service lists directly on Home for Electrician, Plumber, Home Tuition, and Fitness Provider.
- [x] Make all four resident services open their lists in the same Fitness Provider-style expandable panel and remove the duplicate always-visible directory.
- [x] Add an instant search bar inside Electrician, Plumber, Home Tuition, and Fitness service panels.
- [x] Make only the clicked service panel open, anchored above the clicked circular icon, with other panels closed.
- [x] Fix mobile service panels so the clicked panel opens fully above its icon without being clipped.
- [x] Restore Electrician, Plumber, Home Tuition, and Fitness panels to open below the clicked circular icon with existing search and dismissal behavior.
- [x] Keep the complete clicked service panel above the Hero section on mobile, with all content visible or scrollable.
- [x] Keep every clicked service panel fully inside the mobile viewport while opening below the service row.
- [x] Make long service panels fully accessible on mobile with internal scrolling and reachable Call/Close actions.
- [x] Add Car Service and Bike Service logo/name controls alongside the existing Home resident service icons.
- [x] Add a resident vehicle service-request form for Car Service and Bike Service, including issue details, submission feedback, and call handoff.
- [x] Show clear names beneath Fitness Provider, Home Tuition, Electrician, and Plumber circular service logos.
- [x] Make all resident service icons smaller while keeping every service name and option visible.
- [x] Add required customer mobile number, block number, and flat number fields to all resident service-request forms after service selection.
- [x] Add a Pay Now step before order submission with UPI, Online Payment, and Cash on Delivery choices.
- [x] Show the branded UPI QR popup immediately when UPI payment is selected during checkout.
- [x] Show a green right-tick success confirmation with “Your order has been completed” after successful online or COD order placement.
- [x] Add a View Order Details button to the order-completion confirmation screen.
- [x] Add a Download Receipt as PDF button to the customer order details page.
- [x] Ensure customer and owner order screens show only ₹ amounts, never dollar symbols.
- [x] Send an immediate in-app owner notification when a customer places an order.
- [x] Implement an SMS alert dispatch to the owner when a customer places an order, guarded by valid Twilio credentials and sender configuration.
- [x] Defer live Twilio delivery testing because the user selected a no-pay notification path; guarded in-app owner alerts remain active.
- [x] Add an owner/admin View button that opens complete customer order details.
- [x] Fix Online Payment checkout so payment can complete successfully and update the order state correctly.
- [x] Evaluate MSG91 configuration requirements; defer paid MSG91 setup because the user selected a no-pay notification path.
- [x] Keep the existing guarded Twilio dispatch optional and do not replace it with a paid MSG91 provider after the user selected the no-pay path.
- [x] MSG91 live validation is not applicable while the paid provider is deferred; retain the tested free in-app notification path.
- [x] Improve the UPI QR flow with a current-tab app action, copyable UPI ID fallback, order transaction reference, smaller logo overlay, and explicit pending-payment verification guidance.
- [x] Verify the existing customer-only profile icon shows the logged-in customer’s own mobile and apartment details and is hidden from owner/admin screens.
- [x] Confirm customer profile privacy regression coverage and responsive role visibility, then save a release checkpoint.
- [x] Add a customer-only Edit Details flow to update the logged-in resident’s block and flat.
- [x] Add authorization and UI regression coverage for customer profile editing, then save a release checkpoint.
- [x] Show a customer-only confirmation toast or banner with the updated Block and Flat after saving address details.
- [x] Add regression coverage for the address-save confirmation copy and publish the update.
- [x] Remove any controllable “Made with Manus” text from HariCart storefront, footer, metadata, and install labels, replacing it with HariCart branding.
- [x] Validate downloaded/install metadata and document that platform-owned preview/debug branding, if shown outside the app, is not controlled by HariCart source; publish a checkpoint.
- [x] Add a branded HariCart logo splash screen that appears briefly on app launch before the storefront.
- [x] Add launch-state regression coverage, verify mobile/desktop presentation, and publish a checkpoint.
- [x] Add an owner/admin setting to configure the customer splash screen duration within safe limits.
- [x] Persist the setting, apply it on the next app launch, add regression coverage, and publish a checkpoint.
- [x] Restrict Electrician, Plumber, Home Tuition, Fitness, Car, and Bike service icons to the customer storefront home screen only.
- [x] Add regression coverage proving service icons are absent from Orders, Profile, Cart, and Owner/Admin panels, then publish the combined update.
- [x] Restore Electrician, Plumber, Home Tuition, Fitness, Car, and Bike icons on the verified customer storefront home while keeping non-home surfaces hidden.
- [x] Add a regression for the verified customer home condition and publish the visibility fix.
- [x] Restore the complete prior resident service row layout on the first customer Home page only, including Electrician, Plumber, Fitness Provider, Car Service, and Bike Service.
- [x] Add regression coverage for first-page-only visibility and publish the corrected layout.
- [x] Build an owner-only Service History panel for Electrician, Plumber, Home Tuition, Fitness Provider, Car Service, and Bike Service requests.
- [x] Persist customer name, mobile, block, flat, address, selected service, prior issue, date/time, and status; add protected owner detail/status procedures, tests, migration, and checkpoint.
- [x] Align the owner workflow with the flow-chart roadmap by adding a pilot-readiness and operational-gate panel.
- [x] Add owner-visible operational metrics for orders, average order value, stock-outs, delivery partners, delivered/open orders, and service workload using real stored data only.
- [x] Add explicit roadmap status for resident validation, supplier/shop setup, compliance review, QA, pilot, and expansion gates without claiming external approvals are complete.
- [x] Add regression coverage and visual verification for the roadmap-aligned operations panel, then publish a checkpoint.

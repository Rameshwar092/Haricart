# Final Catalog Submit-Path Validation

The focused submit-path validation completed on 2026-08-18 after extracting the exact submit transformations from `OperationsPortal.tsx` for direct execution in Vitest.

| Surface | Viewport | Result |
|---|---:|---|
| HariCart customer storefront | 1280 × 720, full page | Pass: HariCart branding, GreenGate resident-only messaging, local Tomato and Lemon cards, photos, prices, stock, and active Add buttons render correctly. |
| Admin operations portal | 1280 × 720, full page | Pass: Add item photo-first form and WhatsApp-style managed catalog cards render together with catalog photos, origin labels, stock, and edit controls. |
| HariCart customer storefront | 390 × 844, full page | Pass: responsive header, resident gate, local product cards, product imagery, Add controls, and order-tracking section remain legible and usable. |
| Admin operations portal | 390 × 844, full page | Pass: photo-first Add item form and managed inventory cards stack vertically without clipping; form controls and catalog photos remain visible. |

The create regression now invokes `buildProductCreatorSubmitPayload`, which is the exact transformation used by `ProductCreator` after `setImageUrl(uploaded.url)`, and passes the resulting payload to the real protected `shop.inventory.create` caller. The edit regression invokes `buildInventoryCardSubmitPayload`, which is the exact transformation used by `InventoryCard`, and passes that output to the real protected `shop.inventory.update` caller. Both tests assert persisted `imageUrl`, `stockQuantity`, and `isAvailable` values.

The focused catalog tests passed 4/4, the complete Vitest suite passed 37/37 with 2 intentionally skipped tests, and TypeScript validation passed with no errors.

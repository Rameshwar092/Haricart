# Catalog synchronization validation

- Desktop customer storefront shows HariCart branding, GreenGate society-only delivery messaging, and the live catalog count.
- Desktop Admin view shows 4 live SKUs and the catalog management workspace.
- Mobile customer storefront shows a local catalog card with product photo, ₹ price, unit label, stock count, and a Listed state when no Shopify variant is connected.
- Mobile customer storefront shows a connected Shopify item with an active Add button.
- Hide/show behavior is covered by commerce router regression tests; TypeScript and the full Vitest suite passed with 23 tests passing and 2 skipped.

# HariCart Add-button validation

The local catalog Tomato product is available with positive stock and now renders an active **Add** button on the mobile customer storefront. The screenshot shows the uploaded tomato photo, `1 kg · 1 in stock`, price `₹60`, and the Add control. The desktop storefront loads successfully; the attempted `/product/tomato` route returned the normal Return to market state because the exact product handle may differ, so the home-card flow is the verified route. TypeScript validation passes and the full Vitest suite reports 29 passed tests and 2 skipped tests.

# Catalog Form Validation

The authenticated `/admin` preview was checked at 1280×720 and 390×844 after the shared catalog submit-payload refactor.

On desktop, the photo-first dark Local Catalog panel is visible beside the managed inventory card. It includes the large “Add photos and videos” dropzone, shop selector, item name, required rupee price, optional Sale Price, description, Country of origin selector, expanded More fields for stock and unit, Hide this item control, and Save item action. The existing Tomato inventory card renders with its photo and Country of origin line.

On mobile, the same form stacks cleanly below the admin controls. The photo dropzone, inputs, origin selector, stock guidance, hide toggle, and Save item button remain visible and usable without horizontal overflow. The inventory card remains readable below the form.

Validation paired with `pnpm check` and the full Vitest suite: 35 tests passed and 2 skipped.

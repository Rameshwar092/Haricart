# Address persistence verification notes

The resident onboarding mutation in `server/routers/community.ts` normalizes Block and Flat values to uppercase, composes `apartmentUnit` as `BLOCK-FLAT`, and upserts all three values into `residentProfiles` keyed by the authenticated `ctx.user.id`. The mutation requires a matching verified phone for non-admin residents.

The offline checkout mutation loads the verified resident profile using the authenticated user ID and writes only that profile's `apartmentUnit` into the newly created order. It does not accept a client-supplied address, so checkout cannot substitute another resident's address. The local-cart contract already asserts that the order row receives the verified resident unit.

The resident profile query calls `getResidentProfileByUserId(ctx.user.id)` and strips `passwordHash` before returning, which supports per-user isolation and avoids exposing account secrets.

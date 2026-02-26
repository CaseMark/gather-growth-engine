# Release Process

## Version bump

**Bump the version in `package.json` with every release.** The app title shows "Outbound Growth Engine · X.Y.Z".

- **Patch** (0.2.0 → 0.2.1): Bug fixes, small tweaks
- **Minor** (0.2.0 → 0.3.0): New features, no breaking changes
- **Major** (0.2.0 → 1.0.0): Breaking changes, major redesigns

When in doubt, use patch for iterative releases.

## Before deploy

1. Update `package.json` version
2. Add entry to `lib/release-notes.ts`
3. Deploy (git add, commit, push)
4. If schema changed: `npx prisma migrate deploy`

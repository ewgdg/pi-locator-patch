# pi-hashline-patch

Fresh Pi extension package for stable hashline reads and hash-only patch apply.

## Tools

### `hashline_read`

Input:

```ts
{
  path: string;
  offset?: number; // default 1
  limit?: number;  // default 2000, max 2000
}
```

Output text contains only rows:

```text
HASH│content
```

No line numbers, duplicate counters, or metadata rows are added.

### `hashline_patch`

Input:

```ts
{
  path: string;
  patch: string;
  dry_run?: boolean;
}
```

Patch syntax:

```diff
--- a/path optional
+++ b/path optional
@@ @@
 HHHH│context
-HHHH│deleted
+HHHH│inserted
```

Each hunk is located by exact contiguous sequence of context/deletion hashes. Exactly one match is required. No fuzzy fallback, line-number matching, duplicate counters, or perfect hashing.

## Validate

```sh
npm install
npm run typecheck
npm test
npm run validate
```

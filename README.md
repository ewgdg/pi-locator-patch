# pi-hashline-patch

Pi extension package for stable hashline reads and hash-only patch apply.

When loaded, the extension overrides Pi's built-in `read`, disables built-in `edit`, and enables `read` / `patch`. Built-in `write` stays active, matching pi-hashline-edit-pro: `write` does not conflict with hash-anchored patching, while `edit` does.

## Tools

### `read`

Input:

```ts
{
  path: string;
  offset?: number; // default 1
  limit?: number;  // default 2000, max 2000
}
```

For text files, output text contains only rows:

```text
HASH│content
```

No line numbers, duplicate counters, or metadata rows are added. Image files (`jpg`, `png`, `gif`, `webp`) delegate to Pi's built-in `read` behavior and are returned as image reads, not hashlines.

### `patch`

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

Success output is a compact post-edit hash-only receipt, not the whole patched file:

```text
@@ result
 HHHH
+HHHH
 HHHH
```

Receipt rows include only surviving/current context hashes (` HHHH`) and newly inserted hashes (`+HHHH`). Deleted hashes and file content are omitted from visible output. If receipt is empty or too large, the patch still succeeds after a valid apply and returns a short status telling you to use `read`.

## Validate

```sh
npm install
npm run typecheck
npm test
npm run validate
```

# Hashline patch format

## Hashlines

Each logical text line renders as:

```text
HASH│content
```

`HASH` is first 3 bytes of SHA-256 over line content encoded as unpadded base64url, exactly 4 characters. Line terminators are excluded. Duplicate content produces same hash.

Files are UTF-8 text. UTF-8 BOM is preserved. Original first newline convention (`LF`, `CRLF`, or `CR`) and final-newline state are preserved on patch write. Empty file has zero logical lines.

## Patch

Single-file patch:

```diff
--- a/path optional
+++ b/path optional
@@ @@
 HHHH│context content
-HHHH│deleted content
+HHHH│inserted content
```

Rules:

- Hunk header must be exactly `@@ @@`.
- No source line numbers, ranges, duplicate counters, perfect hashes, or fuzzy anchors.
- Operation prefixes: space = context, `-` = delete, `+` = insert.
- Parser validates each operation hash equals included content.
- Match sequence is context + deletion hashes in order. Insertions do not participate.
- Sequence must match exactly one contiguous span in current target file.
- Zero matches = stale hunk. More than one match = ambiguous hunk.
- Pure insertion has empty match sequence and is supported only when target file has zero logical lines.

## Collision risk

4-character hashes expose 24 bits. Collisions are accepted v1 behavior. Apply uses hashes only; it does not compare target content to patch content after locating a hunk. Context lines in output preserve actual target content.

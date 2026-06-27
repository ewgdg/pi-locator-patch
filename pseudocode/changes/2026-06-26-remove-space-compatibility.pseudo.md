---
affects:
  - src/patch-format.ts
---

# Remove Space Compatibility Context Rows

## Intent

Make patch row syntax explicit so leading whitespace cannot silently reinterpret operator-looking rows as literal context.

## Behavior

```pseudo
When parsing an update hunk row:
  if row begins with '+': parse inserted content after '+'
  if row begins with '=': parse context locator after '='
  if row begins with '-': parse delete locator after '-'
  if row begins with space:
    reject patch as invalid
    tell caller to use '=:' for exact context lines
  otherwise:
    reject patch as malformed operation

Exact context matching, including indented file lines, must use '=:' followed by the full raw line text.
```

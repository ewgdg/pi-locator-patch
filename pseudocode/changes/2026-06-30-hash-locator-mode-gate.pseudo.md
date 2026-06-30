---
affects:
  - src/patch-format.ts
  - src/universal-patch-format.ts
  - src/tools/locator-patch.ts
---

# Hash Locator Mode Gate

## Intent

Prevent default-mode patches from mistaking normal unified-diff lines that begin with `#` for hash locators. Hash locator syntax is available only when the parser is explicitly told hash locators are enabled; direct parser APIs keep hash locators enabled by default for compatibility.

## Behavior

```pseudo
parse patch text with options:
  hash locators enabled defaults to true when caller does not specify it

for each update hunk operation row:
  if row is insert:
    parse as literal insert content

  if hash locators enabled:
    treat `#` as a locator marker
    ` #abc` and `-#abc` parse as hash context/delete locators
    malformed hash locators reject before any unified-diff fallback

  if hash locators disabled:
    do not treat `#` as a locator marker
    ` #define X` parses as unified-diff exact context text `#define X`
    `-#old` parses as unified-diff exact delete text `#old`
    bare `#abc` remains invalid because bare unified-diff context rows are not accepted
    explicit exact locators such as ` :#literal` and `:#literal` still match literal text starting with `#`

patch tool behavior:
  read current hash mode before parsing patch input
  parse update hunks with hash locators enabled only when hash mode is enabled
  keep hash-mode success output behavior unchanged
```

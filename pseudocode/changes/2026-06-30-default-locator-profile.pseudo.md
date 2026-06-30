---
affects:
  - src/patch-format.ts
  - src/universal-patch-format.ts
  - src/tools/locator-patch.ts
  - README.md
  - docs/patch-format.md
---

# Markerless locator profile pseudocode

## Intent

Let config choose profile defaults for markerless context/delete rows, while per-call markerless_locator/receipt can override individual knobs and retry patches serialize explicit locators.

## Behavior

```pseudo
Define markerless locator kinds: exact, smart, hash, prefix, contains.
Define patch profiles:
  classic -> markerless locator exact, status receipt
  smart   -> markerless locator smart, status receipt
  hash    -> markerless locator hash, hash receipt

When patch tool executes:
  read configured profile.
  start from configured profile defaults.
  if markerless_locator is supplied:
    override the configured profile's markerless locator.
  if receipt is supplied:
    override the configured profile/global receipt.
  enable explicit # locators when configured profile is hash, receipt is hash, or markerless locator is hash.
  parse the universal patch with the resolved markerless locator and hash-locator flag.
  render status or hash receipt using the resolved receipt mode.

When parsing update hunk rows:
  insert rows beginning + always insert literal content.
  blank hunk rows still mean exact empty context.
  explicit locator markers keep current behavior and override defaults.
  leading-space context or -delete rows with no locator marker use the resolved markerless locator.
  bare rows with no operator and no locator marker are accepted as context only when the resolved markerless locator is not exact.
  exact default preserves current unified-diff exact behavior: context rows need leading space, delete rows use -text, and bare exact context remains invalid.
  hash default requires markerless text to be a valid 3- or 4-character hash; malformed markerless hashes fail.

When a parsed markerless operation is retried or serialized:
  write explicit locators (:, ~, #, ^, *) instead of relying on the original markerless locator.
  therefore retry patches preserve semantics without needing the original profile/markerless_locator settings.
```

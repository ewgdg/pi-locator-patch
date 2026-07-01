---
affects:
  - src/tools/locator-patch.ts
  - README.md
  - docs/patch-format.md
---

# Hash profile markerless override

## Intent

Keep hash profile strict by default, but let an explicit per-call `markerless_locator` override row parsing.

## Behavior

```pseudo
when resolving patch execution options:
  start from configured profile defaults
  if markerless_locator is supplied:
    use it as the resolved markerless locator
  strict hash rows are enabled only when:
    configured profile is hash
    and markerless_locator was not supplied

with configured profile hash and no markerless_locator override:
  update hunk rows remain strict hash-only

with configured profile hash and markerless_locator override:
  parse markerless rows using the supplied markerless_locator
  keep hash locators enabled because the configured profile is still hash
  receipt default remains hash unless receipt is separately overridden
```

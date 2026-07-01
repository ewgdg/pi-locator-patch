---
affects:
  - src/apply.ts
  - src/locator-efficiency.ts
  - src/tools/locator-patch.ts
  - src/tools/patch-render.ts
---

# Locator cost warning

## Intent

Warn agents when authored locator rows are too close to the equivalent unified-diff baseline, so future patches use shorter locators or ranges.

## Behavior

```pseudo
when applying or dry-running a patch succeeds:
  compute normal patch char efficiency exactly as before

  compute locator cost only from locator rows:
    for update hunks:
      context/delete locator rows contribute authored locator characters
      matched context/delete target lines contribute canonical unified-diff baseline characters
      context/delete range rows contribute authored range locator characters
      matched range target lines contribute canonical unified-diff baseline characters
      insert rows contribute nothing
    for add-file, delete-file, and pure insertion hunks:
      locator authored chars = 0
      locator baseline chars = 0

  attach aggregate {patchChars, baselineChars} as locatorEfficiency in result details

when formatting successful model-visible output or rendering successful patch result:
  keep existing receipt/status, matcher, and patch efficiency output
  if locator baseline chars > 0 and locator patch chars / locator baseline chars > 50%:
    append warning:
      Warning: locator cost is <ratio>% of baseline. Use shorter locators or ... ranges.
```

---
affects:
  - src/universal-patch-format.ts
  - src/tools/selector-patch.ts
  - src/content-diff.ts
---

# Drop Delete File Operation

## Intent

Patch tool edits text by adding or updating files only. Whole-file deletion is removed because no built-in edit/delete equivalent exists and symlink deletion has unsafe target-vs-link semantics.

## Behavior

```pseudo
when parsing a universal patch:
  accept file sections only for Add File and Update File
  if a section header is Delete File:
    reject the patch with E_INVALID_PATCH explaining Delete File is not supported

when serializing universal patch operations:
  support Add File and Update File operations only

when executing patch operations:
  plan and write only add/update changes
  never delete a filesystem entry as part of patch execution

when rendering patch status or details:
  render add/update statuses and transcripts only
  do not emit Deleted file statuses
```
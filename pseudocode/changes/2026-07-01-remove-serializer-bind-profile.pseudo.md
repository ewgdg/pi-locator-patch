---
affects:
  - src/universal-patch-format.ts
  - src/tools/selector-patch.ts
---

# Remove Universal Patch Serializer And Bind Tool Profile

## Intent

Retry patches should preserve authored input by copying retained source text, not by re-serializing parsed operations. A registered patch tool should keep the profile it was created with for the whole session.

## Behavior

```pseudo
when universal patch input is parsed:
  retain original normalized source lines and operation start indexes

when retry patch text is needed:
  copy the original source tail from failed operation through end of patch body
  if original input used outer boundaries, wrap copied tail with matching boundaries
  do not serialize parsed operations back into patch text

do not expose or rely on a generic universal patch serializer

when creating a patch tool with profile P:
  build prompt/schema from P
  execute every patch call using P
  do not reread config or environment during execute
```
# Implementation Plan

## Goal
Build fresh TypeScript `pi-hashline-patch` extension with stable 4-char hashline read output and transactional hash-only patch apply.

## Tasks
1. **Create package skeleton**
   - File: `package.json`
   - Changes: add ESM package `pi-hashline-patch`, `pi.extensions: ["./src/index.ts"]`, scripts `check`, `test`, `validate`, peer deps for Pi packages/typebox, dev deps for TypeScript/Vitest/Node types.
   - Acceptance: `npm install` succeeds; `npm run check` command exists.

2. **Add TypeScript/test config**
   - File: `tsconfig.json`
   - Changes: NodeNext ESM, strict mode, no emit, include `src/**/*.ts` and `test/**/*.ts`.
   - File: `vitest.config.ts`
   - Changes: configure Node test environment.
   - Acceptance: empty test run can start after deps installed.

3. **Implement pure hash function**
   - File: `src/hash.ts`
   - Changes: export `HASH_WIDTH = 4`, `HASH_SEPARATOR = "│"`, `hashLine(content: string): string`; use SHA-256, first 3 digest bytes, base64url no padding.
   - Acceptance: same content always same 4-char base64url hash; duplicate lines share hash.

4. **Implement text line model**
   - File: `src/text-lines.ts`
   - Changes: export `parseText(text)` and `serializeText(model)` with `{ lines, newline, finalNewline, bom }`; strip/preserve UTF-8 BOM; hash excludes terminators; preserve original first newline convention (`\n`, `\r\n`, `\r`) on write; preserve final newline state; empty file has zero lines.
   - Acceptance: final newline/no final newline round-trips; CRLF file writes CRLF; `"\n"` is one empty line with final newline.

5. **Implement read-format renderer/parser**
   - File: `src/read-format.ts`
   - Changes: export `toHashLines(lines, hashFn = hashLine)`, `renderHashLines(entries)`, `parseHashLine(text)`; split on first `│`; validate 4-char base64url hashes.
   - Acceptance: content containing `│` parses; empty content renders `HASH│`; output lines are exactly `HASH│content`.

6. **Implement patch data types and parser**
   - File: `src/patch-format.ts`
   - Changes: define `Patch`, `Hunk`, `PatchOp`; parse one single-file patch; allow optional `--- ...` and `+++ ...` headers; hunk header must be exactly `@@ @@`; op lines must be ` HHHH│content`, `-HHHH│content`, or `+HHHH│content`; reject multiple file sections, line-number hunk headers, bad hashes, malformed lines; validate every patch line hash equals included content.
   - Acceptance: parser accepts hash-only unified shape and rejects `@@ -1,2 +1,2 @@`.

7. **Implement named errors**
   - File: `src/errors.ts`
   - Changes: add `InvalidPatchError`, `StaleHunkError`, `AmbiguousHunkError`, `UnsupportedHunkError`, `FileTextError`; include stable codes like `[E_INVALID_PATCH]`, `[E_STALE_HUNK]`, `[E_AMBIGUOUS_HUNK]`, `[E_UNSUPPORTED_HUNK]` in messages.
   - Acceptance: tests can assert error classes/codes.

8. **Implement transactional apply core**
   - File: `src/apply.ts`
   - Changes: export `applyPatchToText(text, patchText | Patch, options?)`; parse text to line model; apply hunks sequentially in memory; match sequence = context+deletion hashes only; scan whole current file for exact contiguous hash sequence; `0` = stale, `>1` = ambiguous; insertion ops do not participate in matching; pure insertion supported only when target has zero logical lines; context lines preserve actual target content; deletions remove actual target content; insertions use patch content; return `{ text, entries, renderedHashLines }`.
   - Acceptance: failed hunk throws before caller writes; successful apply returns full new `HASH│content` output.

9. **Implement file I/O helpers**
   - File: `src/fs-text.ts`
   - Changes: resolve path relative to `ctx.cwd`, strip leading `@`, require existing regular readable/writable text file, reject null bytes and invalid UTF-8, read via `Buffer` + `TextDecoder({ fatal: true })`; write atomically through temp file in same directory; for existing symlink use `realpath` so target is updated, not symlink replaced.
   - Acceptance: binary/null-byte fixture rejected; symlink fixture updates target content.

10. **Add `hashline_read` Pi tool**
    - File: `src/tools/hashline-read.ts`
    - Schema:
      ```ts
      Type.Object({
        path: Type.String({ description: "Text file path to read as hashlines." }),
        offset: Type.Optional(Type.Integer({ minimum: 1, description: "1-based logical line offset." })),
        limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 2000, description: "Max logical lines to return." }))
      }, { additionalProperties: false })
      ```
    - Changes: read text file, render selected lines only as `HASH│content`; if omitted, default `offset=1`, `limit=2000`; if file has more lines than returned, include pagination metadata only in `details`, not prepended to text.
    - Acceptance: tool text content contains only hashline rows; no line numbers/counters.

11. **Add `hashline_patch` Pi tool**
    - File: `src/tools/hashline-patch.ts`
    - Schema:
      ```ts
      Type.Object({
        path: Type.String({ description: "Existing target text file to patch." }),
        patch: Type.String({ description: "Hash-only unified patch using @@ @@ hunks." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Validate/apply in memory and do not write." }))
      }, { additionalProperties: false })
      ```
    - Changes: wrap whole read-apply-write window in `withFileMutationQueue(realTargetPath, ...)`; on success write unless `dry_run`; return only resulting full `HASH│content` output as text; put `{ path, dryRun, lineCount }` in details.
    - Acceptance: concurrent same-file calls are queued; stale/ambiguous patch leaves file unchanged.

12. **Register extension**
    - File: `src/index.ts`
    - Changes: default factory imports/registers `hashline_read` and `hashline_patch`; add prompt snippets/guidelines saying patches use hash-only anchors, no line numbers, no duplicate counters, no fuzzy fallback.
    - Acceptance: `pi -e ./src/index.ts` loads and lists both tools.

13. **Export core API for tests/users**
    - File: `src/api.ts`
    - Changes: re-export `hashLine`, text-line helpers, read-format helpers, `parsePatch`, `applyPatchToText`, error classes.
    - Acceptance: tests import pure logic without Pi runtime.

14. **Write unit tests first, then implementation**
    - Files: `test/hash.test.ts`, `test/text-lines.test.ts`, `test/read-format.test.ts`, `test/patch-format.test.ts`, `test/apply.test.ts`, `test/fs-text.test.ts`
    - Changes: cover cases listed in Test Cases section below.
    - Acceptance: failing tests exist before core implementation; final `npm test` passes.

15. **Add manual docs/demo**
    - File: `docs/patch-format.md`
    - Changes: document exact hash algorithm, line splitting, patch syntax, pure insertion rule, collision risk, examples.
    - File: `README.md`
    - Changes: minimal install/use with tool schemas and validation commands.
    - Acceptance: docs contain no machine-specific paths.

## Tool Schemas
- `hashline_read`
  - `path: string` required.
  - `offset?: integer >= 1`, default `1`.
  - `limit?: integer 1..2000`, default `2000`.
  - Output text: only `HASH│content` rows.
- `hashline_patch`
  - `path: string` required; must already exist and be writable text file.
  - `patch: string` required; single-file hash-only unified patch.
  - `dry_run?: boolean`, default `false`.
  - Output text: resulting whole file as `HASH│content` rows.

## Patch Syntax
```diff
--- a/path optional
+++ b/path optional
@@ @@
 HHHH│context content
-HHHH│deleted content
+HHHH│inserted content
```
- Hunk header exactly `@@ @@`; no line numbers, ranges, counters, or hash sequence duplication.
- Body defines match sequence: all context/deletion hashes in order; insertions excluded.
- Parser validates every `HASH│content` against `hashLine(content)`.

## Test Cases
- Hash/read: same content same hash across positions; duplicates same hash; 4-char base64url; separator in content; empty line; Unicode; empty file; final newline preservation; CRLF preservation.
- Patch parse: accept optional file headers; reject bad hash width/alphabet; reject malformed `HASH│content`; reject line-number hunk header; validate hash/content mismatch for context/delete/insert.
- Apply success: replace one line with unique context; delete with unique context; insert between context lines; multiple hunks sequential; duplicate line elsewhere OK when full sequence unique; insertion hash equals returned hash.
- Apply stale: absent sequence; changed context hash; changed deletion hash; multi-hunk failure leaves original file unchanged.
- Apply ambiguous: same match sequence twice; single duplicate deletion with no unique context; pure insertion into non-empty file rejected; mocked hash collision via injectable hash function.
- Empty/small: pure insertion into empty existing file; delete entire file; single-line replace/delete.
- Tool/fs: invalid UTF-8 rejected; null byte rejected; symlink target updated; `dry_run` does not write; `hashline_patch` queues mutation.

## Validation Commands
```sh
npm install
npm run check
npm test
npm run validate
pi -e ./src/index.ts
```
Manual smoke after `pi -e`:
1. Create temp existing text file.
2. Invoke `hashline_read`.
3. Build patch with `@@ @@` and ` HASH│...` / `-HASH│...` / `+HASH│...`.
4. Invoke `hashline_patch`.
5. Confirm stdout is new full hashline output and file content changed.
6. Try stale and ambiguous fixtures; confirm file unchanged.

## Files to Modify
- `package.json` - package metadata, Pi extension manifest, scripts, deps.
- `tsconfig.json` - strict TypeScript config.
- `vitest.config.ts` - test runner config.
- `README.md` - quick usage and validation.
- `docs/patch-format.md` - protocol docs.
- `src/index.ts` - extension factory/tool registration.
- `src/api.ts` - pure API exports.
- `src/hash.ts` - stable 4-char content hash.
- `src/text-lines.ts` - logical line parse/serialize/newline state.
- `src/read-format.ts` - `HASH│content` render/parse.
- `src/patch-format.ts` - patch parser and validation.
- `src/apply.ts` - hunk matching and transactional in-memory apply.
- `src/errors.ts` - named error classes/codes.
- `src/fs-text.ts` - safe text file read/write helpers.
- `src/tools/hashline-read.ts` - Pi read tool.
- `src/tools/hashline-patch.ts` - Pi patch tool.
- `test/*.test.ts` - unit/integration coverage.

## New Files
- All files above are new; repo is fresh.

## Dependencies
- Task 1 before all TypeScript/test work.
- Tasks 3-5 before patch parser/apply.
- Task 6 depends on Tasks 3 and 5.
- Task 8 depends on Tasks 3, 4, 6, 7.
- Tasks 10-12 depend on Tasks 8-9.
- Tests should be written before implementing each matching module.
- Docs depend on final choices in Tasks 3-11.

## Worker Instructions
1. Do not copy code from `pi-hashline-edit-pro`; use only caveats/behavior lessons.
2. Start by adding tests for each module, then implement until green.
3. Keep pure core independent from Pi runtime; Pi tools should be thin wrappers.
4. Do not add line numbers, duplicate counters, perfect hashing, or fuzzy fallback anywhere in patch matching.
5. Do not compare target content to patch content after hash match; match/apply by hashes only. Preserve actual target context content.
6. Keep failed patch application transactional: no writes on stale, ambiguous, invalid, or unsupported hunk.
7. Use `withFileMutationQueue` for every file mutation.
8. Throw named errors for tool failures; do not return `{ isError: true }` as success.
9. Keep tool output text pure hashline output on success; put metadata in `details`.
10. Use temp files under OS temp dir for manual validation, not project scratch files.

## Non-goals
- No diff generator.
- No multi-file patch apply in v1.
- No new-file creation; target file must already exist. Pure insertion into an existing empty file is supported.
- No binary/image read delegation.
- No override/removal of built-in Pi `read`, `edit`, or `write` tools.
- No snapshot IDs, duplicate counters, perfect hashes, fuzzy matching, or source line-number matching.
- No legacy `pi-hashline-edit-pro` compatibility fields or migration logic.

## Risks
- 4-char hashes can collide; this is accepted v1 behavior. Ambiguity catches repeated hash sequences, but rare wrong-delete collision remains possible by design.
- Mixed line endings will be normalized to first detected newline convention on write; document and test.
- Pagination metadata in `details` may be less visible to model than text; keep default limit high enough and fail loudly if exact output would exceed platform limits.
- `withFileMutationQueue` import/API may differ by installed Pi version; validate with `npm run check` and `pi -e ./src/index.ts`.
- Atomic write helper will not preserve owner/group/xattrs/ACLs and will not fsync temp/dir; document if needed.

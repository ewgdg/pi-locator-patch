# pi-locator-patch

Pi extension for token-efficient file edits using explicit locator patches.

The package registers `patch` for multi-file add/update/delete patch application. Patch input uses file operation sections directly; legacy `*** Begin Patch` / `*** End Patch` boundaries are accepted only as a matching outer pair. Only `profile: "hash"` exposes the hash-line reader as `read`; otherwise `read_hash` stays hidden and built-in `read` stays active.

Core design: keep patches short while staying exact. Use concise locators and ` ...` / `-...` to skip or replace large unchanged ranges. Ambiguous or stale hunks fail instead of guessing.

On session start, the extension removes mutable built-in tools (`edit`, `write`), `read_hash`, and old locator tool names. Built-in `read` remains active unless `profile: "hash"` is enabled; then hash-line `read` replaces it.

## Profiles

Profiles control session defaults and read registration. `classic` keeps built-in `read` and exact/status patch defaults. `smart` keeps built-in `read` and makes unified-diff selector text smart by default. `hash` replaces built-in `read` with hash-line `read` and uses hash/hash patch defaults.

Enable in `~/.pi/agent/extensions/pi-locator-patch/config.json`:

```json
{
  "profile": "smart"
}
```

Quick switch for testing:

```bash
PI_LOCATOR_PATCH_PROFILE=smart pi   # force smart patch defaults
PI_LOCATOR_PATCH_PROFILE=hash pi    # force hash-line read and hash patch defaults
```

## `patch`

`patch` accepts file-operation patch text. Provide exactly one of `patch` or `patch_file`; `patch_file` and file paths inside the patch resolve from the tool cwd. Prefer concise, unique locators over long copied context.

```ts
{
  patch?: string;
  patch_file?: string;
  dry_run?: boolean;
  receipt?: "status" | "hash";
}
```

Configured `profile` sets patch defaults. Classic profile is markerful: it parses explicit locator markers (`:`, `^`, `*`, `$`, `?`, `~`, and hash `#` when hash receipt is enabled). Smart and hash profiles keep unified-diff operators: context rows start with a space, delete rows start with `-`, and only the selector text after the operator changes meaning. `receipt` overrides the configured profile receipt default for one call.

```diff
*** Add File: new.txt
+literal new file line
*** Update File: existing.txt
@@
 :exact context text
-*needle to delete by containment
+literal inserted line
@@ @120...140
 :start context text
 ...
+literal insertion after skipped context
 :end context text
*** Delete File: old.txt
```

### File operations

- `*** Add File: path` creates a new UTF-8 text file. Body rows must start with `+`; text after `+` is literal file content.
- `*** Update File: path` applies locator hunks to an existing UTF-8 text file.
- `*** Delete File: path` hard-deletes an existing regular text file. Delete sections have no body.

Multiple operations may target the same path. File operations run in authored order, so a later `*** Update File` section can match output created by an earlier section.

### Update hunks

Hunk headers:

- `@@` — search whole file.
- `@@ @<line>` — search at or after 1-based line.
- `@@ @<start>...<end>` — require resolved match span inside inclusive line range.

Rows inside update hunks:

- ` <locator>` — context line; used only for matching/anchoring.
- `-<locator>` — delete matched line.
- `+<content>` — insert literal line content.

Profile decides how selector text after the unified-diff operator is parsed. Classic profile is markerful and preserves unified-diff exact fallback (` text` / `-text`; bare exact context is invalid). Smart profile parses context/delete selector text as smart text. Hash profile parses context/delete selector text as hashes.

Locators:

- `:<text>` exact line text, e.g. ` :const x = 1;`
- `^<prefix>` line starts with prefix.
- `*<needle>` line contains text.
- `$<suffix>` line ends with suffix.
- `?{...}` combined JSON locator with `prefix`, `contains`, and/or `suffix`.
- `~<text>` opt-in smart text locator for context/delete rows.
- `...` range between surrounding matchers: ` ...` preserves, `-...` deletes.

Hash prefix locator `#<hash>` is enabled by `receipt: "hash"`. Configured `profile: "hash"` uses hash selectors after unified-diff operators instead: ` <hash>` for context and `-<hash>` for delete. Hashes are 1 to 4 base64url characters, with visible width chosen from line entropy. In default classic/status mode, `#` is not a locator marker; ` #define X` and `-#old` are unified-diff exact text rows. Use text locators when content predicates are clearer.
In classic profile, context locator rows may start with a literal space, or omit it before an explicit locator marker. For example, `^prefix` is equivalent to ` ^prefix`, `~target text` is equivalent to ` ~target text`, and `...` is equivalent to ` ...`. Use ` :` or `:` for exact text, including indented lines.

Classic profile explicit smart locators use ` ~target text` or `~target text` for context, `-~old text` for delete. Configured `profile: "smart"` makes unified-diff context/delete selector text smart; marker-looking text like ` ~target` is literal smart context selector text. `+~literal` inserts literal `~literal`. For each candidate hunk span, each smart row independently resolves to its strongest line-level match: exact, prefix/suffix, contains, then whitespace token-subsequence. Prefix and suffix have the same rank, but audit records the actual resolved kind. The whole hunk applies only when dominance leaves one non-dominated candidate; tradeoffs or equal score vectors are ambiguous, and zero candidates are stale. Broad prefix/suffix/contains matches require useful nonblank alphanumeric text; token-subsequence also needs at least two query tokens.

Malformed unified-diff rows are tolerated per matcher in classic exact mode. Locator matching runs once; zero matches are stale and multiple matches are ambiguous. Within one `*** Update File` section, later hunks may match or span only untouched original target lines. They cannot anchor on or range across lines inserted or already used by earlier hunks in the same section. Use a later `*** Update File` section when a second edit must depend on prior output.

### Output and failure behavior

With `profile: "hash"` or `receipt: "hash"`, success output is a compact hash-only receipt. Context rows show only hashes, inserted rows show `+HASH`, and deleted rows are omitted:

```text
*** Add File: new.txt
@@ add file @@
+9Nrk
*** Update File: existing.txt
@@ matched line 12 @@
 Abc1
+Z9xQ
*** Delete File: old.txt
Deleted file
```

If this receipt is too large, output falls back to compact status rows. Dry runs return the same receipt shape without writing. With status receipt, success output is compact status rows only.

File operations apply sequentially. If a later non-dry operation fails, earlier successful operations stay applied, later operations are skipped, and the error includes a **retry patch** file copied from the authored failed operation plus skipped later operations. Agents can later reuse the retry patch file to avoid re-emitting large output tokens.

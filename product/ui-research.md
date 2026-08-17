# UI research — Gemini Notebook (top-down)

> **Method:** Top-down decomposition of the real product from screenshots of a
> live account (August 2026): application shell first, then each screen, then
> each panel and its interactions. One section per screen/state; every section
> ends with implications for the clone. Deltas against `product/scope.md` are
> collected at the bottom.
>
> **Captured so far:** notebook workspace (empty notebook), add-sources
> dialog.
> **Wanted next:** notebook library/home, chat with citations (incl.
> hover/preview state), source viewer with a highlighted cited passage, a
> Studio artifact configuration + result (e.g. Report or Audio Overview),
> notes list/editor, share dialog, settings.

---

## 1. Application shell

Observed chrome (top bar, left to right):

- App logo + **notebook title** ("Untitled notebook") — title sits in the top
  bar, not inside a panel; presumably click-to-rename.
- Right-hand actions: **Create notebook**, **Copy** (duplicate notebook),
  **Analytics**, **Share**, **Settings**, Google app grid, account avatar.
- No visible global navigation/sidebar on the workspace screen — the library
  is reached via logo (assumed; to verify).
- Footer disclaimer under the chat: *"Gemini Notebook can be inaccurate;
  please double check its responses."*

**Implications for the clone**

- The workspace is a full-screen, notebook-scoped view; navigation model is
  library ⇄ workspace, nothing deeper.
- "Create notebook" being available from inside a notebook means creation is
  cheap/instant (no wizard) — matches CF-01.
- Copy/duplicate-notebook exists in the real product but is not in our scope
  doc (see Deltas).

## 2. Screen: Notebook workspace

Three-column layout: **Sources (left) — Chat (center) — Studio (right)**.
Left and right panels have collapse toggles in their headers; chat is the
fixed center. Chat panel has its own overflow menu (⋮).

### 2.1 Sources panel (left)

Empty state observed:

- Primary action: **"+ Add sources"** button (full width).
- Below it, an embedded **web-source search box**: placeholder "Search the web
  for new sources", with two dropdown chips — **"Web"** (source type/scope
  selector) and **"Fast Research"** (research mode selector; the dropdown
  arrow implies at least one alternative mode, presumably Deep Research) —
  plus a search submit button. This is CF-19 surfaced directly in the panel,
  not hidden behind a dialog.
- Empty-state copy: "Saved sources will appear here … **Drop files here** or
  add a source" → the panel is a drag-and-drop target for uploads.

**Implications**

- Source list, per-source checkboxes (CF-05) and the add flow all live in this
  one panel; it doubles as dropzone.
- Web source discovery is a first-class entry point even for an empty
  notebook — but for our Phase 1 the search box can be a stub/hidden.

### 2.2 Chat panel (center)

Observed with zero sources:

- Chat is usable before any source exists; the assistant sends a rich
  **onboarding message** (markdown: bold, numbered list) explaining the three
  panels, and offers to find sources via web search.
- User messages render right-aligned in a bubble; assistant messages render
  as left-aligned markdown, no bubble.
- Per-assistant-message actions: **"Save to note"** (pin icon + label),
  copy, thumbs up, thumbs down (SF-14 feedback directly on messages).
- **Suggested prompt chips** below the response ("Let's start a deep research
  search on a topic", "Help me find some initial sources using a web search",
  "How do I turn my documents into a podcast?").
- Input row: free-text field ("Start typing…"), a **"0 sources" counter**
  (live count of selected sources that will ground the next request), send
  button.

**Implications**

- The "N sources" counter next to the input is the visible contract of CF-05:
  every message shows how many sources it will be grounded in. Cheap to build,
  high signature value — include in MVP.
- "Save to note" on every assistant message is the CF-10 bridge; it belongs in
  the message action row from the start.
- Onboarding/zero-source chat behavior means chat must gracefully handle an
  empty retrieval set (NF-01 "clear behaviour when evidence cannot be found").
- Suggested prompt chips are dynamic (context-aware); a static set is fine for
  the prototype.

### 2.3 Studio panel (right)

Empty state observed:

- A grid of **artifact generator tiles**, each with icon, label, and a chevron
  (chevron ⇒ opens a configuration step rather than generating immediately):
  Audio Overview, Slide Deck (**BETA** badge), Video Overview, Mind Map,
  Reports, Flashcards, Quiz, Infographic (**BETA** badge), **Data Table**.
- Empty-state copy: "**Studio output will be saved here.** After adding
  sources, click to add Audio Overview, Study Guide, Mind Map, and more!" —
  generated artifacts appear as a list in this same panel, below/replacing the
  tile grid.
- Bottom of panel: **"Add note"** button → notes and generated artifacts share
  the Studio output list (notes are a kind of studio item in the UI, even
  though the domain model separates them).

**Implications**

- Confirms the scope doc's "generic artifact system" (§3): one tile grid, one
  output list, per-type configuration behind the chevron.
- For Phase 1 the panel can ship with only Reports + notes; tiles for
  unimplemented types should simply be absent (not disabled), keeping the
  layout honest.
- BETA badges on tiles are a nice, cheap pattern for our own staged rollout.

## 3. Dialog: Add sources

Opened via "+ Add sources" (and presumably via the "add a source" link and
file-drop). Renders as a **centered overlay above the chat column** — the
Sources and Studio panels stay visible; dismissed with an X.

Structure, top to bottom:

- **Marketing-style headline**: "Create Audio and Video Overviews from
  *websites*" — the last word is gradient-styled and presumably rotates
  through source types. Notable: the dialog sells an *outcome* (artifacts),
  not the mechanical "upload a file".
- **Web search box** — the identical component from the Sources panel
  (placeholder, Web dropdown, Fast Research dropdown, submit). Search-the-web
  is the *first* option in the add flow, above uploading.
- **Drop zone** (large, dashed border): "or drop your files — pdf, images,
  docs, audio, *and more*" ("and more" is a link, presumably to a full
  format list).
- **Four entry-point buttons** inside the drop zone:
  | Button | Maps to |
  | --- | --- |
  | Upload files | CF-02 file upload (pdf, images, docs, audio, …) |
  | Websites (link icon + YouTube icon) | CF-02 website URL + YouTube URL — one shared entry point |
  | Drive | CF-02 Google Docs/Slides/Sheets import |
  | Copied text | CF-02 pasted text |

**Implications**

- The whole add flow is one dialog with four entry points + drag-and-drop —
  no multi-step wizard. For Phase 1 we need exactly three of them: Upload
  files, Websites (URL only, no YouTube), Copied text; Drive is
  integration-specific (SF-04) and can be omitted.
- Website and YouTube ingestion share one entry point — the URL is parsed and
  routed by type. Our URL intake should be designed the same way even if
  YouTube lands later.
- The drop zone lives inside the dialog *and* the Sources panel accepts drops
  directly — the upload path must be a shared component/handler.
- The rotating-headline framing is optional polish; skip for prototype.

---

## Deltas vs. `product/scope.md`

| # | Observation | Scope doc status |
| - | --- | --- |
| D-1 | **Data Table** is a first-class Studio artifact tile | Not listed in §3 / CF list (closest: CF-22 file generation) |
| D-2 | **Copy (duplicate) notebook** action in the top bar | Not in CF-01 capability table |
| D-3 | Chat is fully usable with **zero sources** (onboarding + web-search offers) | Scope implies chat over existing sources only |
| D-4 | Web source discovery (Fast Research) is embedded in the Sources panel, always visible | CF-19 describes the flow but not its prominence |
| D-5 | Notes and artifacts share one "Studio output" list in the UI | Scope models them separately (correct for domain; UI merges them) |
| D-6 | Analytics is surfaced as a top-level button on an ordinary notebook | SF-13 marks analytics optional/shared-notebooks-only |

# Product scope

> **Status:** Draft, adopted 2026-08-17.
> **Provenance:** Drafted with ChatGPT against the August 2026 Gemini Notebook
> feature set, reviewed and adopted by the project owner. Treat the phase plan
> (§8) as the working roadmap; individual CF/SF items are re-validated when a
> session picks them up.

# Gemini Notebook / NotebookLM Clone — Product Scope

## 1. Purpose

The product is an AI-assisted research workspace in which users create **notebooks**, populate them with trusted source material, and use AI to analyse, query, transform, and learn from those sources.

The defining product principle is:

> **AI output should remain grounded in the notebook's selected source material and provide traceable provenance back to those sources.**

The target described here is based on Google's current Gemini Notebook product as of August 2026. The product has expanded substantially beyond the original "chat with your documents" version of NotebookLM, including web research, multimedia generation, and agentic code execution.

---

# 2. Core Functional Features

These capabilities constitute the central product experience. Without them, the application would no longer substantially resemble NotebookLM.

## CF-01 — Notebook Management

| Capability           | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| Create notebook      | Create an isolated workspace for a project or topic                          |
| Rename notebook      | Change notebook title                                                        |
| Delete notebook      | Permanently remove notebook and associated data                              |
| Open notebook        | Resume work on an existing notebook                                          |
| Notebook isolation   | Sources and context from one notebook do not automatically leak into another |
| Notebook persistence | Sources, notes, generated artifacts and configuration survive sessions       |

Each Gemini Notebook notebook is treated as an independent source collection.

**MVP:** Required.

---

## CF-02 — Source Ingestion

Users can populate a notebook with external information.

### Supported source categories

| Source               | Processing                                   |
| -------------------- | -------------------------------------------- |
| PDF                  | Extract text, structure and available images |
| DOCX                 | Extract document content                     |
| TXT                  | Plain-text ingestion                         |
| Markdown             | Structured text ingestion                    |
| CSV                  | Structured/tabular ingestion                 |
| PowerPoint           | Extract slides/content                       |
| EPUB                 | Extract publication text                     |
| Images               | Image understanding / visual extraction      |
| Pasted text          | Create source directly                       |
| Website URL          | Fetch and extract page content               |
| YouTube URL          | Import available transcript                  |
| Audio file           | Transcribe speech and create textual source  |
| Google Docs          | Import document                              |
| Google Slides        | Import presentation                          |
| Google Sheets        | Import spreadsheet                           |
| Gemini conversations | Import conversation as contextual material   |

The current product supports these source classes and allows uploaded files of up to 200 MB or approximately 500,000 words per source.

**MVP recommendation:** Start with PDF, DOCX, TXT/Markdown, pasted text and web URLs.

Audio, video, Office formats and external storage integrations can follow.

---

## CF-03 — Source Processing and Knowledge Indexing

Every imported source must be converted into a representation suitable for retrieval and reasoning.

Required capabilities:

* text extraction
* metadata extraction
* document segmentation/chunking
* semantic indexing
* full-text retrieval
* source identity preservation
* page/section/location tracking
* image association where applicable
* source status: processing / ready / failed
* reprocessing after source changes

This subsystem is effectively the knowledge layer underneath the notebook.

**MVP:** Required.

---

## CF-04 — Source Viewer

Users must be able to inspect their source material from inside the application.

Capabilities should include:

* open source
* view extracted content
* identify source title/type
* navigate through the source
* navigate directly to a cited passage
* show source summary
* remove source from notebook

Gemini Notebook automatically generates a Source Guide containing a source summary.

**MVP:** Required.

---

## CF-05 — Source Selection / Context Control

Users can decide which notebook sources participate in an AI request.

Example:

```text
☑ Product requirements.pdf
☑ User research.docx
☐ Competitor notes.md
☑ Pricing study.pdf
```

The retrieval system must restrict the generated response to the selected subset.

Gemini Notebook exposes source selection directly in its source panel.

**MVP:** Required.

---

## CF-06 — Grounded AI Chat

Users can ask natural-language questions about their notebook.

Typical operations include:

* ask factual questions
* summarise information
* compare sources
* identify contradictions
* synthesise information across sources
* extract structured information
* explain concepts
* brainstorm based on the material
* issue instructions to the model
* continue multi-turn conversations

Responses should be streamed to the UI.

The standard Gemini Notebook chat is explicitly grounded in the selected notebook sources.

**MVP:** Required.

---

## CF-07 — Inline Citations

This is one of the product's defining capabilities.

AI claims should include citations connecting generated statements with their source evidence.

A citation should contain:

* source identifier
* source title
* exact or approximate location
* supporting excerpt
* navigation target

Interaction should support:

1. Hover/select citation.
2. Preview supporting passage.
3. Open source.
4. Navigate to the relevant location.

Gemini Notebook uses text, quotations and images from sources as citations and lets users navigate directly from a citation to its context.

**MVP:** Critical.

A generic RAG chatbot without this feature would not be a convincing NotebookLM clone.

---

## CF-08 — Conversation State

Chat should maintain notebook-specific conversational context.

Capabilities:

* persistent conversation history
* multi-turn context
* clear/reset conversation
* stop an in-progress generation
* regenerate/retry response
* retain references to sources used during the conversation

Gemini Notebook retains chat history privately for the user and provides explicit deletion of that history.

**MVP:** Required.

---

## CF-09 — Chat Configuration

Users can influence how the assistant responds.

Current Notebook functionality includes:

| Setting                 | Examples                        |
| ----------------------- | ------------------------------- |
| Conversational mode     | Default, Learning Guide, Custom |
| Custom role/instruction | "Respond as a researcher", etc. |
| Response length         | Shorter, Default, Longer        |

**MVP:** Basic system/custom instructions.

**Full parity:** Preset modes and response-length controls.

---

## CF-10 — Notes

A notebook contains user-created notes in addition to imported sources.

Capabilities:

* create note
* edit note
* delete note
* save AI response as note
* preserve citations in saved AI responses
* convert note into a notebook source

Gemini Notebook explicitly supports both saving chat responses as notes and converting notes into sources.

**MVP:** Required.

---

# 3. Core Generated Artifacts / Studio

Gemini Notebook groups AI transformations of notebook material under its **Studio** concept.

The clone should implement a generic artifact system rather than hard-code every artifact as a completely independent workflow.

A generated artifact should generally have:

* artifact type
* title
* source selection
* generation prompt/settings
* generation status
* generated content/file
* created timestamp
* rename
* delete
* regenerate
* download where applicable

Generation should occur asynchronously so the user can continue working.

---

## CF-11 — Reports

Generate structured long-form material from sources.

Examples include:

* general report
* briefing document
* FAQ
* study guide
* custom report
* AI-suggested report type

Gemini Notebook exposes FAQ, Study Guide, Briefing Document and custom/suggested reports.

**MVP:** At least generic report generation.

---

## CF-12 — Audio Overview

Generate spoken summaries from source material.

Current Gemini Notebook supports:

| Mode      | Behaviour                               |
| --------- | --------------------------------------- |
| Deep Dive | Two-host detailed discussion            |
| Brief     | Short single-speaker summary            |
| Critique  | Two hosts critically evaluate material  |
| Debate    | Two hosts explore opposing perspectives |

Users can additionally specify:

* language
* length
* focus/custom prompt
* playback speed

Audio can be played while the rest of the notebook remains usable.

### Interactive Audio

The current product also supports joining an Audio Overview through voice and asking the synthetic hosts questions grounded in notebook sources.

**Clone recommendation:**

* **MVP:** Single-speaker generated audio summary.
* **Parity:** Two-speaker podcast.
* **Advanced:** Interactive real-time audio conversation.

---

## CF-13 — Mind Maps

Generate a graphical representation of concepts and relationships found across notebook sources.

Capabilities:

* hierarchical concept graph
* expand/collapse nodes
* pan/zoom
* select node
* ask chat questions about selected node
* download map

Gemini Notebook provides all of these interactions.

**Priority:** Post-MVP.

---

## CF-14 — Flashcards

Generate interactive study cards from notebook material.

Capabilities:

* question/answer cards
* difficulty configuration
* custom generation prompt
* navigate cards
* reveal answer
* regenerate

Gemini Notebook generates flashcards directly from notebook sources and supports configurable difficulty.

**Priority:** Post-MVP.

---

## CF-15 — Quizzes

Generate interactive assessments grounded in notebook content.

Capabilities:

* generated questions
* answer options
* user answer
* correctness feedback
* explanation
* difficulty
* custom generation instructions

**Priority:** Post-MVP.

---

## CF-16 — Infographics

Convert notebook information into a generated visual summary.

Configuration includes:

* concise / standard / detailed
* portrait / landscape / square
* visual style
* output language
* custom prompt
* visual focus
* colour/style instructions

Generated infographics can be downloaded as PNG files.

**Priority:** Advanced.

---

## CF-17 — Slide Deck Generation

Generate a presentation from notebook sources.

Expected capabilities:

* generate deck
* configure generation
* preview slides
* edit/regenerate output
* present from application
* export/download

Slide Deck is currently a first-class Studio artifact in Gemini Notebook.

**Priority:** Advanced.

---

## CF-18 — Video Overview

Generate narrated visual summaries of notebook sources.

Gemini Notebook currently offers:

| Mode      | Description                               |
| --------- | ----------------------------------------- |
| Explainer | Structured visual explanation             |
| Cinematic | Storytelling-oriented visual presentation |
| Short     | Approximately 60-second summary          |

Configuration includes:

* output language
* visual style
* focus/topic prompt
* custom visual instructions

Generated video supports playback controls, download and sharing.

**Priority:** Advanced.

The infrastructure and generation cost make this a poor MVP feature.

---

# 4. Research Features

## CF-19 — Web Source Discovery

Users can describe what they are researching instead of supplying every source manually.

The system searches the web and proposes relevant sources.

Workflow:

```text
Research query
      ↓
Web search
      ↓
Candidate sources
      ↓
AI relevance summaries
      ↓
User selects sources
      ↓
Sources imported into notebook
```

The current product calls its lightweight version **Fast Research**.

**Priority:** High, but not required for first MVP.

---

## CF-20 — Deep Research

An agent can perform multi-step web research and produce:

* research report
* source list
* citations
* candidate source imports

Users inspect the generated research and choose what becomes part of their notebook.

**Priority:** Advanced.

---

# 5. Advanced Agentic Capabilities

These capabilities belong to the 2026 Gemini Notebook rather than the original NotebookLM value proposition.

## CF-21 — Code Execution

The AI can use an isolated cloud execution environment to run generated code against source material.

Potential operations include:

* calculations
* statistical analysis
* dataset transformation
* chart generation
* structured extraction
* data cleaning
* programmatic document processing

Google now attaches a secure cloud computer to supported Gemini Notebook tiers for this purpose.

**Priority:** Advanced / optional.

---

## CF-22 — General Artifact/File Generation

Current premium Gemini Notebook can generate downloadable:

* PNG/SVG charts
* PDF
* DOCX
* Markdown
* plain text
* images
* CSV
* JSON
* XLSX
* PPTX

It can also revise generated artifacts as subsequent versions.

**Priority:** Advanced.

---

# 6. Supporting Functional Features

These features support the primary workflow but do not define the central source-grounded research experience.

## SF-01 — Authentication and Account Management

* sign up
* log in/out
* password/session management
* optional SSO/OAuth
* account deletion
* subscription/plan association

---

## SF-02 — Notebook Library / Home Screen

Users need a central workspace from which they can:

* see notebooks
* open notebook
* create notebook
* delete notebook
* identify owned/shared notebooks
* access recently used notebooks

**MVP:** Required.

---

## SF-03 — Source Organisation

For notebooks containing many sources:

* automatic grouping
* labels/categories
* rename category
* move source between categories
* remove category

Gemini Notebook automatically categorises notebooks with five or more sources and allows manual adjustment.

**Priority:** Post-MVP.

---

## SF-04 — Cloud Source Synchronisation

External sources such as Google Drive documents can remain linked and be refreshed after the original changes.

Requirements:

* external source ID
* last synchronised timestamp
* automatic/manual refresh
* inaccessible-source state
* graceful handling of revoked permission

Google Drive sources in Gemini Notebook can automatically synchronise when the source document changes.

**Priority:** Integration-specific.

---

## SF-05 — Sharing and Collaboration

Notebook access model:

| Role   | Suggested rights                    |
| ------ | ----------------------------------- |
| Owner  | Full control                        |
| Editor | Change sources, notes and artifacts |
| Viewer | Read/query shared notebook          |

Capabilities:

* invite another user
* revoke access
* public/private state
* share link
* artifact-specific link
* read-only access
* public Chat View

Gemini Notebook supports public notebook links and distinguishes owner/editor access from viewers.

**Priority:** Post-MVP.

---

## SF-06 — Public Notebooks

Users may publish a notebook that other users can:

* open
* inspect
* query through chat
* browse sources
* consume generated artifacts

**Priority:** Optional.

---

## SF-07 — Featured / Curated Notebooks

A discovery surface can expose prebuilt notebooks curated by the application or partners.

**Priority:** Out of initial scope.

---

## SF-08 — Artifact Sharing and Download

Where appropriate, generated artifacts should support:

* download
* copy link
* share with notebook members
* public link
* revoke link
* rename
* delete

Audio, video, infographics and mind maps currently expose various combinations of these capabilities.

---

## SF-09 — Background Generation Jobs

Long-running artifact generation must not block the application.

A job can be:

```text
Queued
→ Processing
→ Completed

or

Queued
→ Processing
→ Failed
```

Users should be able to leave the current view while audio, video, reports or other artifacts generate.

Google explicitly performs Audio, Video and Infographic generation in the background.

**MVP:** Required once asynchronous artifact generation exists.

---

## SF-10 — Language Configuration

Users can configure output language independently of source language.

This affects:

* chat
* reports
* audio
* video
* visual artifacts
* study material

Gemini Notebook supports multilingual output, including Audio Overviews in more than 80 languages.

**Priority:** International product: High.

---

## SF-11 — Usage Limits and Quotas

Limits may apply to:

* notebooks per user
* sources per notebook
* source size
* chat messages
* artifact generations
* audio generations
* video generations
* research jobs
* model usage

These can vary by subscription tier.

For reference, Gemini Notebook currently applies different limits according to account tier.

**MVP:** Required for operational cost control even without subscriptions.

---

## SF-12 — Subscription / Feature Entitlements

Potential plans:

```text
Free
├── Base notebooks
├── Limited sources
├── Limited chats
└── Limited generations

Pro
├── Higher quotas
├── Advanced models
├── Research
├── Code execution
└── Advanced artifact generation
```

**Priority:** Required only if commercialisation is in scope.

---

## SF-13 — Usage Analytics

Owners of shared/public notebooks may see:

* viewers
* notebook usage
* interaction counts
* popular content
* aggregate usage trends

Gemini Notebook offers analytics for qualifying shared notebooks.

**Priority:** Optional.

---

## SF-14 — Feedback

Users should be able to rate:

* chat responses
* generated mind maps
* audio
* video
* visual artifacts

Possible controls:

```text
👍 Useful
👎 Incorrect / irrelevant / unsafe
```

Feedback should attach generation context where privacy policy permits.

Google uses explicit thumbs-up/thumbs-down mechanisms across multiple Notebook artifact types.

---

# 7. Non-Functional Requirements

## NF-01 — Grounding and Provenance

The system must strongly prefer notebook evidence over unsupported model knowledge.

Requirements:

* retrieval constrained to selected sources
* claims traceable to source passages
* citation metadata preserved throughout generation
* source selection respected
* no fabricated citations
* clear behaviour when evidence cannot be found

For a NotebookLM clone, this should be considered a **primary quality metric**, rather than a secondary feature.

---

## NF-02 — AI Accuracy

Generated output must minimise:

* hallucinated claims
* incorrect attribution
* fabricated quotations
* citation mismatches
* misleading synthesis

Automated evaluations should test both answer correctness and citation correctness separately.

---

## NF-03 — Response Latency

Suggested targets:

| Operation                     |            Target |
| ----------------------------- | ----------------: |
| UI interaction                | <100 ms perceived |
| Chat starts streaming         |            <2–4 s |
| Citation/source opening       |           <500 ms |
| Search within indexed sources |              <1 s |
| Basic source ingestion        |       progressive |
| Heavy artifact generation     |      asynchronous |

Heavy generation should favour asynchronous jobs over blocking requests.

---

## NF-04 — Scalability

The architecture should scale independently across:

* file ingestion
* document parsing
* embedding/index generation
* retrieval
* chat inference
* artifact generation
* transcription
* text-to-speech
* image/video generation

Worker-based asynchronous processing is preferable for ingestion and generated artifacts.

---

## NF-05 — Reliability

Requirements:

* ingestion retry
* generation retry
* recoverable jobs
* idempotent processing
* persistent job state
* graceful model/API failure
* timeout handling
* partial failure handling
* corrupted-source isolation

A failure processing one source must not corrupt the notebook.

---

## NF-06 — Data Durability

Persist:

* notebooks
* sources
* source metadata
* extracted representations
* notes
* chat history
* artifacts
* citation mappings
* user preferences
* access permissions

Backups and restoration procedures should exist for persistent user data.

---

## NF-07 — Security

Minimum controls:

* TLS in transit
* encryption at rest
* isolated user/tenant data
* authenticated file access
* signed/private artifact URLs
* role-based access control
* CSRF/XSS protections
* upload validation
* malware scanning
* rate limiting
* secure secrets management

---

## NF-08 — Privacy

The product handles potentially sensitive private documents.

Requirements:

* explicit privacy policy
* clear model-provider data policy
* user-controlled deletion
* account deletion
* source deletion
* data-retention policy
* no model training on private user content by default
* transparent subprocessors
* private notebooks by default

Google similarly treats notebook sources, outputs and chat history as the notebook's knowledge base and states that Notebook content is not directly used to train foundational models unless users explicitly provide feedback.

---

## NF-09 — GDPR / Regulatory Compliance

For an EU-facing product:

* GDPR lawful processing basis
* Data Processing Agreements
* right of access
* right of deletion
* data portability where applicable
* retention controls
* subprocessor transparency
* international transfer safeguards
* audit trail for access/permission changes where appropriate

---

## NF-10 — Copyright and Content Rights

Users may import copyrighted content.

The product should therefore provide:

* rights acknowledgement during import
* abuse reporting
* takedown process
* restricted public sharing where required
* moderation for publicly distributed notebooks

Google explicitly warns users against sharing copyrighted source material without appropriate rights.

---

## NF-11 — Accessibility

Target:

**WCAG 2.2 AA**

Including:

* full keyboard navigation
* screen-reader support
* semantic controls
* focus management
* adequate contrast
* transcript availability for audio/video
* non-visual alternatives to diagrams where practical

---

## NF-12 — Responsive Design

At minimum:

* modern desktop browsers
* tablet-compatible responsive interface

Native mobile applications should be considered a separate scope item.

---

## NF-13 — Internationalisation

Architecture should separate content from interface strings and support:

* UTF-8 throughout
* locale-aware formatting
* translated UI
* independent source/output languages
* RTL layouts where applicable

---

## NF-14 — Observability

Operational monitoring should cover:

* request latency
* LLM latency
* model failures
* retrieval quality
* token consumption
* generation costs
* ingestion failures
* queue depth
* worker health
* storage usage
* artifact failures
* citation coverage

Tracing an AI request through:

```text
User prompt
→ retrieval
→ selected chunks
→ model invocation
→ response
→ citations
```

is particularly important for debugging incorrect AI answers.

---

## NF-15 — Cost Control

AI and media workloads require explicit safeguards.

Include:

* per-user quotas
* token budgets
* model routing
* caching
* generation limits
* maximum file size
* maximum source count
* background-job concurrency limits
* storage quotas
* rate limiting

Video and interactive voice generation should be separately budgeted because their cost profile differs dramatically from text RAG.

---

## NF-16 — Provider Abstraction

Where practical, product logic should not depend directly on one LLM vendor.

Separate interfaces should exist for:

* embeddings
* LLM inference
* speech recognition
* speech synthesis
* image generation
* video generation
* reranking
* web search

This reduces vendor lock-in and allows cheaper or stronger models to be substituted by workload.

---

## NF-17 — Safety

Generated output and public content should be subject to:

* model safety controls
* upload abuse prevention
* prompt injection mitigation
* malicious-document isolation
* public-content moderation
* abuse reporting
* appropriate restrictions on executable code

Prompt injection from imported webpages and documents is particularly relevant because source material is inherently untrusted input.

---

# 8. Recommended Product Scope

A full 2026 Gemini Notebook clone is a substantial product. It combines several products that could independently constitute SaaS offerings.

A sensible implementation boundary would therefore be:

| Phase                                  | Scope                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1 — Core MVP**                 | Notebooks, PDF/doc/text/web sources, source processing, grounded chat, citations, source viewer, source selection, chat history, notes |
| **Phase 2 — NotebookLM Experience**    | Reports, Audio Overview, source discovery, improved notes, labels, sharing, multilingual output                                        |
| **Phase 3 — Learning & Visual Studio** | Mind maps, flashcards, quizzes, infographics, slide decks                                                                              |
| **Phase 4 — Multimedia**               | Advanced podcast formats, interactive audio, Video Overviews                                                                           |
| **Phase 5 — Agentic Notebook**         | Deep Research, code execution, charts, spreadsheets, arbitrary document/artifact creation                                              |

The **smallest product that genuinely captures NotebookLM rather than simply being another RAG chatbot is Phase 1**.

The feature combination that creates the characteristic NotebookLM experience is:

**Notebook → Sources → Retrieval → Grounded Chat → Inline Citations → Source Navigation → Notes**

Audio Overview is then the strongest differentiating feature to add once that foundation works.

---

# 9. Explicit Initial Out-of-Scope Candidates

Unless strict feature parity is required, the following should initially be excluded:

* native mobile apps
* Gemini ecosystem integration
* Google Search AI Mode integration
* public featured-notebook marketplace
* real-time collaborative editing
* Cinematic Video Overview
* interactive voice hosts
* arbitrary cloud code execution
* full Office document-generation suite
* advanced notebook analytics

These features substantially increase scope without improving the essential source-grounded research loop.

---

# 10. Core Product Model

The underlying domain model can be reduced approximately to:

```text
User
 └── Notebook
      ├── Sources
      │    ├── Original content
      │    ├── Parsed content
      │    ├── Chunks
      │    └── Retrieval index
      │
      ├── Conversations
      │    └── Messages
      │         └── Citations
      │
      ├── Notes
      │
      ├── Artifacts
      │    ├── Report
      │    ├── Audio
      │    ├── Video
      │    ├── Mind Map
      │    ├── Quiz
      │    ├── Flashcards
      │    ├── Infographic
      │    └── Slide Deck
      │
      └── Permissions
```

Conceptually, **everything revolves around the notebook's source corpus**. Chat, notes, research and Studio artifacts should all consume the same source/retrieval layer rather than creating separate knowledge systems.

That architectural property is more important to reproducing NotebookLM than copying its user interface.

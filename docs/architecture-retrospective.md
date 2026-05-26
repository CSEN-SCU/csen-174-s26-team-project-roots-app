# Part 1: Retrospective architecture note (5 pts)

Write a note at `docs/architecture-retrospective.md` that compares your W4 architecture to what you have built, classifies the tech debt you are carrying into code freeze, and explains the decisions that shifted along the way.

This is a modified ADR practice. ADRs are normally written at the time of the decision and kept as a living record. Most of your architectural decisions got made fast and undocumented during the prototype phase. The team is reverse-engineering a few of them now as a learning exercise.

## Required structure

- **Current-state architecture.** Current C4 context diagram and current C4 container diagram, both reflecting what is on `main` today (not the W4 plan, not where you hope to be by code freeze). Use any tool the team likes: Mermaid, draw.io, Excalidraw, Lucidchart, a Cursor-generated draft you correct, hand-drawn on paper or a tablet. Embed in the note as PNG, SVG, or Mermaid, or link from a `docs/architecture/` subfolder.
- **Decisions that shifted.** Pick 1 to 3 architectural decisions that changed between W4 and now. For each, write a short block in this shape:
  - **Context:** what forced the call (a constraint, a surprise, a deadline, red team feedback, a teammate's Friday-night fix).
  - **Decision:** what the team chose.
  - **Consequences:** what the team accepts by choosing it (operational complexity, vendor lock-in, a new dependency, a deferred problem).
  - **Classification:** which Fowler quadrant the resulting state lives in (deliberate vs inadvertent, prudent vs reckless), with one sentence on why.
- **Tech debt heading into code freeze.** A short list of debt items the team is carrying. Each item gets a Fowler quadrant classification and one sentence on whether the team will address it before code freeze or live with it through demo night.

One sentence on what the team would do differently with another sprint. This sentence feeds the W10 technical report.

- We would do most of the same things, besides shift our focus towards building up the architecture for a larger user base, rather than building up new features.

## Product vision (revisited)

Paste the W2 product vision statement. If anything has shifted (audience, problem, key differentiator, `POWERED BY` line), update the statement and add one or two sentences on what changed and why. If nothing has shifted, say so in one sentence.

## Part 1: Product Vision

**FOR** People who want to compile and share ideas with their friends on trips, projects, and routes to link between them, but find themselves stuck in inaction from "Doom-Saving."  
**WHO** struggle to bridge the gap between digital inspiration (Reels, TikToks) and real-world execution due to the friction of manual planning, research, and compilation of ideas.  
**THE** Roots App is a Context-Aware Personal Planner  
**THAT** automatically transforms saved social media content into actionable calendar events and step-by-step project roadmaps.  
**UNLIKE** traditional digital calendars or Save folders which act as static archives  
**OUR PRODUCT** proactively extracts hidden metadata, logistics, and instructional steps from video content to move the user to action sooner and more often.  
**POWERED BY** Multimodal Content Extraction that identifies locations, dates, and technical instructions from the combined analysis of video, audio, and captions.

Nothing in our product vision statement changed.

## W4 intended architecture

Link to the C4 context and container diagrams the team submitted in W4. One-paragraph summary of what the team planned to build.

Week 4 Architecture doc:  
<https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/blob/main/architecture/W4-Architecture.md>

In our original intended architecture, our team planned on having users interact with the "Roots" app through a minimal user interface, and for the Roots to handle most of the backend logic. Our ideal model would have had the user submit a link of a piece of content they want analyzed (specifically an Instagram reel, TikTok, YouTube short etc) and Roots would then return consumable data of pre-planned and optimized trips. On the backend, we intended for Roots to handle preprocessing of the submitted user links by verifying valid inputs and extracting metadata using respective company APIs, then processes the data using through an LLM to extract useful information such as locations, scheduling opportunities, and business hours.

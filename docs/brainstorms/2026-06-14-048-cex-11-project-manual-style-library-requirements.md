---
title: "CEX-11 Project Manual and Style Library Requirements"
date: 2026-06-14
source_modules:
  - TFR-10
status: completed
---

# CEX-11 Project Manual and Style Library Requirements

## Source Summary

TFR-10 asks for project visual manual, director manual, and style library
guidance to enter the prompt composer without cloning Toonflow prompt text.
guga-flow already has generation settings, visual/director manual fields, prompt
debug parts, and packaging/style-pack references; the remaining product gap is
Settings Center editing and explicit export evidence.

## Requirements

- R1. Settings Center must expose editable project-level visual manual and
  director manual fields.
- R2. Style pack/style library references must remain part of project generation
  settings and be visible from Settings Center.
- R3. Shot prompt composition must include project and Shot manual guidance with
  debug source trace.
- R4. Editor export job input/package metadata must carry generation settings
  including visual/director manual summaries and style-pack references.
- R5. The implementation must not hardcode Toonflow prompt templates.

## Acceptance Evidence

- AE1. Frontend tests render Settings Center project defaults with visual manual,
  director manual, and style pack fields.
- AE2. Existing prompt composer tests prove manual guidance appears in image and
  video prompt debug parts with project/shot source traces.
- AE3. Editor export tests assert project manual fields are present in queued
  export job input.
- AE4. Repository lint/tests/build pass.

## Scope Boundaries

- No separate art-style CRUD database in this slice.
- No provider-specific Toonflow prompt template migration.
- No asset-picker UI for style packs beyond the existing reference metadata
  fields.

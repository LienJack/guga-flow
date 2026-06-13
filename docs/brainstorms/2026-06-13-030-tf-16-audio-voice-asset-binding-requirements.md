---
date: 2026-06-13
topic: tf-16-audio-voice-asset-binding
status: completed
---

# TF-16 Audio And Voice Asset Binding Requirements

## Summary

Add first-class audio asset support so users can upload voice/music/audio files, bind them to Character, Shot, or Video nodes, and preserve those references in editor export manifests.

---

## Problem Frame

The current pipeline can describe narration, BGM, subtitles, and audio intent as generation/export metadata, but users cannot upload or bind real audio files to the story graph. That leaves character voice references and shot-level audio cues outside the durable canvas state and outside the editor handoff trace.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the roadmap input and should be reviewed before planning proceeds.*

- Audio upload should use the existing Asset Library and backend-owned storage path rather than a separate audio manager.
- Binding audio references to existing Character, Shot, and Video nodes is enough for this slice; adding a new AudioNode is deferred.
- Editor export only needs manifest-level audio trace in this slice; it does not need to mix, trim, or render audio.

---

## Actors

- A1. Producer: Uploads or selects audio files and binds them to production nodes.
- A2. Editor/export pipeline: Receives an editor package manifest that describes which audio assets belong with exported clips.

---

## Key Flows

- F1. Audio upload and preview
  - **Trigger:** A producer uploads an audio file from the Asset Library.
  - **Actors:** A1
  - **Steps:** The file is validated as uploadable audio, stored as a project Asset, listed with audio metadata, and previewable with browser audio controls.
  - **Outcome:** The audio Asset is available for project-scoped binding.
  - **Covered by:** R1, R2

- F2. Node audio binding
  - **Trigger:** A producer selects a Character, Shot, or Video node.
  - **Actors:** A1
  - **Steps:** The inspector shows bindable audio Assets, lets the producer attach or remove references, and persists the updated node data.
  - **Outcome:** Character voice references and Shot/Video audio references survive reload through normalized CanvasNode data.
  - **Covered by:** R3, R4

- F3. Export manifest handoff
  - **Trigger:** A producer queues an editor export from selected Video nodes.
  - **Actors:** A1, A2
  - **Steps:** The export builder resolves audio references from each selected Video node and its parent Shot node, then writes them into the timeline manifest.
  - **Outcome:** The editor package carries audio asset IDs and labels per clip without changing video clip packaging.
  - **Covered by:** R5, R6

---

## Requirements

**Audio assets**

- R1. The project Asset model must accept common audio uploads and classify them as audio assets.
- R2. The Asset Library must list and preview audio assets without treating them as text or generic metadata.

**Canvas bindings**

- R3. Character nodes must support project-scoped voice audio references.
- R4. Shot and Video nodes must support project-scoped audio references for narration, effects, or clip-specific audio cues.

**Editor export trace**

- R5. Editor export job input must include per-clip audio references resolved from selected Video nodes and their parent Shot nodes.
- R6. Generated timeline manifests must expose audio assets on audio tracks or equivalent timeline metadata so downstream editors can inspect the references.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given an `.mp3` upload, when it is saved through the Asset Library, it appears as an audio Asset and previews with audio controls.
- AE2. **Covers R3.** Given a Character node and an uploaded voice file, when the producer binds the file, the Character node persists the voice reference after reload.
- AE3. **Covers R4.** Given a Shot or Video node and an uploaded audio cue, when the producer binds the file, the node persists the audio reference after reload.
- AE4. **Covers R5, R6.** Given selected Video nodes with Shot/Video audio references, when an editor export is queued, the timeline manifest includes those audio asset references per clip.

---

## Success Criteria

- Producers can upload, preview, attach, detach, and persist audio references without leaving the existing canvas workflow.
- Editor export consumers can see which audio assets should accompany each exported clip.
- The implementation remains mock-first and does not require an audio generation provider or local DAW.

---

## Scope Boundaries

- No waveform editor, trimming UI, mixing engine, volume automation, or DAW-style timeline.
- No text-to-speech or voice-cloning provider integration.
- No AudioNode custom shape in this slice.
- No guaranteed audio bytes inside the ZIP beyond existing uploaded Asset storage and manifest references.

---

## Key Decisions

- Reuse project Assets and existing canvas node data as the durable boundary instead of creating a separate audio library.
- Store audio bindings on Character, Shot, and Video nodes because those are the production entities that need voice or cue references.
- Preserve editor export compatibility by enriching manifests rather than changing the selected-video export contract.

---

## Completion Notes

- Audio uploads are accepted through the existing project Asset path and preview as browser audio.
- Character nodes persist `voiceAssetIds`/`voiceReferences`; Shot and Video nodes persist `audioAssetIds`/`audioReferences`.
- Editor export job inputs resolve audio references from selected Video nodes, parent Shot nodes, and Character voice references named by Shot character bindings.
- Worker-generated `timeline.json` emits audio assets and an audio track without embedding uploaded audio bytes in the ZIP.

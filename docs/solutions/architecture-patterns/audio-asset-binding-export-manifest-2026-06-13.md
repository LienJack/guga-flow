# Audio Asset Binding Export Manifest

## Context

TF-16 needed real audio files to participate in the canvas workflow without introducing a full audio editor, text-to-speech provider, or ZIP-sidecar media packaging.

## Decision

Audio stays inside the existing project Asset boundary. Character nodes own voice bindings through `voiceAssetIds` and `voiceReferences`; Shot and Video nodes own cue bindings through `audioAssetIds` and `audioReferences`.

Editor exports keep the selected-video contract unchanged. The backend expands selected Video nodes into clip sources and enriches each clip with valid project audio references from:

- the selected Video node,
- the parent Shot node,
- Character voice bindings for Character nodes listed in the Shot's `characterAssetIds`.

The worker writes those references into `timeline.json` as audio assets and audio track items. The ZIP still contains the timeline, storyboard CSV, and video clips only.

## Consequences

- The editor handoff is traceable: every audio item includes asset id, source node id, source node type, role, label, MIME type, and duration where available.
- Existing export creation and local-editor send APIs do not need a breaking request change.
- Missing or non-audio bound assets are ignored during export enrichment instead of blocking the whole package.
- Future ZIP-sidecar audio support should add an explicit audio-byte reader to the worker package builder rather than overloading the video clip reader.

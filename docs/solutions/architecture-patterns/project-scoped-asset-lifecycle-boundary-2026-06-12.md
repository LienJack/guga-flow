---
title: "Keep Project Asset Lifecycle Behind the Backend Boundary"
date: 2026-06-12
category: architecture-patterns
module: phase-1-project-assets
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "Adding project-scoped upload, preview, or delete behavior"
  - "A frontend list response is less detailed than the selected asset detail response"
  - "Deleting a parent record can leave local storage objects behind"
related_components:
  - database
  - testing_framework
  - frontend_asset_library
tags:
  - project-assets
  - local-storage
  - backend-boundary
  - browser-smoke
---

# Keep Project Asset Lifecycle Behind the Backend Boundary

## Context

Phase 1 added the first real product loop: create a project, open its canvas
workspace, upload local assets, preview them, and delete them. The important
architecture choice was to keep uploaded bytes, storage keys, preview serving,
and cleanup inside the Nest backend instead of letting the browser own storage
details or provider-like credentials.

Two issues surfaced during review and browser smoke validation:

- Deleting a project through Prisma cascade removed asset rows but could leave
  local upload files behind unless the project service cleaned storage objects
  before deleting the project.
- A text or markdown upload response carried enough list metadata to select the
  asset but not enough detail to render `textPreview`; the frontend needed a
  follow-up detail fetch after successful text uploads.

## Guidance

Treat project assets as a backend-owned lifecycle, not as plain frontend file
metadata.

The backend service should validate the upload before any storage write:

```ts
private validateUpload(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException("Upload file is required");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException("Upload file is too large");
  }
  if (!isUploadableMimeType(file.mimetype)) {
    throw new BadRequestException("Unsupported upload file type");
  }
}
```

Then storage and metadata creation stay in the backend:

```ts
const stored = await this.storage.putObject({
  projectId,
  originalFilename: file.originalname,
  mimeType,
  buffer: file.buffer,
});

const asset = await this.prisma.asset.create({
  data: {
    projectId,
    type: assetTypeForMime(mimeType),
    purpose: input.purpose ?? "uploaded",
    storageKey: stored.storageKey,
    mimeType,
    originalFilename: file.originalname,
    sizeBytes: stored.sizeBytes,
    metadataJson: {
      previewKind: previewKindForMime(mimeType),
    },
  },
});
```

Preview routes should return bytes through backend-controlled URLs, with the
stored MIME type and a short private cache:

```ts
const preview = await this.assetsService.getAssetPreview(projectId, assetId);

response.setHeader("Content-Type", preview.mimeType);
response.setHeader("Cache-Control", "private, max-age=60");
response.send(preview.body);
```

Deletion needs to clean local objects before deleting the database record that
points at them. For asset delete:

```ts
const asset = await this.findAsset(projectId, assetId);
await this.storage.deleteObject(asset.storageKey);
await this.prisma.asset.delete({ where: { id: asset.id } });
```

For project delete, list the project's asset storage keys first, delete the
objects, then delete the project:

```ts
const assets = await this.prisma.asset.findMany({
  where: { projectId },
  select: { storageKey: true },
});

for (const asset of assets) {
  await this.storage.deleteObject(asset.storageKey);
}

await this.prisma.project.delete({ where: { id: projectId } });
```

On the frontend, preserve the distinction between list records and detail
records. A list refresh can merge current detail fields with refreshed list
metadata:

```ts
setSelectedAsset((current) => {
  if (!current) {
    return null;
  }

  const refreshed = result.find((asset) => asset.id === current.id);
  return refreshed ? { ...current, ...refreshed } : null;
});
```

After uploading a text asset, capture the form synchronously, reset it after
the upload succeeds, then request detail data so the preview can render:

```ts
const form = event.currentTarget;
const file = new FormData(form).get("file");

const uploaded = await uploadAsset(projectId, { file, purpose });
setAssets((current) => [uploaded, ...current]);
setSelectedAsset(uploaded);
form.reset();

if (uploaded.previewKind === "text") {
  setSelectedAsset(await getAsset(projectId, uploaded.id));
}
```

## Why This Matters

The browser should never need raw storage paths, provider secrets, or deletion
rules to manage project assets. Keeping those concerns in backend services
preserves the Phase 0 architecture boundary and gives later canvas, generation,
and export modules a stable `Asset` contract to depend on.

The deletion order matters because a cascading database delete can hide the
only storage keys needed to remove local files. Cleaning storage first keeps
the operation observable and testable.

The list/detail distinction matters because UI state bugs can survive static
render tests. In Phase 1, unit tests and e2e tests passed, but real browser
smoke caught an async React form issue and the missing text detail fetch. User
visible asset flows should include at least one browser validation pass when
they cross form upload, CORS, API calls, and preview rendering.

## When to Apply

- Adding new asset purposes such as character, location, style, generated
  image, generated video, or editor package outputs.
- Binding assets to canvas nodes or semantic edges in later phases.
- Introducing remote object storage adapters behind the local storage service.
- Changing frontend asset list, detail, upload, preview, or delete behavior.
- Reviewing parent delete behavior for models that own stored objects.

## Examples

Backend tests should prove both validation and lifecycle ordering:

```ts
expect(storage.putObject).not.toHaveBeenCalled();
expect(prisma.asset.create).not.toHaveBeenCalled();

expect(storage.deleteObject).toHaveBeenCalledWith("project_1/hero.png");
expect(prisma.asset.delete).toHaveBeenCalledWith({ where: { id: "asset_1" } });
```

Cross-layer e2e should prove the API contract with multipart upload and preview:

```ts
await request(app.getHttpServer())
  .post(`/api/v1/projects/${projectId}/assets/upload`)
  .field("purpose", "uploaded")
  .attach("file", Buffer.from("# Notes"), {
    filename: "notes.md",
    contentType: "text/markdown",
  })
  .expect(201);

await request(app.getHttpServer())
  .get(`/api/v1/projects/${projectId}/assets/${assetId}/preview`)
  .expect(200)
  .expect("Content-Type", /text\/markdown/)
  .expect("# Notes");
```

Browser smoke should cover what static rendering cannot:

```text
1. Start Postgres and Redis.
2. Apply Prisma migrations.
3. Start backend and frontend dev servers.
4. Create a project from the dashboard.
5. Confirm navigation to /projects/:projectId/canvas.
6. Upload a markdown file from the asset library.
7. Confirm the file input resets and the text preview appears.
8. Check console and network panels for unexpected errors.
9. Delete the smoke project and confirm no upload files remain.
```

## Related

- `docs/brainstorms/2026-06-12-002-phase-1-project-management-assets-requirements.md`
- `docs/plans/2026-06-12-002-feat-phase-1-project-assets-plan.md`
- `apps/backend/src/assets/assets.service.ts`
- `apps/backend/src/projects/projects.service.ts`
- `apps/backend/src/storage/local-storage.service.ts`
- `apps/frontend/src/components/projects/asset-library.tsx`
- `apps/backend/test/app.e2e-spec.ts`

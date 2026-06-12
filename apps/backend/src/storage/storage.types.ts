export interface PutObjectInput {
  projectId: string;
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface StoredObject {
  storageKey: string;
  absolutePath: string;
  sizeBytes: number;
}

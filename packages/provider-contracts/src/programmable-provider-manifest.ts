import ts from "typescript";
import {
  IMAGE_PROVIDER_IDS,
  IMAGE_PROVIDER_MODES,
  PROGRAMMABLE_PROVIDER_CREDENTIAL_INPUT_TYPES,
  PROGRAMMABLE_PROVIDER_HTTP_METHODS,
  PROJECT_ASPECT_RATIOS,
  VIDEO_PROVIDER_IDS,
  VIDEO_PROVIDER_MODES,
  VIDEO_PROVIDER_RESOLUTIONS,
  managedProviderKind,
  programmableProviderId,
  type CanvasSnapshotJson,
  type ImageProviderParameterDefinition,
  type ImageProviderMode,
  type ProgrammableProviderManifest,
  type ProgrammableProviderValidationDiagnostic,
  type ProjectAspectRatio,
  type VideoProviderMode,
  type VideoProviderResolution,
} from "@guga-flow/shared-types";

export type ProgrammableProviderManifestParseResult =
  | {
      success: true;
      manifest: ProgrammableProviderManifest;
      diagnostics: [];
    }
  | {
      success: false;
      diagnostics: ProgrammableProviderValidationDiagnostic[];
    };

type RawObject = Record<string, unknown>;
type ProgrammableProviderAction = NonNullable<ProgrammableProviderManifest["image"]>["action"];
type ProgrammableProviderRequest = ProgrammableProviderAction["request"];
type ProgrammableProviderOutput = ProgrammableProviderAction["output"];
type ProgrammableProviderTask = ProgrammableProviderAction["task"];

const SOURCE_FILE_NAME = "provider.ts";

export function parseProgrammableProviderManifestSource(
  sourceCode: string,
): ProgrammableProviderManifestParseResult {
  const sourceFile = ts.createSourceFile(
    SOURCE_FILE_NAME,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics: ProgrammableProviderValidationDiagnostic[] = [];
  collectExecutableSyntaxDiagnostics(sourceFile, diagnostics);

  const manifestNode = findDefaultManifestObject(sourceFile);
  if (!manifestNode) {
    diagnostics.push({
      path: "source",
      message: "Provider source must export one default object literal manifest",
    });
    return { success: false, diagnostics };
  }

  const literal = literalValue(manifestNode, "manifest", diagnostics);
  if (!isRawObject(literal)) {
    diagnostics.push({
      path: "manifest",
      message: "Provider manifest must be a plain object",
    });
    return { success: false, diagnostics };
  }

  if (diagnostics.length > 0) {
    return { success: false, diagnostics };
  }

  const manifest = validateManifest(literal, diagnostics);
  if (!manifest || diagnostics.length > 0) {
    return { success: false, diagnostics };
  }

  return { success: true, manifest, diagnostics: [] };
}

function collectExecutableSyntaxDiagnostics(
  sourceFile: ts.SourceFile,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): void {
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node)) {
      diagnostics.push(diagnosticForNode(sourceFile, node, "source", "Imports are not allowed"));
      return;
    }
    if (ts.isExportDeclaration(node)) {
      diagnostics.push(diagnosticForNode(sourceFile, node, "source", "Re-exports are not allowed"));
      return;
    }
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      diagnostics.push(diagnosticForNode(sourceFile, node, "source", "Functions are not allowed"));
      return;
    }
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      diagnostics.push(diagnosticForNode(sourceFile, node, "source", "Classes are not allowed"));
      return;
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      diagnostics.push(diagnosticForNode(sourceFile, node, "source", "Call expressions are not allowed"));
      return;
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      diagnostics.push(diagnosticForNode(sourceFile, node, "source", "Runtime property access is not allowed"));
      return;
    }
    if (ts.isAwaitExpression(node)) {
      diagnostics.push(diagnosticForNode(sourceFile, node, "source", "Await expressions are not allowed"));
      return;
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
}

function diagnosticForNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  path: string,
  message: string,
): ProgrammableProviderValidationDiagnostic {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    path,
    message: `${message} at ${line + 1}:${character + 1}`,
  };
}

function findDefaultManifestObject(sourceFile: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isExportAssignment(statement) || statement.isExportEquals) {
      continue;
    }
    const expression = unwrapExpression(statement.expression);
    if (ts.isObjectLiteralExpression(expression)) {
      return expression;
    }
  }
  return undefined;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
    current = current.expression;
  }
  return current;
}

function literalValue(
  node: ts.Expression,
  path: string,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): unknown {
  const expression = unwrapExpression(node);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isPrefixUnaryExpression(expression) && ts.isNumericLiteral(expression.operand)) {
    const value = Number(expression.operand.text);
    return expression.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map((element, index) =>
      literalValue(element as ts.Expression, `${path}.${index}`, diagnostics),
    );
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const result: RawObject = {};
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) {
        diagnostics.push({
          path,
          message: "Only plain property assignments are allowed",
        });
        continue;
      }
      const key = propertyName(property.name);
      if (!key) {
        diagnostics.push({
          path,
          message: "Only identifier and string literal property names are allowed",
        });
        continue;
      }
      result[key] = literalValue(property.initializer, `${path}.${key}`, diagnostics);
    }
    return result;
  }

  diagnostics.push({
    path,
    message: "Only literal data is allowed in provider manifests",
  });
  return undefined;
}

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function validateManifest(
  raw: RawObject,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ProgrammableProviderManifest | undefined {
  const id = programmableProviderId(raw.id);
  const kind = managedProviderKind(raw.kind);
  const displayName = stringValue(raw.displayName);
  const defaultModel = stringValue(raw.defaultModel);
  const defaultAspectRatio = aspectRatio(raw.defaultAspectRatio);
  const supportedAspectRatios = arrayOf(raw.supportedAspectRatios, aspectRatio);
  const credentials = credentialsValue(raw.credentials, diagnostics);
  const models = modelsValue(raw.models, defaultModel, diagnostics);
  const parameters = parametersValue(raw.parameters, diagnostics);

  if (!id) {
    diagnostics.push({ path: "id", message: "Provider id must use custom:<slug> and not collide with built-ins" });
  }
  if (kind !== "image" && kind !== "video") {
    diagnostics.push({ path: "kind", message: "Provider kind must be image or video" });
  }
  if (!displayName) {
    diagnostics.push({ path: "displayName", message: "Display name is required" });
  }
  if (!defaultModel) {
    diagnostics.push({ path: "defaultModel", message: "Default model is required" });
  }
  if (defaultModel && !models.some((model) => model.id === defaultModel)) {
    diagnostics.push({ path: "defaultModel", message: "Default model must exist in models" });
  }
  if (!defaultAspectRatio) {
    diagnostics.push({ path: "defaultAspectRatio", message: "Default aspect ratio is invalid" });
  }
  if (supportedAspectRatios.length === 0) {
    diagnostics.push({ path: "supportedAspectRatios", message: "At least one supported aspect ratio is required" });
  }

  if (kind === "image") {
    const image = imageManifest(raw.image, raw.supportedModes, diagnostics);
    if (!image || !id || !displayName || !defaultModel || !defaultAspectRatio) {
      return undefined;
    }
    return {
      id,
      kind,
      displayName,
      description: stringValue(raw.description),
      credentials,
      models,
      defaultModel,
      supportedModes: image.supportedModes,
      defaultAspectRatio,
      supportedAspectRatios,
      parameters,
      image: image.image,
    };
  }

  if (kind === "video") {
    const video = videoManifest(raw.video, raw.supportedModes, diagnostics);
    if (!video || !id || !displayName || !defaultModel || !defaultAspectRatio) {
      return undefined;
    }
    return {
      id,
      kind,
      displayName,
      description: stringValue(raw.description),
      credentials,
      models,
      defaultModel,
      supportedModes: video.supportedModes,
      defaultAspectRatio,
      supportedAspectRatios,
      parameters,
      video: video.video,
    };
  }

  return undefined;
}

function imageManifest(
  value: unknown,
  modesValue: unknown,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): Pick<ProgrammableProviderManifest, "image"> & { supportedModes: ImageProviderMode[] } | undefined {
  const raw = objectValue(value);
  const supportedModes = arrayOf(modesValue, imageProviderMode);
  if (supportedModes.length === 0) {
    diagnostics.push({ path: "supportedModes", message: "Image provider needs at least one valid mode" });
  }
  const action = actionManifest(raw?.action, "image.action", diagnostics);
  if (!raw || !action || supportedModes.length === 0) {
    diagnostics.push({ path: "image", message: "Image provider action is required" });
    return undefined;
  }
  return {
    supportedModes,
    image: {
      supportsReferenceImages: raw.supportsReferenceImages === true,
      maxReferenceImages: numberValue(raw.maxReferenceImages, 0),
      supportsMultipleOutputs: raw.supportsMultipleOutputs === true,
      maxOutputs: numberValue(raw.maxOutputs, 1),
      action,
    },
  };
}

function videoManifest(
  value: unknown,
  modesValue: unknown,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): Pick<ProgrammableProviderManifest, "video"> & { supportedModes: VideoProviderMode[] } | undefined {
  const raw = objectValue(value);
  const supportedModes = arrayOf(modesValue, videoProviderMode);
  const supportedDurationSeconds = arrayOf(raw?.supportedDurationSeconds, numberArrayValue);
  const supportedResolutions = arrayOf(raw?.supportedResolutions, videoProviderResolution);
  if (supportedModes.length === 0) {
    diagnostics.push({ path: "supportedModes", message: "Video provider needs at least one valid mode" });
  }
  const action = actionManifest(raw?.action, "video.action", diagnostics);
  if (!raw || !action || supportedModes.length === 0) {
    diagnostics.push({ path: "video", message: "Video provider action is required" });
    return undefined;
  }
  return {
    supportedModes,
    video: {
      supportsFirstFrame: raw.supportsFirstFrame !== false,
      supportsLastFrame: raw.supportsLastFrame === true,
      supportsReferenceImages: raw.supportsReferenceImages === true,
      maxReferenceImages: numberValue(raw.maxReferenceImages, 0),
      supportsCancel: raw.supportsCancel === true,
      defaultDurationSeconds: numberValue(raw.defaultDurationSeconds, 5),
      supportedDurationSeconds: supportedDurationSeconds.length ? supportedDurationSeconds : [5],
      defaultResolution: videoProviderResolution(raw.defaultResolution) ?? "720p",
      supportedResolutions: supportedResolutions.length ? supportedResolutions : ["720p"],
      action,
    },
  };
}

function actionManifest(
  value: unknown,
  path: string,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ProgrammableProviderAction | undefined {
  const raw = objectValue(value);
  if (!raw) {
    diagnostics.push({ path, message: "Action must be an object" });
    return undefined;
  }
  const request = requestTemplate(raw.request, `${path}.request`, diagnostics);
  const output = outputMapping(raw.output, `${path}.output`, diagnostics);
  const task = taskMapping(raw.task, `${path}.task`, diagnostics);
  if (!request) {
    return undefined;
  }
  if (!output && !task) {
    diagnostics.push({ path, message: "Action must define output or task mapping" });
    return undefined;
  }
  return {
    request,
    output,
    task,
  };
}

function requestTemplate(
  value: unknown,
  path: string,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ProgrammableProviderRequest | undefined {
  const raw = objectValue(value);
  const method = PROGRAMMABLE_PROVIDER_HTTP_METHODS.includes(raw?.method as never)
    ? raw?.method as ProgrammableProviderRequest["method"]
    : undefined;
  const url = stringValue(raw?.url);
  if (!raw || !method || !url) {
    diagnostics.push({ path, message: "Request requires method and url" });
    return undefined;
  }
  if (!url.startsWith("https://")) {
    diagnostics.push({ path: `${path}.url`, message: "Request url must use https" });
  }
  return {
    method,
    url,
    headers: recordOfStrings(raw.headers),
    bodyJson: raw.bodyJson as CanvasSnapshotJson | undefined,
    timeoutMs: optionalPositiveNumber(raw.timeoutMs),
    maxResponseBytes: optionalPositiveNumber(raw.maxResponseBytes),
  };
}

function outputMapping(
  value: unknown,
  path: string,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ProgrammableProviderOutput | undefined {
  if (value === undefined) {
    return undefined;
  }
  const raw = objectValue(value);
  const source = raw?.source === "base64" || raw?.source === "url" ? raw.source : undefined;
  const outputPath = stringValue(raw?.path);
  if (!raw || !source || !outputPath) {
    diagnostics.push({ path, message: "Output mapping requires source and path" });
    return undefined;
  }
  return {
    source,
    path: outputPath,
    mimeType: stringValue(raw.mimeType),
    widthPath: stringValue(raw.widthPath),
    heightPath: stringValue(raw.heightPath),
  };
}

function taskMapping(
  value: unknown,
  path: string,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ProgrammableProviderTask | undefined {
  if (value === undefined) {
    return undefined;
  }
  const raw = objectValue(value);
  const idPath = stringValue(raw?.idPath);
  if (!raw || !idPath) {
    diagnostics.push({ path, message: "Task mapping requires idPath" });
    return undefined;
  }
  return {
    idPath,
    statusPath: stringValue(raw.statusPath),
    succeededValues: arrayOf(raw.succeededValues, stringValue),
    failedValues: arrayOf(raw.failedValues, stringValue),
    output: outputMapping(raw.output, `${path}.output`, diagnostics),
    errorPath: stringValue(raw.errorPath),
    pollRequest: raw.pollRequest === undefined
      ? undefined
      : requestTemplate(raw.pollRequest, `${path}.pollRequest`, diagnostics),
    cancelRequest: raw.cancelRequest === undefined
      ? undefined
      : requestTemplate(raw.cancelRequest, `${path}.cancelRequest`, diagnostics),
  };
}

function credentialsValue(
  value: unknown,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ProgrammableProviderManifest["credentials"] {
  if (!Array.isArray(value)) {
    diagnostics.push({ path: "credentials", message: "Credentials must be an array" });
    return [];
  }
  return value.flatMap((item, index) => {
    const raw = objectValue(item);
    const key = stringValue(raw?.key);
    const label = stringValue(raw?.label);
    const type = PROGRAMMABLE_PROVIDER_CREDENTIAL_INPUT_TYPES.includes(raw?.type as never)
      ? raw?.type as ProgrammableProviderManifest["credentials"][number]["type"]
      : undefined;
    if (!raw || !key || !label || !type) {
      diagnostics.push({ path: `credentials.${index}`, message: "Credential requires key, label, and type" });
      return [];
    }
    return [{
      key,
      label,
      type,
      required: raw.required !== false,
      placeholder: stringValue(raw.placeholder),
    }];
  });
}

function modelsValue(
  value: unknown,
  defaultModel: string | undefined,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ProgrammableProviderManifest["models"] {
  if (!Array.isArray(value)) {
    diagnostics.push({ path: "models", message: "Models must be an array" });
    return [];
  }
  return value.flatMap((item, index) => {
    const raw = objectValue(item);
    const id = stringValue(raw?.id);
    const displayName = stringValue(raw?.displayName);
    if (!raw || !id || !displayName) {
      diagnostics.push({ path: `models.${index}`, message: "Model requires id and displayName" });
      return [];
    }
    return [{
      id,
      displayName,
      default: raw.default === true || id === defaultModel,
    }];
  });
}

function parametersValue(
  value: unknown,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ImageProviderParameterDefinition[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    diagnostics.push({ path: "parameters", message: "Parameters must be an array" });
    return [];
  }
  return value.flatMap((item, index) => {
    const raw = objectValue(item);
    const id = stringValue(raw?.id);
    const label = stringValue(raw?.label);
    const type = raw?.type === "string" ||
      raw?.type === "number" ||
      raw?.type === "boolean" ||
      raw?.type === "select"
      ? raw.type
      : undefined;
    if (!raw || !id || !label || !type) {
      diagnostics.push({ path: `parameters.${index}`, message: "Parameter requires id, label, and type" });
      return [];
    }
    return [{
      id,
      label,
      type,
      required: raw.required === true,
      defaultValue: raw.defaultValue as CanvasSnapshotJson | undefined,
      min: optionalNumber(raw.min),
      max: optionalNumber(raw.max),
      options: parameterOptions(raw.options, `parameters.${index}.options`, diagnostics),
    }];
  });
}

function parameterOptions(
  value: unknown,
  path: string,
  diagnostics: ProgrammableProviderValidationDiagnostic[],
): ImageProviderParameterDefinition["options"] {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    diagnostics.push({ path, message: "Parameter options must be an array" });
    return undefined;
  }
  return value.flatMap((item, index) => {
    const raw = objectValue(item);
    const optionValue = stringValue(raw?.value);
    const label = stringValue(raw?.label);
    if (!raw || !optionValue || !label) {
      diagnostics.push({ path: `${path}.${index}`, message: "Parameter option requires value and label" });
      return [];
    }
    return [{ value: optionValue, label }];
  });
}

function arrayOf<T>(value: unknown, mapper: (item: unknown) => T | undefined): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const mapped = mapper(item);
    return mapped === undefined ? [] : [mapped];
  });
}

function imageProviderMode(value: unknown): ImageProviderMode | undefined {
  return IMAGE_PROVIDER_MODES.includes(value as ImageProviderMode)
    ? value as ImageProviderMode
    : undefined;
}

function videoProviderMode(value: unknown): VideoProviderMode | undefined {
  return VIDEO_PROVIDER_MODES.includes(value as VideoProviderMode)
    ? value as VideoProviderMode
    : undefined;
}

function videoProviderResolution(value: unknown): VideoProviderResolution | undefined {
  return VIDEO_PROVIDER_RESOLUTIONS.includes(value as VideoProviderResolution)
    ? value as VideoProviderResolution
    : undefined;
}

function aspectRatio(value: unknown): ProjectAspectRatio | undefined {
  return PROJECT_ASPECT_RATIOS.includes(value as ProjectAspectRatio)
    ? value as ProjectAspectRatio
    : undefined;
}

function objectValue(value: unknown): RawObject | undefined {
  return isRawObject(value) ? value : undefined;
}

function isRawObject(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberArrayValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function recordOfStrings(value: unknown): Record<string, string> | undefined {
  if (!isRawObject(value)) {
    return undefined;
  }
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function builtInProviderIds(): string[] {
  return [...IMAGE_PROVIDER_IDS, ...VIDEO_PROVIDER_IDS];
}

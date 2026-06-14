import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ActivateWorkflowVersionInput,
  CanvasSnapshotJson,
  CreateWorkflowDefinitionInput,
  CreateWorkflowRunInput,
  CreateWorkflowVersionInput,
  WorkflowDefinitionResult,
  WorkflowDefinitionSummary,
  WorkflowDefinitionVersionSummary,
  WorkflowDiagnostic,
  WorkflowListResult,
  WorkflowMapping,
  WorkflowOutputKind,
  WorkflowRunJobInput,
  WorkflowRunResult,
} from "@guga-flow/shared-types";
import {
  WORKFLOW_DEFINITION_STATUSES,
  WORKFLOW_FIELD_TYPES,
  WORKFLOW_OUTPUT_KINDS,
  WORKFLOW_RUN_KINDS,
} from "@guga-flow/shared-types";
import { Prisma } from "../generated/prisma/client";

import { PrismaService } from "../prisma/prisma.service";

type WorkflowDefinitionModel = {
  id: string;
  projectId: string;
  kind: string;
  provider: string;
  displayName: string;
  status: string;
  activeVersionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  versions?: WorkflowDefinitionVersionModel[];
};

type WorkflowDefinitionVersionModel = {
  id: string;
  workflowDefinitionId: string;
  version: number;
  sourceJson: unknown;
  mappingJson: unknown;
  diagnosticsJson: unknown;
  createdAt: Date | string;
};

type GenerationJobModel = {
  id: string;
  projectId: string;
  operation: string;
  status: string;
  provider: string;
  model: string | null;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  providerTaskId: string | null;
  inputJson: unknown;
  outputJson: unknown | null;
  errorMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function dataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string")
    ? Array.from(new Set(value))
    : [];
}

@Injectable()
export class WorkflowsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listWorkflows(projectId: string): Promise<WorkflowListResult> {
    await this.ensureProjectExists(projectId);
    const workflows = (await this.prisma.workflowDefinition.findMany({
      where: { projectId },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: { updatedAt: "desc" },
    })) as WorkflowDefinitionModel[];
    return { workflows: workflows.map((workflow) => this.toWorkflowSummary(workflow)) };
  }

  async createWorkflow(
    projectId: string,
    input: CreateWorkflowDefinitionInput,
  ): Promise<WorkflowDefinitionResult> {
    await this.ensureProjectExists(projectId);
    const mapping = normalizeWorkflowMapping(input.mappingJson);
    const diagnostics = workflowDiagnostics(input.sourceJson, mapping);
    if (diagnostics.length) {
      throw new BadRequestException(`Workflow mapping invalid: ${diagnostics[0]?.message}`);
    }
    const workflow = (await this.prisma.$transaction(async (tx) => {
      const created = await tx.workflowDefinition.create({
        data: {
          projectId,
          kind: input.kind,
          provider: input.provider.trim(),
          displayName: input.displayName.trim(),
          status: "draft",
        },
      });
      const version = await tx.workflowDefinitionVersion.create({
        data: {
          workflowDefinitionId: created.id,
          version: 1,
          sourceJson: jsonValue(input.sourceJson),
          mappingJson: jsonValue(mapping),
          diagnosticsJson: jsonValue(diagnostics),
        },
      });
      return tx.workflowDefinition.update({
        where: { id: created.id },
        data: { activeVersionId: version.id, status: "active" },
        include: { versions: { orderBy: { version: "desc" } } },
      });
    })) as WorkflowDefinitionModel;

    return { workflow: this.toWorkflowSummary(workflow) };
  }

  async createVersion(
    projectId: string,
    workflowId: string,
    input: CreateWorkflowVersionInput,
  ): Promise<WorkflowDefinitionResult> {
    const workflow = await this.findWorkflow(projectId, workflowId);
    const mapping = normalizeWorkflowMapping(input.mappingJson);
    const diagnostics = workflowDiagnostics(input.sourceJson, mapping);
    const nextVersion = Math.max(0, ...(workflow.versions ?? []).map((version) => version.version)) + 1;
    const updated = (await this.prisma.$transaction(async (tx) => {
      await tx.workflowDefinitionVersion.create({
        data: {
          workflowDefinitionId: workflow.id,
          version: nextVersion,
          sourceJson: jsonValue(input.sourceJson),
          mappingJson: jsonValue(mapping),
          diagnosticsJson: jsonValue(diagnostics),
        },
      });
      return tx.workflowDefinition.findUnique({
        where: { id: workflow.id },
        include: { versions: { orderBy: { version: "desc" } } },
      });
    })) as WorkflowDefinitionModel | null;
    if (!updated) {
      throw new NotFoundException("Workflow not found");
    }
    return { workflow: this.toWorkflowSummary(updated) };
  }

  async activateVersion(
    projectId: string,
    workflowId: string,
    input: ActivateWorkflowVersionInput,
  ): Promise<WorkflowDefinitionResult> {
    const workflow = await this.findWorkflow(projectId, workflowId);
    const version = workflow.versions?.find((candidate) => candidate.id === input.versionId);
    if (!version) {
      throw new NotFoundException("Workflow version not found");
    }
    const diagnostics = workflowDiagnostics(version.sourceJson, normalizeWorkflowMapping(version.mappingJson));
    if (diagnostics.length) {
      throw new BadRequestException("Workflow version has diagnostics and cannot be activated");
    }
    const updated = (await this.prisma.workflowDefinition.update({
      where: { id: workflow.id },
      data: { activeVersionId: version.id, status: "active" },
      include: { versions: { orderBy: { version: "desc" } } },
    })) as WorkflowDefinitionModel;
    return { workflow: this.toWorkflowSummary(updated) };
  }

  async createRunJob(
    projectId: string,
    workflowId: string,
    input: CreateWorkflowRunInput,
  ): Promise<WorkflowRunResult> {
    const workflow = await this.findWorkflow(projectId, workflowId);
    if (workflow.status !== "active" || !workflow.activeVersionId) {
      throw new BadRequestException("Workflow must be active before it can run");
    }
    const version = workflow.versions?.find((candidate) => candidate.id === workflow.activeVersionId);
    if (!version) {
      throw new BadRequestException("Workflow active version is missing");
    }
    if (!input.sourceNodeId) {
      throw new BadRequestException("Workflow run requires a source canvas node");
    }
    const sourceNode = await this.prisma.canvasNode.findFirst({
      where: { id: input.sourceNodeId, projectId },
      select: { id: true },
    });
    if (!sourceNode) {
      throw new NotFoundException("Workflow source node not found");
    }

    const mapping = normalizeWorkflowMapping(version.mappingJson);
    const outputKind = input.outputKind ?? mapping.outputs[0]?.kind ?? "image";
    if (!WORKFLOW_OUTPUT_KINDS.includes(outputKind)) {
      throw new BadRequestException("Workflow output kind is not supported");
    }
    const jobInput: WorkflowRunJobInput = {
      operation: "workflow_run",
      projectId,
      workflowDefinitionId: workflow.id,
      workflowVersionId: version.id,
      workflowKind: workflow.kind as WorkflowRunJobInput["workflowKind"],
      provider: workflow.provider,
      model: `${workflow.kind}-workflow-v${version.version}`,
      sourceNodeId: input.sourceNodeId,
      prompt: input.prompt,
      outputKind,
      fieldValues: input.fieldValues,
      referenceAssetIds: input.referenceAssetIds ?? [],
      forceFailure: input.forceFailure,
    };
    const job = (await this.prisma.generationJob.create({
      data: {
        projectId,
        operation: "workflow_run",
        status: "queued",
        provider: jobInput.provider,
        model: jobInput.model,
        sourceNodeId: jobInput.sourceNodeId,
        inputJson: jsonValue(jobInput),
      },
    })) as GenerationJobModel;

    return {
      job: {
        id: job.id,
        projectId: job.projectId,
        operation: "workflow_run",
        status: "queued",
        provider: job.provider,
        model: job.model ?? undefined,
        sourceNodeId: job.sourceNodeId ?? undefined,
        inputJson: job.inputJson as WorkflowRunJobInput,
        createdAt: toIsoString(job.createdAt),
        updatedAt: toIsoString(job.updatedAt),
      },
    };
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  private async findWorkflow(projectId: string, workflowId: string): Promise<WorkflowDefinitionModel> {
    const workflow = (await this.prisma.workflowDefinition.findFirst({
      where: { id: workflowId, projectId },
      include: { versions: { orderBy: { version: "desc" } } },
    })) as WorkflowDefinitionModel | null;
    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }
    return workflow;
  }

  private toWorkflowSummary(workflow: WorkflowDefinitionModel): WorkflowDefinitionSummary {
    const versions = workflow.versions ?? [];
    return {
      id: workflow.id,
      projectId: workflow.projectId,
      kind: WORKFLOW_RUN_KINDS.includes(workflow.kind as WorkflowDefinitionSummary["kind"])
        ? workflow.kind as WorkflowDefinitionSummary["kind"]
        : "comfyui",
      provider: workflow.provider,
      displayName: workflow.displayName,
      status: WORKFLOW_DEFINITION_STATUSES.includes(workflow.status as WorkflowDefinitionSummary["status"])
        ? workflow.status as WorkflowDefinitionSummary["status"]
        : "draft",
      activeVersionId: workflow.activeVersionId ?? undefined,
      versions: versions.map((version) => this.toVersionSummary(version, workflow.activeVersionId)),
      createdAt: toIsoString(workflow.createdAt),
      updatedAt: toIsoString(workflow.updatedAt),
    };
  }

  private toVersionSummary(
    version: WorkflowDefinitionVersionModel,
    activeVersionId: string | null,
  ): WorkflowDefinitionVersionSummary {
    return {
      id: version.id,
      workflowDefinitionId: version.workflowDefinitionId,
      version: version.version,
      sourceJson: version.sourceJson as CanvasSnapshotJson,
      mappingJson: normalizeWorkflowMapping(version.mappingJson),
      diagnostics: normalizeDiagnostics(version.diagnosticsJson),
      createdAt: toIsoString(version.createdAt),
      active: version.id === activeVersionId,
    };
  }
}

function normalizeWorkflowMapping(input: unknown): WorkflowMapping {
  const raw = dataObject(input);
  const fields = Array.isArray(raw.fields)
    ? raw.fields.map((field) => {
        const value = dataObject(field);
        return {
          id: typeof value.id === "string" ? value.id : "",
          nodeId: typeof value.nodeId === "string" ? value.nodeId : undefined,
          input: typeof value.input === "string" ? value.input : undefined,
          type: WORKFLOW_FIELD_TYPES.includes(value.type as WorkflowMapping["fields"][number]["type"])
            ? value.type as WorkflowMapping["fields"][number]["type"]
            : "text",
          source: typeof value.source === "string" ? value.source : undefined,
          required: value.required === true,
          options: stringArray(value.options),
        };
      })
    : [];
  const outputs = Array.isArray(raw.outputs)
    ? raw.outputs.map((output) => {
        const value = dataObject(output);
        return {
          nodeId: typeof value.nodeId === "string" ? value.nodeId : undefined,
          kind: WORKFLOW_OUTPUT_KINDS.includes(value.kind as WorkflowOutputKind)
            ? value.kind as WorkflowOutputKind
            : "image",
        };
      })
    : [];
  return { fields, outputs };
}

function workflowDiagnostics(sourceJson: unknown, mapping: WorkflowMapping): WorkflowDiagnostic[] {
  const diagnostics: WorkflowDiagnostic[] = [];
  if (typeof sourceJson !== "object" || sourceJson === null || Array.isArray(sourceJson)) {
    diagnostics.push({ path: "sourceJson", message: "Workflow source JSON must be an object" });
  }
  if (!mapping.outputs.length) {
    diagnostics.push({ path: "mappingJson.outputs", message: "Workflow mapping requires at least one output" });
  }
  for (const field of mapping.fields) {
    if (!field.id.trim()) {
      diagnostics.push({ path: "mappingJson.fields", message: "Workflow field id is required" });
    }
  }
  return diagnostics;
}

function normalizeDiagnostics(value: unknown): WorkflowDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const raw = dataObject(item);
    return typeof raw.path === "string" && typeof raw.message === "string"
      ? [{ path: raw.path, message: raw.message }]
      : [];
  });
}

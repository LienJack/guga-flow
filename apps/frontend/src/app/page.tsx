import type { ProjectAspectRatio } from "@guga-flow/shared-types";

import { ProjectDashboard } from "../components/projects/project-dashboard";

type HomeSearchParams = Record<string, string | string[] | undefined>;

interface HomePageProps {
  searchParams?: Promise<HomeSearchParams>;
}

const PROJECT_ASPECT_RATIOS = new Set<ProjectAspectRatio>(["9:16", "16:9", "1:1"]);

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return <ProjectDashboard initialDraft={projectDraftFromSearchParams(params)} />;
}

function projectDraftFromSearchParams(params: HomeSearchParams | undefined) {
  const title = firstParam(params?.title);
  const description = firstParam(params?.description);
  const defaultAspectRatio = toProjectAspectRatio(firstParam(params?.defaultAspectRatio));

  if (!title && !description && !defaultAspectRatio) {
    return undefined;
  }

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(defaultAspectRatio ? { defaultAspectRatio } : {}),
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toProjectAspectRatio(value: string | undefined): ProjectAspectRatio | undefined {
  return value && PROJECT_ASPECT_RATIOS.has(value as ProjectAspectRatio)
    ? (value as ProjectAspectRatio)
    : undefined;
}

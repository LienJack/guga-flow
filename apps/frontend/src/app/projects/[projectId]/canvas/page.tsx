import { ProjectCanvasWorkspace } from "../../../../components/canvas/project-canvas-workspace";

interface ProjectCanvasPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectCanvasPage({ params }: ProjectCanvasPageProps) {
  const { projectId } = await params;

  return <ProjectCanvasWorkspace projectId={projectId} />;
}

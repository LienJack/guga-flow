import { WorkbenchShell } from "../../../../components/workbench-shell";
import { AssetLibrary } from "../../../../components/projects/asset-library";

interface ProjectCanvasPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectCanvasPage({ params }: ProjectCanvasPageProps) {
  const { projectId } = await params;

  return (
    <WorkbenchShell
      projectId={projectId}
      projectTitle={`Project ${projectId}`}
      inspectorSlot={<AssetLibrary projectId={projectId} />}
    />
  );
}

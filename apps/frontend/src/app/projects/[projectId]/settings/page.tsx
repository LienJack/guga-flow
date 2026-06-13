import { SettingsCenter } from "../../../../components/projects/settings-center";
import { WorkbenchShell } from "../../../../components/workbench-shell";

interface ProjectSettingsPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { projectId } = await params;

  return (
    <WorkbenchShell
      activeSection="settings"
      canvasSlot={<SettingsCenter projectId={projectId} />}
      inspectorSlot={<SettingsInspector projectId={projectId} />}
      projectId={projectId}
      projectTitle="Project settings"
    />
  );
}

function SettingsInspector({ projectId }: { projectId: string }) {
  return (
    <>
      <h2 className="panel-title">Provider Scope</h2>
      <ul className="property-list">
        <li className="property-item">
          <span>Project</span>
          <span className="property-value">{projectId}</span>
        </li>
        <li className="property-item">
          <span>Credentials</span>
          <span className="property-value">Write-only</span>
        </li>
        <li className="property-item">
          <span>Skills</span>
          <span className="property-value">Versioned</span>
        </li>
        <li className="property-item">
          <span>Import</span>
          <span className="property-value">Validate only</span>
        </li>
      </ul>
    </>
  );
}

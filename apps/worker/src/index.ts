import { runMockMediaWorkflow } from "./mock-workflow";

async function main() {
  const result = await runMockMediaWorkflow({
    projectId: "local_mock_project",
    title: "Local Mock Storyboard",
    novelText: "A hero watches the city lights before choosing the next shot.",
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (result.status === "failed") {
    process.exitCode = 1;
  }
}

void main();

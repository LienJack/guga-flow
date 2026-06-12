import { runMockMediaWorkflow } from "./mock-workflow";
import { HttpGenerationWorkerClient, backendWorkerBaseUrlFromEnv } from "./generation-client";
import { createGenerationExecutorRegistry } from "./generation-executors";
import { runGenerationWorkerLoop, runOneGenerationJob } from "./generation-runner";

async function main() {
  const args = new Set(process.argv.slice(2));

  if (args.has("--once") || args.has("--queue")) {
    const client = new HttpGenerationWorkerClient(backendWorkerBaseUrlFromEnv());
    const registry = createGenerationExecutorRegistry();
    if (args.has("--once")) {
      const result = await runOneGenerationJob({ client, registry, logger: console });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.status === "failed") {
        process.exitCode = 1;
      }
      return;
    }

    await runGenerationWorkerLoop({
      client,
      registry,
      logger: console,
      pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS ?? 2000),
    });
    return;
  }

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

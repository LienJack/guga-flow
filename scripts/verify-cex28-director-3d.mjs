import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requireFromFrontend = createRequire(new URL("../apps/frontend/package.json", import.meta.url));
const threeCjsPath = requireFromFrontend.resolve("three");
const threeBuildDir = path.dirname(threeCjsPath);
const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const artifactDir = path.join(repoRoot, ".codex", "verification");
const screenshotPath = path.join(artifactDir, "cex-28-director-3d.png");

const html = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CEX-28 Director 3D Pixel Check</title>
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #0b0f14;
      }

      main {
        width: 360px;
        padding: 20px;
      }

      canvas {
        display: block;
        width: 320px;
        height: 220px;
      }
    </style>
  </head>
  <body>
    <main>
      <canvas id="director" width="320" height="220" data-testid="director-3d-canvas"></canvas>
    </main>
    <script type="module">
      import * as THREE from "/three.module.js";

      const canvas = document.querySelector("#director");
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(1);
      renderer.setSize(320, 220, false);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#101820");

      const camera = new THREE.PerspectiveCamera(45, 320 / 220, 0.1, 100);
      camera.position.set(4, 3, 6);
      camera.lookAt(0, 0.75, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const light = new THREE.DirectionalLight(0xffffff, 1.4);
      light.position.set(3, 5, 4);
      scene.add(light);

      const subject = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: "#4f8cff", roughness: 0.55, metalness: 0.08 }),
      );
      subject.position.set(0, 1, 0);
      subject.rotation.y = 0.35;
      scene.add(subject);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 32, 16),
        new THREE.MeshStandardMaterial({ color: "#f6c85f", roughness: 0.5, metalness: 0.05 }),
      );
      marker.position.set(1.2, 1.6, -0.8);
      scene.add(marker);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 3),
        new THREE.MeshStandardMaterial({ color: "#243447", roughness: 0.8, metalness: 0 }),
      );
      floor.position.set(0, 0, 0);
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      function render() {
        subject.rotation.y += 0.006;
        marker.rotation.y += 0.006;
        renderer.render(scene, camera);
      }

      render();

      window.__cex28ReadPixels = () => {
        render();
        const gl = renderer.getContext();
        const width = canvas.width;
        const height = canvas.height;
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        let opaquePixels = 0;
        let foregroundPixels = 0;
        let colorChecksum = 0;
        const background = { r: 16, g: 24, b: 32 };
        for (let index = 0; index < pixels.length; index += 4) {
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const a = pixels[index + 3];
          if (a > 0) {
            opaquePixels += 1;
          }
          const distance = Math.abs(r - background.r) + Math.abs(g - background.g) + Math.abs(b - background.b);
          if (a > 0 && distance > 24) {
            foregroundPixels += 1;
          }
          colorChecksum = (colorChecksum + r * 3 + g * 5 + b * 7 + a * 11) % 1000000007;
        }
        return { width, height, opaquePixels, foregroundPixels, colorChecksum };
      };

      window.__cex28Capture = async () => {
        render();
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Canvas did not produce a blob"))), "image/png");
        });
        return {
          mimeType: blob.type,
          sizeBytes: blob.size,
          mockAssetId: "asset_cex28_director_snapshot",
        };
      };

      window.__cex28Ready = true;
    </script>
  </body>
</html>`;

function startServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname.endsWith(".js")) {
      const requestedFile = path.basename(url.pathname);
      const requestedPath = path.join(threeBuildDir, requestedFile);
      response.writeHead(200, {
        "content-type": "text/javascript; charset=utf-8",
      });
      response.end(readFileSync(requestedPath));
      return;
    }

    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
    });
    response.end(html);
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Verification server did not expose a TCP address"));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

async function main() {
  const { server, url } = await startServer();
  let browser;
  try {
    await mkdir(artifactDir, { recursive: true });
    browser = await chromium.launch({
      executablePath: chromium.executablePath(),
      headless: true,
      args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
    });
    const page = await browser.newPage({ viewport: { width: 420, height: 300 } });
    const pageDiagnostics = [];
    page.on("console", (message) => {
      pageDiagnostics.push(`console.${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      pageDiagnostics.push(`pageerror: ${error.message}`);
    });
    await page.goto(url, { waitUntil: "networkidle" });
    try {
      await page.waitForFunction(() => window.__cex28Ready === true);
    } catch (error) {
      const bodyText = await page.locator("body").innerText().catch(() => "");
      throw new Error(
        [
          error instanceof Error ? error.message : String(error),
          bodyText ? `body: ${bodyText}` : undefined,
          pageDiagnostics.length ? `diagnostics: ${pageDiagnostics.join(" | ")}` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    const metrics = await page.evaluate(() => window.__cex28ReadPixels());
    const capture = await page.evaluate(() => window.__cex28Capture());
    const canvas = page.getByTestId("director-3d-canvas");
    await canvas.screenshot({ path: screenshotPath });

    if (metrics.width !== 320 || metrics.height !== 220) {
      throw new Error(`Unexpected canvas size ${metrics.width}x${metrics.height}`);
    }
    if (metrics.foregroundPixels < 1000) {
      throw new Error(`3D canvas appears blank: only ${metrics.foregroundPixels} foreground pixels`);
    }
    if (capture.mimeType !== "image/png" || capture.sizeBytes < 1000) {
      throw new Error(`3D snapshot capture failed: ${capture.mimeType} ${capture.sizeBytes} bytes`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          foregroundPixels: metrics.foregroundPixels,
          opaquePixels: metrics.opaquePixels,
          colorChecksum: metrics.colorChecksum,
          capture,
          screenshotPath,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

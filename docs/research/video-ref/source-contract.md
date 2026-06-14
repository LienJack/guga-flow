# video-ref Source Contract

| Project | Local Path | Commit / Version | License | Reference Value | Notes |
| --- | --- | --- | --- | --- | --- |
| Toonflow-app | `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app` | `cd3e7c4e83963bea255be2e621eb78d2cd1c2188` / `1.1.8` | Apache-2.0 | AI short-drama/video production workbench covering novel import, script generation, storyboard, assets, video nodes, agents, memory, and model vendors. | Graphify was generated from the full local repo. Repomix packs include `README.md`, `package.json`, and `src/**/*.ts`. |
| Infinite-Canvas | `/Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas` | `9fb9a908c78f6d9e23fcfc03b7cf5d8b77ff3e0e` / `2026.06.12` | Custom non-commercial license | Local multi-provider generation workbench covering provider protocols, model discovery, RunningHub, ComfyUI, canvas workflow import/export, asset library, prompt library, local packaging, update, and rollback. | Use only as behavior and boundary reference. Do not copy source, static assets, workflow JSON, startup scripts, bundled binaries, screenshots, branding, or license text into guga-flow. |
| AI-CanvasPro | `/Users/lienli/Documents/GitHub/video-ref/AI-CanvasPro` | `f19df3e7b0bf3bd16e6065428f52470afd71bf4c` / `0.4.10` | Custom source-available dual license, non-commercial without separate authorization | Node-based multimodal infinite canvas covering text, image, video, audio, 360 panorama, 3D director scene, storyboard/media clips, desktop packaging, local backend routes, provider adapters, and project JSON persistence. | Use as behavior and architecture reference only. Do not copy source, static assets, branding, packaged binaries, generated media, bundled vendor code, screenshots, or license text into guga-flow. Source is heavily minified/obfuscated; prefer token tree and focused indexes before raw files. |

## Verification Commands

```bash
git -C /Users/lienli/Documents/GitHub/video-ref/Toonflow-app rev-parse HEAD
node -p "require('/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/package.json').version"
node -p "require('/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/package.json').license"
git -C /Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas rev-parse HEAD
cat /Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas/VERSION
sed -n '1,80p' /Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas/LICENSE
git -C /Users/lienli/Documents/GitHub/video-ref/AI-CanvasPro rev-parse HEAD
node -p "require('/Users/lienli/Documents/GitHub/video-ref/AI-CanvasPro/package.json').version"
sed -n '1,80p' /Users/lienli/Documents/GitHub/video-ref/AI-CanvasPro/LICENSE
```

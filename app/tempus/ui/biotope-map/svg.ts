import { LAYERS, type El, type LayerId, type Scene } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function render(elements: El[]): string {
  return elements
    .map((el) => {
      if (el.t === "rect") {
        return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${el.f ?? "none"}"${
          el.s ? ` stroke="${el.s}" stroke-width="${el.sw ?? 1}"` : ""
        }/>`;
      }
      if (el.t === "text") {
        return `<text x="${el.x}" y="${el.y}" fill="${el.f}" font-size="${el.size}" letter-spacing="${el.ls ?? 0}" text-anchor="${el.anchor ?? "start"}" font-family="ui-monospace, monospace">${esc(el.str)}</text>`;
      }
      return `<path d="${el.d}" fill="${el.f ?? "none"}"${el.s ? ` stroke="${el.s}"` : ""}${
        el.w ? ` stroke-width="${el.w}"` : ""
      }${el.o !== undefined ? ` opacity="${el.o}"` : ""}${el.dash ? ` stroke-dasharray="${el.dash}"` : ""}/>`;
    })
    .join("");
}

function wrap(scene: Scene, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}"><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}

export function sceneToSvg(scene: Scene): string {
  const groups = LAYERS.map((l) => {
    const els = scene.elements.filter((e) => (e.layer ?? "paper") === l.id);
    if (!els.length) return "";
    return `<g id="${l.id}">${render(els)}</g>`;
  }).join("");
  return wrap(scene, groups);
}

export function layerToSvg(scene: Scene, layer: LayerId): string {
  const els = scene.elements.filter((e) => (e.layer ?? "paper") === layer);
  return wrap(scene, `<g id="${layer}">${render(els)}</g>`);
}

export function downloadLayerSvg(scene: Scene, layer: LayerId, filename: string) {
  download(layerToSvg(scene, layer), filename);
}

function download(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSvg(scene: Scene, filename: string) {
  download(sceneToSvg(scene), filename);
}

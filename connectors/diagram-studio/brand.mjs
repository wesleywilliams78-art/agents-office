// The WRW Hospitality look for a finished Archify page: bone ground, ink and warm-grey lines, WRW red only where the eye
// should go, Newsreader Light titles, Archivo labels, square corners (Brain skill brand-visual-system). Applied to diagram.html
// after Archify has checked and laid it out, so the layout is untouched; the fonts are embedded so the page works anywhere.
// Light theme only: the picture and the page are both light.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'sites', 'wrw-hospitality', 'fonts');
const face = (family, file, weight, style = 'normal') => {
  const f = path.join(FONTS, file);
  if (!fs.existsSync(f)) return '';
  return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format('woff2')}`;
};

export const brandFonts = () => face('Newsreader', 'newsreader-latin-opsz-normal.woff2', '200 800') + face('Archivo', 'archivo-latin-wdth-normal.woff2', '100 900');

// The drawing sits on bone, the same as the page (Wesley, 7 Nov: not white). --mask is the colour label chips paint over lines, so it must match the panel.
const L = 'html[data-preset][data-theme="light"]';
export function brandStyle() {
  return `<style id="wrw-brand">
${brandFonts()}
${L}{
  --bg:#F3F2F2;--grid:#D6D2CF;--panel:#F3F2F2;--panel-border:#D6D2CF;--lane-fill:rgba(214,210,207,.30);--lane-stroke:#D6D2CF;
  --text:#201E1D;--text-muted:#4A4644;--text-dim:#8A8480;--text-faint:#6B6561;--mask:#F3F2F2;
  --frontend-fill:rgba(32,30,29,.05);--frontend-stroke:#201E1D;
  --backend-fill:rgba(74,70,68,.06);--backend-stroke:#4A4644;
  --database-fill:rgba(74,70,68,.04);--database-stroke:#6B6561;
  --cloud-fill:rgba(214,210,207,.45);--cloud-stroke:#8A8480;
  --security-fill:rgba(236,48,19,.07);--security-stroke:#EC3013;
  --messagebus-fill:rgba(182,36,14,.07);--messagebus-stroke:#B6240E;
  --external-fill:rgba(214,210,207,.30);--external-stroke:#6B6561;
  --arrow:#4A4644;--arrow-emphasis:#EC3013;
}
${L} body{background:#F3F2F2!important;background-image:none!important;font-family:Archivo,'Segoe UI',Arial,sans-serif}
${L} h1,${L} .card h3{font-family:Newsreader,Georgia,serif;font-weight:300;letter-spacing:-.01em}
${L} h1{font-size:2rem}
${L} .diagram-container,${L} .card{border-radius:0!important;box-shadow:none!important;border:1px solid #D6D2CF}
${L} .diagram-container{background:#F3F2F2!important}
${L} .diagram-container svg rect{rx:0;ry:0}
${L} .diagram-container svg text,${L} .diagram-container svg tspan{font-family:Archivo,'Segoe UI',Arial,sans-serif!important}
</style>`;
}

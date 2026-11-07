// Diagram studio: the MCP server the office agents (and Claude Code) use to draw workflows, lifecycles, timelines,
// org charts and other concept diagrams as pictures (stdio, JSON-RPC, no dependencies). The engine is Archify; see draw.mjs.
import fs from 'node:fs';
import readline from 'node:readline';
import { draw, guide, ready, ENGINE, STYLES, TYPES } from './draw.mjs';

const TOOLS = [
  { name: 'diagram_guide', description: 'Before you draw: the diagram types and what each is for, or, with `type`, that type\'s exact schema and one worked example to copy the shape from (never its facts). Free; read-only.', inputSchema: { type: 'object', properties: {
    type: { type: 'string', enum: Object.keys(TYPES), description: 'Leave out for the list of types. Give one to get its schema and example.' } } } },
  { name: 'diagram_draw', description: 'Draw a diagram as a picture: a workflow (steps in lanes, approvals, loops), a lifecycle (states), a timeline, a tree (org chart, breakdown), a sequence, a data flow, an architecture map or a service blueprint (what a customer does and sees against the work they never see, with a line between). You give the spec (shape from diagram_guide); the studio checks it, lays it out, checks the result in a real browser and returns the PNG for you to look at, plus an interactive HTML page. If the spec has a problem it is refused with the exact field and fix: correct only that and call again (at most three tries). Default look: editorial style, light theme, in the WRW look (bone ground, ink lines, red only on gates and the main path, Newsreader and Archivo, square corners). Write labels in plain words, 2 to 4 words each, with one short sublabel; show one main path; 6 to 12 nodes reads best; never invent a step, person, figure or date the task did not give you. Free and local; files go to output/library/diagrams.', inputSchema: { type: 'object', required: ['type', 'diagram'], properties: {
    type: { type: 'string', enum: Object.keys(TYPES) },
    diagram: { type: 'object', description: 'The spec, as the schema from diagram_guide describes (lanes, nodes, edges and so on). meta.output, meta.visual_preset and diagram_type are set for you.' },
    title: { type: 'string', description: 'The title on the picture, for example "The weekly content run".' },
    style: { type: 'string', enum: STYLES, description: 'editorial (default): warm, serif title, the closest to the WRW brand. classic, blueprint and signal-flow are technical looks.' },
    theme: { type: 'string', enum: ['light', 'dark'], description: 'light (default) or dark.' },
    brand: { type: 'string', enum: ['wrw', 'archify'], description: 'wrw (default): WRW Hospitality bone, ink and red, Newsreader and Archivo, square corners; applies to editorial light. archify: the engine\'s own warm palette, for work that is not WRW-branded (a country report uses its own colours).' },
    requested_by: { type: 'string', description: 'Your desk name.' } } } },
];

const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = s => ({ isError: true, content: [{ type: 'text', text: s }] });

const tools = {
  diagram_guide(a) {
    if (!ready()) return fail(`The Archify engine is not installed at ${ENGINE}.`);
    if (!a.type) return text({ types: TYPES, next: 'Pick the type that fits the task, then call diagram_guide with it for the schema and an example.' });
    if (!TYPES[a.type]) return fail(`type must be one of: ${Object.keys(TYPES).join(', ')}`);
    return text({ ...guide(a.type), next: 'Write the spec in the example\'s shape with the task\'s own facts, then call diagram_draw. Use the schema\'s exact field names and enum values.' });
  },
  diagram_draw(a) {
    let r; try { r = draw(a); } catch (e) { return fail('Could not draw: ' + (e.message || e)); }
    if (!r.ok) return fail('Fix and call diagram_draw again (change only what is named): ' + r.problems.join(' | '));
    return { content: [
      { type: 'text', text: JSON.stringify({ picture: r.png, page: r.html, folder: r.dir, size: `${r.width} x ${r.height}`, requestedBy: String(a.requested_by || '').slice(0, 60), next: 'Look at the picture now. Check the main path reads left to right or top to bottom, no label is cut or crowded, and nothing important is missing. If one thing is wrong, change the spec and draw again (at most two redraws). Report the picture path.' }, null, 2) },
      { type: 'image', data: fs.readFileSync(r.png).toString('base64'), mimeType: 'image/png' }] };
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'diagram-studio', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? Promise.resolve(t(m.params.arguments || {})).then(ok, e => ok(fail('Internal error: ' + (e.message || e)))) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});

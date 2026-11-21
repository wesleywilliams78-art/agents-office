import JSZip from 'jszip';
import fs from 'fs';
const out = process.argv[2];
const slides = JSON.parse(fs.readFileSync(new URL('./content.json', import.meta.url), 'utf8'));
const E = 914400, GREEN = '055C33', CREAM = 'F7EDE3', CAMEL = 'C29161', RED = '8C171F', WHITE = 'FFFFFF';
const H = 'Avenir', B = 'Open Sans';
const emu = v => Math.round(v * E);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let id = 2;
const run = (t, { sz = 24, b = 0, i = 0, color = GREEN, font = B } = {}) =>
  `<a:r><a:rPr lang="en-US" sz="${sz * 100}" b="${b}" i="${i}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/></a:rPr><a:t>${esc(t)}</a:t></a:r>`;
const para = (runs, { algn = 'l', spc = 0, bullet = false, ln = 100 } = {}) =>
  `<a:p><a:pPr algn="${algn}"${bullet ? ' marL="342900" indent="-342900"' : ' marL="0" indent="0"'}><a:lnSpc><a:spcPct val="${ln * 1000}"/></a:lnSpc><a:spcAft><a:spcPts val="${spc * 100}"/></a:spcAft>${bullet ? `<a:buClr><a:srgbClr val="${CAMEL}"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="&#8226;"/>` : '<a:buNone/>'}</a:pPr>${runs}</a:p>`;
function sp(x, y, w, h, paras, { fill, line, lw = 1, anchor = 't', geom = 'rect', name = 'Text', dash, ins = 0 } = {}) {
  const i = id++;
  const f = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>';
  const l = line ? `<a:ln w="${emu(lw / 72)}"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill>${dash ? '<a:prstDash val="dash"/>' : ''}</a:ln>` : '<a:ln><a:noFill/></a:ln>';
  const insE = emu(ins);
  return `<p:sp><p:nvSpPr><p:cNvPr id="${i}" name="${name} ${i}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="${geom}"><a:avLst/></a:prstGeom>${f}${l}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="${insE}" tIns="${insE}" rIns="${insE}" bIns="${insE}" anchor="${anchor}"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paras || '<a:p><a:endParaRPr lang="en-US"/></a:p>'}</p:txBody></p:sp>`;
}
const rule = (x, y, w, h = 0.04, c = CAMEL) => sp(x, y, w, h, '', { fill: c, name: 'Rule' });

function table(x, y, colW, rows, hdr) {
  const i = id++;
  const cell = (t, head) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>${para(run(t, { sz: 24, b: head ? 1 : 0, color: head ? WHITE : GREEN, font: head ? H : B }))}</a:txBody><a:tcPr marL="${emu(.15)}" marR="${emu(.15)}" marT="${emu(.06)}" marB="${emu(.06)}" anchor="ctr">${['lnL', 'lnR', 'lnT', 'lnB'].map(n => `<a:${n} w="12700"><a:solidFill><a:srgbClr val="${CAMEL}"/></a:solidFill></a:${n}>`).join('')}<a:solidFill><a:srgbClr val="${head ? GREEN : CREAM}"/></a:solidFill></a:tcPr></a:tc>`;
  const tr = (cells, h, head) => `<a:tr h="${emu(h)}">${cells.map(c => cell(c, head)).join('')}</a:tr>`;
  const hs = [0.5, 0.9, 0.65, 1.2];
  const W = colW.reduce((a, b) => a + b, 0);
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${i}" name="Table ${i}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(W)}" cy="${emu(hs.reduce((a, b) => a + b, 0))}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1"/><a:tblGrid>${colW.map(c => `<a:gridCol w="${emu(c)}"/>`).join('')}</a:tblGrid>${tr(hdr, hs[0], true)}${rows.map((r, k) => tr(r, hs[k + 1], false)).join('')}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
}

function slideXml(s) {
  id = 2; let sh = '';
  const L = 0.6, W = 12.13;
  sh += sp(L, 0.4, 4.5, 0.42, para(run(s.tag, { sz: 14, b: 1, color: WHITE, font: H }), { algn: 'ctr' }), { fill: GREEN, anchor: 'ctr', name: 'Section tag' });
  sh += sp(10.13, 0.25, 2.6, 0.85, para(run('Qamaria logo: original file to be supplied', { sz: 11, color: GREEN }), { algn: 'ctr' }), { line: CAMEL, dash: true, anchor: 'ctr', ins: 0.08, name: 'Logo clear space' });
  sh += rule(L, 1.25, W);
  const tagSh = (x, y) => sp(x, y, 2.75, 0.46, para(run('Qamaria to confirm', { sz: 16, b: 1, color: WHITE }), { algn: 'ctr' }), { fill: RED, anchor: 'ctr', name: 'QTC tag' });
  if (s.n !== 1) sh += sp(L, 1.4, s.n === 9 ? 9 : W, 0.95, para(run(s.title, { sz: 40, b: 1, font: H })), { anchor: 'ctr', name: 'Title' });
  if (s.n === 1) {
    sh += sp(L, 2.0, W, 1.3, para(run(s.title, { sz: 64, b: 1, font: H })), { anchor: 'b', name: 'Title' });
    sh += sp(L, 3.45, W, 0.7, para(run(s.blocks[0].t, { sz: 32 })), { name: 'Subtitle' });
    sh += rule(L, 4.3, 2.4, 0.06);
    sh += sp(L, 4.6, W, 0.5, para(run(s.blocks[1].t, { sz: 24, b: 1 })), { name: 'Version' });
    sh += sp(L, 5.2, W, 0.5, para(run(s.blocks[2].t, { sz: 24 })), { name: 'Draft line' });
  } else if (s.n === 2) {
    sh += sp(L, 2.6, W, 4.1, s.blocks[0].t.map(t => para(run(t, { sz: 28 }), { bullet: true, spc: 14 })).join(''), { name: 'Bullets' });
  } else if (s.blocks[0].k === 'quote') {
    const q = s.blocks[0].t, long = q.length > 100;
    const qsz = long ? 34 : 40, qy = 2.7, qh = long ? 2.5 : 2.0;
    sh += rule(L, qy, 0.08, qh);
    sh += sp(L + 0.4, qy, W - 0.4, qh, para(run(q, { sz: qsz, i: 1 }), { ln: 105 }), { anchor: 'ctr', name: 'Quote' });
    let ny = qy + qh + 0.15;
    for (const b of s.blocks.slice(1)) {
      if (b.k === 'attr') { sh += sp(L + 0.4, ny, W - 0.4, 0.5, para(run(b.t, { sz: 24, b: 1 })), { name: 'Attribution' }); ny += 0.6; }
      if (b.k === 'close') { sh += sp(L + 0.4, ny, W - 0.4, 0.6, para(run(b.t, { sz: 32, b: 1, font: H })), { name: 'Closing line' }); ny += 0.7; }
      if (b.k === 'src') { sh += sp(L + 0.4, 6.4, W - 0.4, 0.4, para(run(b.t, { sz: 18 })), { name: 'Source' }); }
    }
  } else if (s.n === 7) {
    sh += tagSh(L, 2.4);
    sh += sp(L, 3.2, W, 2.6, s.blocks[0].t.map(t => para(run(t, { sz: 32 }), { spc: 16 })).join(''), { name: 'Promises' });
    sh += sp(L, 6.2, W, 0.4, para(run(s.blocks[1].t, { sz: 16, i: 1 })), { name: 'Note' });
  } else if (s.n === 8) {
    sh += tagSh(L, 2.4);
    sh += sp(L, 3.2, W, 2.8, para(run(s.blocks[0].t, { sz: 30 }), { spc: 20 }) + para(run(s.blocks[1].t, { sz: 30 })), { name: 'Text' });
    sh += sp(L, 6.2, W, 0.4, para(run(s.blocks[2].t, { sz: 16, i: 1 })), { name: 'Note' });
  } else if (s.n === 9) {
    sh += tagSh(9.98, 1.65);
    const t = s.blocks[0];
    sh += table(L, 2.3, [4.7, 7.43], t.rows, t.h);
    sh += sp(L, 6.05, W, 0.45, para(run(s.blocks[1].t, { sz: 24, b: 1 })), { name: 'Line' });
    sh += sp(L, 6.55, W, 0.35, para(run(s.blocks[2].t, { sz: 16, i: 1 })), { name: 'Note' });
  } else if (s.n === 10) {
    let yy = 2.6;
    for (const t of s.blocks[0].t) {
      sh += sp(L, yy, W, 0.75, para(run(t, { sz: 36, b: 1, font: H })), { anchor: 'b', name: 'Prompt' });
      sh += rule(L, yy + 0.8, W, 0.02);
      yy += 1.1;
    }
    sh += sp(L, 6.0, W, 0.7, para(run(s.blocks[1].t, { sz: 24 })), { name: 'Line' });
  }
  sh += rule(L, 6.95, W, 0.02);
  sh += sp(L, 7.0, 9, 0.35, para(run('Welcome to Qamaria | v1.0 (draft) | Nov 17, 2026', { sz: 12 })), { anchor: 'ctr', name: 'Footer' });
  const i = id++;
  sh += `<p:sp><p:nvSpPr><p:cNvPr id="${i}" name="Slide number"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(11.2)}" y="${emu(7.0)}"/><a:ext cx="${emu(1.53)}" cy="${emu(.35)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="r"/><a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum"><a:rPr lang="en-US" sz="1200"><a:solidFill><a:srgbClr val="${GREEN}"/></a:solidFill><a:latin typeface="${B}"/></a:rPr><a:t>${s.n}</a:t></a:fld></a:p></p:txBody></p:sp>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${CREAM}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${sh}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const solid = `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`;
const theme = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Qamaria"><a:themeElements><a:clrScheme name="Qamaria"><a:dk1><a:srgbClr val="${GREEN}"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="${GREEN}"/></a:dk2><a:lt2><a:srgbClr val="${CREAM}"/></a:lt2><a:accent1><a:srgbClr val="${GREEN}"/></a:accent1><a:accent2><a:srgbClr val="${CAMEL}"/></a:accent2><a:accent3><a:srgbClr val="${RED}"/></a:accent3><a:accent4><a:srgbClr val="${GREEN}"/></a:accent4><a:accent5><a:srgbClr val="${CAMEL}"/></a:accent5><a:accent6><a:srgbClr val="${GREEN}"/></a:accent6><a:hlink><a:srgbClr val="${GREEN}"/></a:hlink><a:folHlink><a:srgbClr val="${GREEN}"/></a:folHlink></a:clrScheme><a:fontScheme name="Qamaria"><a:majorFont><a:latin typeface="${H}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${B}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="o"><a:fillStyleLst>${solid}${solid}${solid}</a:fillStyleLst><a:lnStyleLst><a:ln w="9525">${solid}</a:ln><a:ln w="9525">${solid}</a:ln><a:ln w="9525">${solid}</a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${solid}${solid}${solid}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
const emptyTree = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>';
const cmap = '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = a => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${a.map(([i, t, g]) => `<Relationship Id="${i}" Type="${REL}/${t}" Target="${g}"/>`).join('')}</Relationships>`;
const z = new JSZip();
const ov = (p, t) => `<Override PartName="${p}" ContentType="application/vnd.openxmlformats-officedocument.${t}+xml"/>`;
z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${ov('/ppt/presentation.xml', 'presentationml.presentation.main')}${ov('/ppt/slideMasters/slideMaster1.xml', 'presentationml.slideMaster')}${ov('/ppt/slideLayouts/slideLayout1.xml', 'presentationml.slideLayout')}${ov('/ppt/notesMasters/notesMaster1.xml', 'presentationml.notesMaster')}${ov('/ppt/theme/theme1.xml', 'theme')}${ov('/ppt/theme/theme2.xml', 'theme')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${slides.map(s => ov(`/ppt/slides/slide${s.n}.xml`, 'presentationml.slide') + ov(`/ppt/notesSlides/notesSlide${s.n}.xml`, 'presentationml.notesSlide')).join('')}</Types>`);
z.file('_rels/.rels', rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]).replace('</Relationships>', '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'));
z.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Welcome to Qamaria v1.0</dc:title></cp:coreProperties>');
z.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>${slides.map((s, i) => `<p:sldId id="${256 + i}" r:id="rId${10 + i}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
z.file('ppt/_rels/presentation.xml.rels', rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'notesMaster', 'notesMasters/notesMaster1.xml'], ['rId3', 'theme', 'theme/theme1.xml'], ...slides.map((s, i) => [`rId${10 + i}`, 'slide', `slides/slide${s.n}.xml`])]));
z.file('ppt/theme/theme1.xml', theme()); z.file('ppt/theme/theme2.xml', theme());
z.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${CREAM}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>${emptyTree}</p:spTree></p:cSld>${cmap}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`);
z.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]));
z.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS} type="blank"><p:cSld name="Blank">${emptyTree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
z.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]));
z.file('ppt/notesMasters/notesMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notesMaster ${NS}><p:cSld>${emptyTree}<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="1143000"/><a:ext cx="5486400" cy="3086100"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="4400550"/><a:ext cx="5486400" cy="3600450"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp></p:spTree></p:cSld>${cmap}</p:notesMaster>`);
z.file('ppt/notesMasters/_rels/notesMaster1.xml.rels', rels([['rId1', 'theme', '../theme/theme2.xml']]));
for (const s of slides) {
  z.file(`ppt/slides/slide${s.n}.xml`, slideXml(s));
  z.file(`ppt/slides/_rels/slide${s.n}.xml.rels`, rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'notesSlide', `../notesSlides/notesSlide${s.n}.xml`]]));
  z.file(`ppt/notesSlides/notesSlide${s.n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes ${NS}><p:cSld>${emptyTree}<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${esc(s.notes)}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`);
  z.file(`ppt/notesSlides/_rels/notesSlide${s.n}.xml.rels`, rels([['rId1', 'notesMaster', '../notesMasters/notesMaster1.xml'], ['rId2', 'slide', `../slides/slide${s.n}.xml`]]));
}
fs.writeFileSync(out, await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log('written', out);

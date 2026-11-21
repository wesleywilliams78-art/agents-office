const fs=require('fs');
const R='C:/Users/Wesley/agents-office/';
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,Header,Footer,PageNumber,WidthType,BorderStyle,ShadingType,AlignmentType,TableLayoutType}=require(R+'node_modules/docx');
const src=fs.readFileSync(R+'connectors/sop-builder/qamaria/gaps.js','utf8');
const m={exports:{}};new Function('module','exports',src)(m,m.exports);
const rows=Object.entries(m.exports).filter(([k])=>k.startsWith('us_')).map(([k,v])=>({id:v.id,topic:v.topic,label:v.label,q:v.q}));
const num=r=>parseInt(r.id.slice(1));
rows.sort((a,b)=>num(a)-num(b));
if(rows.length!==31||rows[0].id!=='G61'||rows[30].id!=='G91')throw new Error('bad rows '+rows.length);
const topics=[];for(const r of rows)if(!topics.includes(r.topic))topics.push(r.topic);
topics.sort((a,b)=>Math.min(...rows.filter(r=>r.topic===a).map(num))-Math.min(...rows.filter(r=>r.topic===b).map(num)));
const F='Calibri',FOREST='1C3A2A',GREEN='2F5C43',BAND='ECE4D3',HAIR='D3C9B4';
const run=(t,o={})=>new TextRun({text:t,font:F,...o});
const hair={style:BorderStyle.SINGLE,size:4,color:HAIR};
const borders={top:hair,bottom:hair,left:hair,right:hair};
const W=[1100,2300,4500,3060]; // 10960? page content
const total=W.reduce((a,b)=>a+b,0);
const cell=(i,paras,o={})=>new TableCell({width:{size:W[i],type:WidthType.DXA},borders,margins:{top:80,bottom:80,left:100,right:100},...o,children:paras});
const P=(t,o={},po={})=>new Paragraph({spacing:{after:0},...po,children:[run(t,{size:20,...o})]});
const hdr=new TableRow({tableHeader:true,cantSplit:true,children:['Gap no.','SOP or topic','Question for Qamaria','Answer'].map((t,i)=>cell(i,[P(t,{bold:true,color:'FFFFFF'})],{shading:{type:ShadingType.CLEAR,fill:GREEN,color:'auto'}}))});
const trs=[hdr];
for(const t of topics){
  trs.push(new TableRow({cantSplit:true,children:[new TableCell({columnSpan:4,width:{size:total,type:WidthType.DXA},borders,margins:{top:80,bottom:80,left:100,right:100},shading:{type:ShadingType.CLEAR,fill:BAND,color:'auto'},children:[new Paragraph({keepNext:true,children:[run(t,{bold:true,size:21,color:FOREST})]})]})]}));
  for(const r of rows.filter(r=>r.topic===t)){
    trs.push(new TableRow({cantSplit:true,height:{value:1500,rule:'atLeast'},children:[
      cell(0,[P(r.id,{bold:true,color:GREEN})]),cell(1,[P(r.label)]),cell(2,[P(r.q)]),cell(3,[P('')])]}));
  }
}
const table=new Table({width:{size:total,type:WidthType.DXA},columnWidths:W,layout:TableLayoutType.FIXED,rows:trs});
const h=(t,sz,sp)=>new Paragraph({spacing:{before:sp||240,after:120},keepNext:true,children:[run(t,{bold:true,size:sz,color:FOREST})]});
const ass=['The review date, 17 May 2027, is six months from issue (assumed).','A new starter is briefed once on each SOP, and again when the approved text changes (assumed).','The Site Manager [to confirm] countersigns each briefing log (assumed).','The six chapter names in QUS-SOP-03 come from the 9 Nov 2026 draft framework (to confirm).','The three promises quoted in QUS-SOP-01 come from the 2021 manual as quoted in a gap analysis. They are second-hand.','UK English spelling is kept, as in the Qamaria house format.','Site Manager, Site team and Support office are placeholders, each marked [to confirm].'];
const rule={bottom:{style:BorderStyle.SINGLE,size:8,color:GREEN,space:4}};
const doc=new Document({styles:{default:{document:{run:{font:F,size:22}}}},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1300,bottom:1200,left:723,right:723}}},
  headers:{default:new Header({children:[new Paragraph({border:rule,children:[run('QAMARIA COFFEE | OPERATIONS MANUAL',{bold:true,size:18,color:GREEN})]})]})},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[run('Page ',{size:18,color:GREEN}),new TextRun({children:[PageNumber.CURRENT],font:F,size:18,color:GREEN})]})]})},
  children:[
   new Paragraph({spacing:{after:80},children:[run('Qamaria US operations manual, Chapter 1: gaps and questions',{bold:true,size:40,color:FOREST})]}),
   new Paragraph({border:rule,spacing:{after:240},children:[run('Draft for Qamaria review, 17 November 2026',{size:22,color:GREEN})]}),
   h('Section A: Gaps and questions',28,120),
   new Paragraph({spacing:{after:120},children:[run('Please write your answer in the Answer column.',{size:20})]}),
   table,
   new Paragraph({pageBreakBefore:true,spacing:{after:120},keepNext:true,border:rule,children:[run('Section B: Assumptions to confirm',{bold:true,size:28,color:FOREST})]}),
   ...ass.map((t,i)=>new Paragraph({spacing:{after:100},indent:{left:400,hanging:400},children:[run((i+1)+'.\t',{bold:true,color:GREEN}),run(t)],tabStops:[{type:'left',position:400}]}))
  ]}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('out/QUS Chapter 1 Gaps and Questions v1.0.docx',b);console.log('ok',rows.length,topics)});

const fs=require('fs');
const D=require('docx');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,BorderStyle,AlignmentType,Header,Footer,PageNumber,TabStopType,VerticalAlign,HeightRule}=D;
const CH='424242',OR='FF9711',GR='54595F',F='Calibri',SYM='Segoe UI Symbol',W=9638;
const r=(t,o={})=>new TextRun({text:t,font:F,size:19,color:CH,...o});
const box=(o={})=>new TextRun({text:'☐',font:SYM,size:30,color:CH,...o});
const none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
const line={style:BorderStyle.SINGLE,size:6,color:CH};
const bx={style:BorderStyle.SINGLE,size:8,color:CH};
const chk=(t)=>new Paragraph({spacing:{after:30,line:290,lineRule:'exact'},indent:{left:400,hanging:400},tabStops:[{type:TabStopType.LEFT,position:400}],keepLines:true,
  children:[box(),r('\t'+t)]});
const hourly=()=>new Paragraph({spacing:{after:30,line:290,lineRule:'exact'},indent:{left:400},
  children:[r('Hourly checks:  '),...[0,1,2,3].flatMap(()=>[box(),r(' __:__     ')])]});
const area=(t)=>new Paragraph({keepNext:true,spacing:{before:110,after:50},border:{left:{style:BorderStyle.SINGLE,size:24,color:OR,space:5}},indent:{left:120},
  children:[r(t.toUpperCase(),{bold:true,size:21})]});
const cp=(kids,o={})=>new Paragraph({spacing:{after:0},...o,children:kids});
const mk=(w,kids,o={})=>new TableCell({width:{size:w,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,margins:{top:40,bottom:40,left:100,right:100},
  borders:{top:line,bottom:line,left:line,right:line},children:kids});
function temps(rows){
  const ws=[3638,1500,3000,1500];
  const hdr=new TableRow({tableHeader:true,cantSplit:true,children:['Check','Reading °C','Limit','OK'].map((h,i)=>mk(ws[i],[cp([r(h,{bold:true})],{alignment:i==3?AlignmentType.CENTER:AlignmentType.LEFT})]))});
  const body=rows.map(([name,lim])=>{
    const limit=lim==='freezer'?[cp([r('____ °C',{bold:true})]),cp([r('Site to confirm',{size:14})])]
      :[cp([r(lim,{bold:true})]),cp([r('FSA guidance, site to confirm',{size:14})])];
    return new TableRow({cantSplit:true,height:{value:470,rule:HeightRule.ATLEAST},children:[mk(ws[0],[cp([r(name)])]),mk(ws[1],[cp([r('')])]),mk(ws[2],limit),mk(ws[3],[cp([box()],{alignment:AlignmentType.CENTER})])]});});
  return new Table({width:{size:W,type:WidthType.DXA},columnWidths:ws,rows:[hdr,...body]});
}
const gap=(n=60)=>new Paragraph({spacing:{after:0,line:n,lineRule:'exact'},children:[]});
function fields(names){
  const fw=Math.floor((W-300*(names.length-1))/names.length);
  const cells=[],cw=[];
  names.forEach((n,i)=>{
    cells.push(new TableCell({width:{size:fw,type:WidthType.DXA},verticalAlign:VerticalAlign.BOTTOM,margins:{top:0,bottom:20,left:0,right:0},
      borders:{top:none,left:none,right:none,bottom:line},children:[cp([r(n)])]}));cw.push(fw);
    if(i<names.length-1){cells.push(new TableCell({width:{size:300,type:WidthType.DXA},borders:{top:none,left:none,right:none,bottom:none},children:[cp([])]}));cw.push(300);}
  });
  return new Table({width:{size:W,type:WidthType.DXA},columnWidths:cw,rows:[new TableRow({height:{value:420,rule:HeightRule.ATLEAST},children:cells})]});
}
function signoff(mid){
  const k=[];
  if(mid){
    k.push(cp([r('Outgoing shift leader (name) ______________________   Time ________',{bold:true})],{spacing:{after:60}}));
    k.push(cp([r('Incoming shift leader (name) ______________________   Time ________',{bold:true})],{spacing:{after:60}}));
    k.push(cp([r('Outgoing leaves after incoming signs. No second signature means no handover.',{italics:true})],{spacing:{after:60}}));
  } else k.push(cp([r('Shift leader (name) ______________________   Time ________',{bold:true})],{spacing:{after:60}}));
  k.push(cp([r('Not done, and told the Director of Operations:',{bold:true})],{spacing:{after:80}}));
  k.push(cp([r('_'.repeat(88))],{spacing:{after:80}}));
  k.push(cp([r('_'.repeat(88))]));
  return new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({cantSplit:true,children:[new TableCell({width:{size:W,type:WidthType.DXA},margins:{top:90,bottom:90,left:140,right:140},borders:{top:bx,bottom:bx,left:bx,right:bx},children:k})]})]});
}
const header=()=>new Header({children:[new Paragraph({spacing:{after:0},border:{bottom:{style:BorderStyle.SINGLE,size:12,color:OR,space:3}},children:[
  new TextRun({text:'Imran’s',font:F,size:38,bold:true,italics:true,color:OR}),
  new TextRun({text:'   |   ',font:F,size:16,color:GR}),
  new TextRun({text:'DINER OPERATIONS MANUAL',font:F,size:16,bold:true,color:GR,characterSpacing:40})]})]});
const footer=(s)=>new Footer({children:[new Paragraph({spacing:{after:0},children:[
  r('Imran’s Diner shift checklist  |  '+s+'  |  DRAFT for internal review  |  Page ',{size:18}),
  new TextRun({children:[PageNumber.CURRENT],font:F,size:18,color:CH}),r(' of ',{size:18}),
  new TextRun({children:[PageNumber.TOTAL_PAGES],font:F,size:18,color:CH})]})]});
const title=(t,sub,intro)=>[
  new Paragraph({spacing:{before:120,after:20},children:[r(t,{bold:true,size:48})]}),
  new Paragraph({spacing:{after:80},border:{bottom:{style:BorderStyle.SINGLE,size:6,color:OR,space:3}},children:[r(sub,{bold:true,size:21,characterSpacing:60})]}),
  ...(intro?[new Paragraph({spacing:{before:30,after:40},children:[r(intro,{bold:true})]})]:[]),
];
const note=()=>new Paragraph({spacing:{before:60,after:20},children:[r('A tick means you looked at the thing itself. Never tick a line you did not check.',{italics:true})]});
const T8='8°C or below',T63='63°C or above';
const morning=[
 ...title('MORNING','OPENING','Finish before the doors open at 12 noon.'),
 fields(['Date','Site','Shift leader','Shift start','Shift end']),note(),
 area('Last close'),
 chk('Read last night’s close-down sign-off. Check any blank line yourself.'),
 chk('Gas is off at every appliance and the main valve. No flame at any burner.'),
 area('Fridges and cold room'),
 chk('Raw food on the lowest shelves. Cooked food and sauces above it.'),
 chk('Raw food covered, in closed boxes with lids. Raw chicken lowest of the raw food.'),
 chk('Every item has an in-date label. Bin anything out of date or undated.'),
 chk('No food in reused sauce buckets. Use clear, lidded, labelled boxes.'),
 chk('New stock behind old stock. Use the oldest first.'),
 chk('Allergen food kept apart, in closed, labelled boxes.'),
 area('Temperatures (probe, never the dial)'),
 temps([['Walk-in fridge',T8],['Other fridge',T8],['Freezer','freezer'],['Chilled delivery (if any today)',T8],['Hot-hold unit (when loaded)',T63]]),gap(50),
 chk('All readings written on the temperature log.'),
 chk('Probe tested in iced water this week. Date ______'),
 area('Hand-wash and allergens'),
 chk('Soap and blue roll full at every hand-wash sink. Each sink has its own soap. Bins empty.'),
 chk('Allergen wall chart dated and matches today’s menu.'),
 chk('A test order shows its allergen note on the kitchen screen.'),
 area('Kitchen and team'),
 chk('Flour off the fryer edges. Kitchen screen clear of old orders.'),
 chk('Stock below par noted from the stock app.'),
 chk('Delivery-day items checked in. Leave blank on other days.'),
 chk('Team in. Stations covered: assembly, fryers, front. Absences noted and cover found.'),
 chk('Team briefed: today’s priorities, allergen changes, anything the last shift reported.'),
 gap(90),signoff(false)];
const middle=[
 ...title('MIDDLE','HANDOVER AND PEAK','Handover into the 6pm to 8pm peak.'),
 fields(['Date','Site','Shift leader','Shift start','Shift end']),note(),
 area('Handover sheet'),
 chk('Handover sheet filled: stock below par, prep to do, faults, complaints.'),
 chk('Each complaint from the WhatsApp number copied into the complaint log: date, order, problem, cause.'),
 area('Walk the cold room together'),
 chk('Shelf order: raw on the lowest shelves, cooked food and sauces above.'),
 chk('Every item labelled and in date. No reused sauce buckets.'),
 area('Temperatures'),
 temps([['Walk-in fridge (read together)',T8],['Other fridge',T8],['Hot-hold unit',T63]]),gap(50),
 chk('Readings written on the temperature log, including during service.'),
 area('Hand-wash, fryers and pass'),
 chk('Soap, blue roll and bins checked at every hand-wash sink.'),hourly(),
 chk('Finished orders cleared from the kitchen screen. Flour wiped off fryer edges.'),
 chk('Raw chicken covered when moved. No raw item goes into a fryer holding cooked food.'),
 chk('Pizzas and parmesan dishes checked at the assembly point before they go out.'),
 chk('Allergen chart still matches the menu.'),
 area('Cover and peak'),
 chk('Who covers assembly, fryers and front agreed and written on the sheet.'),
 chk('Team briefed for the peak: stations staffed, breaks planned.'),
 chk('Anything unsafe, broken or short on stock told to the incoming shift leader out loud.'),
 gap(120),signoff(true)];
const evening=[
 ...title('EVENING','CLOSE-DOWN'),
 fields(['Date','Site','Shift leader','Shift start','Shift end','Closing time']),note(),
 area('Gas'),
 chk('Gas off at every appliance and the main gas valve. Look at each burner: no flame. Fan off.'),
 chk('Second person checked the gas. Name ______'),
 area('Food and fridges'),
 chk('Every container of fried chicken, marinade and sauce dated. Bin anything undated.'),
 chk('Raw food on the lowest shelves, covered, in lidded boxes. Cooked food and sauces above.'),
 chk('No food in reused sauce buckets.'),
 area('Temperatures'),
 temps([['Walk-in fridge',T8],['Other fridge',T8],['Freezer','freezer']]),gap(50),
 chk('Readings written on the temperature log.'),
 area('Clean-down'),
 chk('Flour mixer and breading machine cleaned. Flour wiped off fryer edges.'),
 chk('Filters on the checklist washed and recorded.'),
 chk('Every bin emptied. Soap and blue roll refilled at every sink.'),
 chk('Steamer floor, sinks and cold room cleaned, then mopped. Clean means no food or grease left and the surface dry.'),
 chk('Kitchen screen cleared.'),
 area('Records'),
 chk('Each complaint from the WhatsApp number copied into the complaint log.'),
 chk('Delivery-day lines initialled. Leave blank on other days.'),
 chk('Stock below par and prep for tomorrow added to the handover sheet.'),
 area('Lock-up'),
 chk('Sign-off done, then lock up. Lock-up routine: ______'),
 gap(90),signoff(false)];
const sec=(c,s)=>({properties:{page:{size:{width:11906,height:16838},margin:{top:1250,bottom:900,left:1134,right:1134,header:500,footer:400}}},headers:{default:header()},footers:{default:footer(s)},children:c});
const doc=new Document({creator:'Imran’s Diner',title:'Imran’s Diner shift checklists (DRAFT)',styles:{default:{document:{run:{font:F,size:19,color:CH}}}},
 sections:[sec(morning,'MORNING'),sec(middle,'MIDDLE'),sec(evening,'EVENING')]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync(process.argv[2],b);console.log('ok')});

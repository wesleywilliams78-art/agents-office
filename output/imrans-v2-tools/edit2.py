import zipfile,re
D="°"
def build(src,dst,fn):
    zi=zipfile.ZipFile(src); zo=zipfile.ZipFile(dst,"w",zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        data=zi.read(it.filename)
        if it.filename=="word/document.xml": data=fn(data.decode("utf8")).encode("utf8")
        zo.writestr(it,data)
    zo.close()
def rep(x,a,b,n=1):
    a=a.replace("@",D); b=b.replace("@",D); assert x.count(a)==n,(a,x.count(a)); return x.replace(a,b)
EMPTY='<w:t xml:space="preserve"></w:t>'
def sheet(x):
    x=rep(x,"food must reach a safe temperature in the centre. Safe time and temperature combinations (SFBB, Cooking safely, read 19 Nov 2026): 80@C for 6 seconds – 75@C for 30 seconds – 70@C for 2 minutes – 65@C for 10 minutes – 60@C for 45 minutes. ","heat the centre of the food to 75@C and hold it for 30 seconds (FSA SFBB guidance, Cooking safely and Prove it). ") if "–" in x else x
    return x
def sheet(x):
    m=re.search(r"food must reach a safe temperature.*?</w:t>",x,flags=re.S); assert m
    x=x.replace(m.group(0),"heat the centre of the food to 75"+D+'C and hold it for 30 seconds (FSA SFBB guidance, Cooking safely and Prove it). </w:t>')
    x=rep(x,"Reheat once only.</w:t>","Reheat once only (FSA SFBB guidance, Reheating). Source: SFBB (Food Standards Agency), Cooking safely and Reheating safe methods, read 19 Nov 2026.</w:t>")
    # note: that run is bold; split so only first sentence bold is not required
    m=re.search(r'<w:p><w:pPr><w:spacing w:after="90" w:before="60" w:line="240"/></w:pPr><w:r>(?:(?!</w:p>).)*?Combination the site uses.*?</w:p>',x,flags=re.S); assert m
    x=x.replace(m.group(0),"")
    x=rep(x,"(SFBB, Reheating).","(FSA SFBB guidance, Reheating).")
    x=rep(x,"Probe check: </w:t>","Check the probe every week: </w:t>")
    x=rep(x,"(SFBB, Prove it).","(FSA SFBB guidance, Prove it).")
    rows=re.findall(r"<w:tr>.*?</w:tr>",x,flags=re.S); n=0
    for r in rows[1:]:
        cells=re.findall(r"<w:tc>.*?</w:tc>",r,flags=re.S)
        if len(cells)==6 and EMPTY in cells[3]:
            x=x.replace(r,r.replace(cells[3],cells[3].replace(EMPTY,'<w:t xml:space="preserve">75'+D+'C for 30 seconds</w:t>')),1); n+=1
    print("rows filled",n); return x
def sop(x):
    x=rep(x,"Director of Operations","Business owner",3)
    x=rep(x,"Reach one SFBB time and temperature combination in the centre (listed on the sheet). Site default: Site to confirm.","Heat the centre to 75@C and hold it for 30 seconds (FSA SFBB guidance, Cooking safely and Prove it).")
    x=rep(x,"Reheat food once only. Serve at once","Reheat food once only (FSA SFBB guidance, Reheating). Serve at once")
    x=rep(x,"Write the time, item, reading and the combination used. Add","Write the time, item and reading. Add")
    x=rep(x,"If it will not reach the limit,","If it will not reach 75@C for 30 seconds,")
    x=rep(x,"Reheats at the limit","Reheats at 75@C for 30 seconds")
    x=rep(x,">Monthly<",">Weekly<"); x=rep(x,"> (Site to confirm)<","> (FSA SFBB guidance, Prove it)<")
    return x
build("3.6 Reheating Record Sheet.docx","3.6 Reheating Record Sheet v2.docx",sheet)
build("3.6 Reheating One Page SOP.docx","3.6 Reheating One Page SOP v2.docx",sop)

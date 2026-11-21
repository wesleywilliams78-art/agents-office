import re,sys
sys.path.insert(0,"../imrans-v2-tools")
D="°"
import zipfile
def build(src,dst,fn):
    zi=zipfile.ZipFile(src); zo=zipfile.ZipFile(dst,"w",zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        data=zi.read(it.filename)
        if it.filename=="word/document.xml": data=fn(data.decode("utf8")).encode("utf8")
        zo.writestr(it,data)
    zo.close()
def rep(x,a,b,n=1):
    a=a.replace("@",D); b=b.replace("@",D); assert x.count(a)==n,(a,x.count(a)); return x.replace(a,b)
def sheet(x):
    m=re.search(r"chill cooked food down as quickly[^<]*",x); assert m
    new="chill cooked food down as quickly as possible to 8@C or below, then put it in the fridge (FSA SFBB guidance, Chilling down hot food). Target: 8@C or below within 90 minutes of cooking (council guidance, not law). Keep: high-risk ready-to-eat food 3 days in total (cook day plus 2); cooked rice 1 day (FSA SFBB guidance, Ready-to-eat food). Source: SFBB (Food Standards Agency), Chilling down hot food and Ready-to-eat food safe methods, read 19 Nov 2026.".replace("@",D)
    x=x.replace(m.group(0),new)
    x=rep(x,"Probe check: </w:t>","Check the probe every week: </w:t>") if "Probe check: </w:t>" in x else rep(x,"Probe check: iced water","Check the probe every week: iced water")
    return rep(x,"(SFBB, Prove it).","(FSA SFBB guidance, Prove it).")
def sop(x):
    x=rep(x,"Director of Operations","Business owner",4)
    x=rep(x,"as quickly as possible, then into the fridge (SFBB).","as quickly as possible, then into the fridge (FSA SFBB guidance, Chilling down hot food).")
    x=rep(x,">___ minutes (Site to confirm).<",">Aim for 8@C or below within 90 minutes (council guidance, not law).<")
    x=rep(x,"High-risk ready-to-eat food 3 days in total. Cooked rice 1 day.","High-risk ready-to-eat food 3 days in total (cook day plus 2). Cooked rice 1 day (FSA SFBB guidance, Ready-to-eat food).")
    x=rep(x,">monthly (Site to confirm)<",">weekly (FSA SFBB guidance, Prove it)<")
    return x
build("3.6 Cooling Record Sheet.docx","3.6 Cooling Record Sheet v2.docx",sheet)
build("3.6 Cooling One Page SOP.docx","3.6 Cooling One Page SOP v2.docx",sop)

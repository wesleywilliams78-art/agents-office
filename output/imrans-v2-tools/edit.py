import zipfile,sys
D="°"
def build(src,dst,reps):
    zi=zipfile.ZipFile(src); zo=zipfile.ZipFile(dst,"w",zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        data=zi.read(it.filename)
        if it.filename=="word/document.xml":
            x=data.decode("utf8")
            for a,b,n in reps:
                a=a.replace("@",D); b=b.replace("@",D)
                assert x.count(a)==n,(a,x.count(a))
                x=x.replace(a,b)
            data=x.encode("utf8")
        zo.writestr(it,data)
    zo.close()
T=lambda s:'<w:t xml:space="preserve">'+s+'</w:t>'
build("Imrans Diner - Temp Sheet - Delivery - A4 - v1.docx","Imrans Diner - Temp Sheet - Delivery - A4 - v2.docx",[
 ("chilled food 8@C or below. Frozen food -18@C or below. Reject a delivery that has not been kept cold enough. Source: SFBB (Food Standards Agency), Prove it, Chilled storage and Suppliers and contractors safe methods, read 19 Nov 2026.",
  "chilled food 8@C or below (legal requirement for certain chilled foods in England, Wales and Northern Ireland, SFBB Chilled storage and Prove it). Frozen food -18@C or below (FSA SFBB guidance, Prove it). Reject a delivery that has not been kept cold enough (FSA SFBB guidance, Suppliers and contractors). Source: SFBB (Food Standards Agency), Prove it, Chilled storage and Suppliers and contractors safe methods, read 19 Nov 2026.",1),
 ("Keep the invoice: it records what was bought, from whom, how much and the date (SFBB).","Keep the invoice (legal requirement, SFBB Suppliers and contractors): it records what was bought, from whom, how much and the date.",1),
 ("Probe check: iced water -1@C to 1@C, boiling water 99@C to 101@C (SFBB, Prove it).","Check the probe every week: iced water -1@C to 1@C, boiling water 99@C to 101@C (FSA SFBB guidance, Prove it).",1),
 ("confirm with a probe (SFBB, Prove it).","confirm with a probe (FSA SFBB guidance, Prove it).",1)])
build("Imrans Diner - Temp SOP - Delivery - A4 - v1.docx","Imrans Diner - Temp SOP - Delivery - A4 - v2.docx",[
 ("Director of Operations","Business owner",4),
 (">8@C or below (SFBB).<",">8@C or below (legal requirement for certain chilled foods, SFBB Chilled storage and Prove it).<",1),
 ("-18@C or below (SFBB).","-18@C or below (FSA SFBB guidance, Prove it).",1),
 ("reject it and tell the supplier.","reject it and tell the supplier (FSA SFBB guidance, Suppliers and contractors).",1),
 ("Keep the invoice. Write each reading on the sheet.","Keep the invoice (legal requirement, SFBB Suppliers and contractors). Write each reading on the sheet.",1)])
build("3.6 Hot Holding Record Sheet.docx","3.6 Hot Holding Record Sheet v2.docx",[
 (". Source: SFBB (Food Standards Agency), Hot holding safe method"," (legal requirement, SFBB Prove it). Source: SFBB (Food Standards Agency), Hot holding safe method",1),
 ("(SFBB, Prove it). Outside this","(FSA SFBB guidance, Prove it). Outside this",1),
 ("Probe check: </w:t>","Check the probe every week: </w:t>",1)])
build("3.6 Hot Holding One Page SOP.docx","3.6 Hot Holding One Page SOP v2.docx",[
 ("Director of Operations","Business owner",4),
 ("Hot food is kept at 63@C or above (SFBB).","Hot food is kept at 63@C or above (legal requirement, SFBB Prove it).",1),
 (T("Monthly"),T("Weekly"),1),
 (T(" (Site to confirm)"),T(" (FSA SFBB guidance, Prove it)"),1)])

import re,sys,zipfile
src,dst,keep=sys.argv[1],sys.argv[2],int(sys.argv[3])
zi=zipfile.ZipFile(src); zo=zipfile.ZipFile(dst,"w",zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d=zi.read(it.filename)
    if it.filename=="word/document.xml":
        x=d.decode("utf8"); rows=re.findall(r"<w:tr>.*?</w:tr>",x,flags=re.S)
        body=rows[1:]; print(len(body),"->",keep)
        for r in body[keep:]: x=x.replace(r,"",1)
        d=x.encode("utf8")
    zo.writestr(it,d)
zo.close()

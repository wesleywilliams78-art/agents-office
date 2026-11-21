import zipfile,re,glob,sys
for f in sorted(glob.glob(sys.argv[1]+"/*.docx")):
    x=zipfile.ZipFile(f).read("word/document.xml").decode()
    print("=====",f.split("/")[-1].split("\\")[-1],len(x))
    for i,p in enumerate(re.findall(r"<w:p[ >].*?</w:p>",x,flags=re.S)):
        runs=re.findall(r"<w:t[^>]*>(.*?)</w:t>",p,flags=re.S)
        if runs: print(i,len(runs),"|".join(runs))

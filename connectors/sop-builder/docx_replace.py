"""Replace text inside a .docx in place. usage: python docx_replace.py file.docx replacements.json  (a list of {"find","replace"}).
Prints a JSON list of {find, count}. A find may sit anywhere inside one run of text; the formatting of that run is kept."""
import sys, json, zipfile, shutil, os, html
path, spec = sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8'))
z = zipfile.ZipFile(path); names = z.namelist(); parts = {n: z.read(n) for n in names}; infos = {i.filename: i for i in z.infolist()}; z.close()
doc = parts['word/document.xml'].decode('utf-8'); out = []
def esc(t): return html.escape(t, quote=False)
for r in spec:
    f, n = r['find'], r['replace']; c = 0
    for fv, nv in ((esc(f), esc(n)), (esc(f).replace("'", '&apos;'), esc(n).replace("'", '&apos;'))):
        k = doc.count(fv)
        if k: doc = doc.replace(fv, nv); c += k; break
    out.append({'find': f, 'count': c})
parts['word/document.xml'] = doc.encode('utf-8')
tmp = path + '.tmp'
with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as w:
    for n in names: w.writestr(infos[n], parts[n])
shutil.move(tmp, path)
sys.stdout.reconfigure(encoding='utf-8'); print(json.dumps(out))

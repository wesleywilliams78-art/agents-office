"""Edit text inside a .docx in place. usage: python docx_replace.py file.docx edits.json
edits.json is a list of operations, applied in order:
  {"find","replace"}                      every occurrence in the document
  {"find","replace","occurrence": n}      only the nth occurrence (1 = first)
  {"find","replace","row": "text"}        only inside table rows whose text contains "text" (so a label can be changed in one row and not in the header)
  {"delete_row": "text"}                  remove the table row(s) whose text contains "text"
Prints a JSON list of {op, count}. A find may sit anywhere inside one run of text; the formatting of that run is kept."""
import sys, json, zipfile, shutil, html, re
path, spec = sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8'))
z = zipfile.ZipFile(path); names = z.namelist(); parts = {n: z.read(n) for n in names}; infos = {i.filename: i for i in z.infolist()}; z.close()
doc = parts['word/document.xml'].decode('utf-8'); out = []
def esc(t): return html.escape(t, quote=False)
def variants(t): return (esc(t), esc(t).replace("'", '&apos;'))
def rowtext(x): return html.unescape(''.join(re.findall(r'<w:t(?: [^>]*)?>(.*?)</w:t>', x, flags=re.S)))
ROW = re.compile(r'<w:tr[ >].*?</w:tr>', re.S)
def sub_in(text, f, n, occurrence=None):
    for fv, nv in zip(variants(f), variants(n)):
        k = text.count(fv)
        if not k: continue
        if occurrence:
            if occurrence > k: return text, 0
            i = -1
            for _ in range(occurrence): i = text.index(fv, i + 1)
            return text[:i] + nv + text[i + len(fv):], 1
        return text.replace(fv, nv), k
    return text, 0
for r in spec:
    if 'delete_row' in r:
        key = r['delete_row']; c = 0
        def drop(m):
            global c
            if key in rowtext(m.group(0)): c += 1; return ''
            return m.group(0)
        doc = ROW.sub(drop, doc); out.append({'op': 'delete_row ' + key, 'count': c}); continue
    f, n = r['find'], r['replace']
    if r.get('row'):
        c = 0
        def inrow(m):
            global c
            if r['row'] in rowtext(m.group(0)):
                t, k = sub_in(m.group(0), f, n, r.get('occurrence')); c += k; return t
            return m.group(0)
        doc = ROW.sub(inrow, doc)
    else:
        doc, c = sub_in(doc, f, n, r.get('occurrence'))
    out.append({'op': f, 'count': c})
parts['word/document.xml'] = doc.encode('utf-8')
tmp = path + '.tmp'
with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as w:
    for n in names: w.writestr(infos[n], parts[n])
shutil.move(tmp, path)
sys.stdout.reconfigure(encoding='utf-8'); print(json.dumps(out))

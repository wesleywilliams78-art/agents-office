"""Print the paragraph text of a .docx, one paragraph per line (tables included, cells joined with ' | ')."""
import sys; sys.stdout.reconfigure(encoding="utf-8")
import sys, zipfile, re, html
d = zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf8')
def text(x):
    return html.unescape(''.join(re.findall(r'<w:t(?: [^>]*)?>(.*?)</w:t>', x, flags=re.S)))
body = re.sub(r'<w:tbl>.*?</w:tbl>', lambda m: '\n'.join(' | '.join(text(c) for c in re.findall(r'<w:tc>.*?</w:tc>', r, flags=re.S)) for r in re.findall(r'<w:tr[ >].*?</w:tr>', m.group(0), flags=re.S)) + '\n', d, flags=re.S)
for p in re.split(r'</w:p>', body):
    t = text(p) if re.search(r'<w:t[ >]', p) else re.sub(r'<[^>]+>', '', p)
    t = t.strip()
    if t: print(t)

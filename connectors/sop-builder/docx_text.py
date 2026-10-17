"""Print the paragraph text of a .docx, one paragraph per line (tables included, cells joined with ' | ')."""
import sys; sys.stdout.reconfigure(encoding="utf-8")
import sys, zipfile, re, html
d = zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf8')
def text(x):
    return html.unescape(''.join(re.findall(r'<w:t(?: [^>]*)?>(.*?)</w:t>', x, flags=re.S)))
def table(m):  # each row becomes its own paragraph, so the text after the table is not mixed into it
    rows = re.findall(r'<w:tr[ >].*?</w:tr>', m.group(0), flags=re.S)
    return ''.join('<w:p><w:r><w:t>' + html.escape(' | '.join(text(c) for c in re.findall(r'<w:tc>.*?</w:tc>', r, flags=re.S))) + '</w:t></w:r></w:p>' for r in rows)
body = re.sub(r'<w:tbl>.*?</w:tbl>', table, d, flags=re.S)
for p in re.split(r'</w:p>', body):
    t = text(p) if re.search(r'<w:t[ >]', p) else re.sub(r'<[^>]+>', '', p)
    t = t.strip()
    if t: print(t)

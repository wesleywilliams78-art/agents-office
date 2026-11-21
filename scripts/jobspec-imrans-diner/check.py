import pymupdf,glob,zipfile,re,sys
o=sys.argv[1]; pdf=glob.glob(o+'/*.pdf')[0]; dx=glob.glob(o+'/*.docx')[0]
t=''.join(p.get_text() for p in pymupdf.open(pdf))
z=zipfile.ZipFile(dx); x=''.join(z.read(n).decode('utf8') for n in z.namelist() if n.startswith('word/') and n.endswith('.xml'))
tx=re.sub(r'<[^>]+>','',x)
for term in ['WRW','Director of Operations','Tawheed','Subhaan','Rafique','!']:
    print(term, 'pdf:',term in t, 'docx:',term in tx)
print('brackets', re.findall(r'\[[^\]]*\]',t))
print('fonts',set(re.findall(r'w:ascii="([^"]+)"',x)))
print('colours',sorted(set(re.findall(r'w:color="([0-9A-Fa-f]{6})"',x))), sorted(set(re.findall(r'w:fill="([0-9A-Fa-f]{6})"',x))))
print('orange rules', len(re.findall(r'FF9711',x)))
sec=t.split('Essential requirements')[1]
a,b=sec.split('Desirable requirements')
la={l.strip() for l in a.splitlines() if l.strip()}; lb={l.strip() for l in b.splitlines() if l.strip()}
print('shared lines 4/5:', la & lb)

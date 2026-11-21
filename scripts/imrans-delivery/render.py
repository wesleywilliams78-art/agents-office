import pymupdf, glob, sys
for f in glob.glob('output/sops/Imrans Diner - Temp * - Delivery - A4 - v1.pdf'):
    d = pymupdf.open(f)
    tag = 'sheet' if 'Sheet' in f else 'sop'
    print(f, 'pages', len(d))
    sizes = set()
    for b in d[0].get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                if s['text'].strip(): sizes.add((round(s['size'], 1)))
    print('sizes', sorted(sizes))
    d[0].get_pixmap(dpi=100).save(f'output/sops/_{tag}.png')
    d[0].get_pixmap(dpi=100, colorspace=pymupdf.csGRAY).save(f'output/sops/_{tag}_g.png')

import json, sys, pymupdf
out = sys.argv[1]
slides = json.load(open(__file__.replace('handout.py', 'content.json'), encoding='utf-8'))
PW, PH, M = 612, 792, 54
R, Bd = pymupdf.Font('helv'), pymupdf.Font('hebo')
FOOT = 'Welcome to Qamaria | v1.0 (draft) | Nov 17, 2026 | Page %d of 5'
PAD = 12

def wrap(t, font, sz, w):
    lines, cur = [], ''
    for word in t.split(' '):
        tr = (cur + ' ' + word).strip()
        if font.text_length(tr, sz) <= w: cur = tr
        else: lines.append(cur); cur = word
    lines.append(cur)
    return lines

def layout(s, w):
    """returns list of (kind, data, height). w = inner width"""
    items = []
    def txt(t, sz=12, bold=False, gap=6, indent=0, lead=1.3):
        f = Bd if bold else R
        ls = wrap(t, f, sz, w - indent)
        items.append(('txt', (ls, sz, bold, indent), len(ls) * sz * lead + gap))
    items.append(('tag', s['tag'].upper(), 20))
    txt(s['title'], 18, True, 8, lead=1.25)
    if s.get('qtc'): items.append(('qtc', None, 26))
    for b in s['blocks']:
        k = b['k']
        if k == 'sub': txt(b['t'], 14)
        elif k in ('line', 'text', 'attr', 'src'): txt(b['t'], 12, k == 'attr')
        elif k == 'note': txt(b['t'], 12, True)
        elif k == 'close': txt(b['t'], 14, True)
        elif k == 'quote': txt(b['t'], 15, True, 8, lead=1.35)
        elif k == 'bul':
            for t in b['t']: txt('• ' + t, 12, False, 5, 0)
        elif k in ('num', 'fill'):
            for t in b['t']: txt(t, 13 if k == 'fill' else 12, k == 'fill', 6)
        elif k == 'table':
            cw = [w * 0.42, w * 0.58]
            rows = [b['h']] + b['rows']
            cells = []; tot = 0
            for ri, r in enumerate(rows):
                cl = [wrap(c, Bd if ri == 0 else R, 12, cw[ci] - 10) for ci, c in enumerate(r)]
                h = max(len(c) for c in cl) * 15.6 + 8
                cells.append((cl, h, ri == 0)); tot += h
            items.append(('table', (cw, cells), tot + 8))
    return items

def draw(page, s, y0, w_total):
    x0 = M
    w = w_total - 2 * PAD
    items = layout(s, w)
    notes_h = 3 * 20 + 24
    content_h = sum(i[2] for i in items) + PAD * 2
    h = content_h + notes_h
    page.draw_rect(pymupdf.Rect(x0, y0, x0 + w_total, y0 + h), color=(0, 0, 0), width=1)
    y = y0 + PAD
    for kind, d, ih in items:
        if kind == 'tag':
            t = d
            tw = Bd.text_length(t, 11) + 14
            page.draw_rect(pymupdf.Rect(x0 + PAD, y, x0 + PAD + tw, y + 16), color=(0, 0, 0), width=1)
            page.insert_text((x0 + PAD + 7, y + 12), t, fontname='hebo', fontsize=11)
        elif kind == 'qtc':
            t = 'QAMARIA TO CONFIRM'
            tw = Bd.text_length(t, 12) + 14
            page.draw_rect(pymupdf.Rect(x0 + PAD, y + 2, x0 + PAD + tw, y + 20), color=(0, 0, 0), width=1.5)
            page.insert_text((x0 + PAD + 7, y + 15), t, fontname='hebo', fontsize=12)
        elif kind == 'txt':
            ls, sz, bold, ind = d
            yy = y + sz
            for ln in ls:
                page.insert_text((x0 + PAD + ind, yy), ln, fontname='hebo' if bold else 'helv', fontsize=sz)
                yy += sz * (1.35 if sz == 15 else 1.3)
        elif kind == 'table':
            cw, cells = d
            ty = y
            for cl, rh, head in cells:
                cx = x0 + PAD
                for ci, lines in enumerate(cl):
                    page.draw_rect(pymupdf.Rect(cx, ty, cx + cw[ci], ty + rh), color=(0, 0, 0), width=0.75)
                    yy = ty + 4 + 12
                    for ln in lines:
                        page.insert_text((cx + 5, yy), ln, fontname='hebo' if head else 'helv', fontsize=12)
                        yy += 15.6
                    cx += cw[ci]
                ty += rh
        y += ih
    ny = y0 + content_h + 8
    for k in range(3):
        ly = ny + 14 + k * 20
        page.draw_line((x0 + PAD, ly), (x0 + w_total - PAD, ly), color=(0, 0, 0), width=0.5)
    return h

doc = pymupdf.open()
for pi in range(5):
    page = doc.new_page(width=PW, height=PH)
    y = M
    if pi == 0:
        # logo clear-space box (no original file found), grayscale marker
        r = pymupdf.Rect(PW - M - 150, M - 8, PW - M, M + 34)
        page.draw_rect(r, color=(0, 0, 0), width=0.75, dashes='[3 2] 0')
        page.insert_textbox(r + (4, 4, -4, -2), 'Qamaria logo: original file to be supplied', fontname='helv', fontsize=9, align=1)
        y = M + 44
    avail = PH - M - 22 - y
    for si in (2 * pi, 2 * pi + 1):
        h = draw(page, slides[si], y, PW - 2 * M)
        y += h + 14
        if y - 14 > PH - M - 20:
            print('OVERFLOW page', pi + 1, y)
    f = FOOT % (pi + 1)
    page.insert_text(((PW - R.text_length(f, 10)) / 2, PH - M + 8), f, fontname='helv', fontsize=10)
doc.save(out)
print('saved', out)

# Tighten the breaths in Wesley's cloned-voice lines (cap every pause over 0.3 s at 0.2 s). No words cut; word times remapped.
import json, re, subprocess, sys, wave, numpy as np
D = sys.argv[1]
words = json.load(open(f'{D}/words.json'))
CAP, MINP = 0.2, 0.3
for lid in sorted(words):
    f = f'{D}/{lid}.wav'
    out = subprocess.run(['ffmpeg','-hide_banner','-i',f,'-af',f'silencedetect=n=-38dB:d={MINP}','-f','null','-'],capture_output=True,text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    w = wave.open(f); sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels(); a = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, ch); w.close()
    cuts = [(s + CAP / 2, e - CAP / 2) for s, e in zip(st, en) if e - s > MINP and s > 0.05]   # (cut from, cut to), keeping CAP of silence
    pieces, pos = [], 0.0
    for c0, c1 in cuts:
        pieces.append(a[int(pos * sr):int(c0 * sr)]); pos = c1
    pieces.append(a[int(pos * sr):])
    # short crossfade-free join is fine inside silence
    np_out = np.concatenate(pieces)
    w = wave.open(f, 'wb'); w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr); w.writeframes(np_out.tobytes()); w.close()
    def remap(t):
        shift = 0.0
        for c0, c1 in cuts:
            if t >= c1: shift += c1 - c0
            elif t > c0: shift += t - c0
        return round(t - shift, 3)
    for x in words[lid]['words']: x['start'], x['end'] = remap(x['start']), remap(x['end'])
    words[lid]['duration'] = round(len(np_out) / sr, 3)
    print(lid, words[lid]['duration'])
json.dump(words, open(f'{D}/words.json', 'w'), indent=1)
print('total', round(sum(v['duration'] for v in words.values()), 2))

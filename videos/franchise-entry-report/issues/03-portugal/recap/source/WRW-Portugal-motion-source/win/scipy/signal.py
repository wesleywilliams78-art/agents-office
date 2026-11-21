"""lfilter for the one-pole filters music.py and mix.py use: y[n] = b0*x[n] - a1*y[n-1], exact, in numpy (blockwise)."""
import numpy as np
def lfilter(b, a, x):
    b0 = float(b[0]) / float(a[0]); c = -float(a[1]) / float(a[0]) if len(a) > 1 else 0.0
    assert len(b) == 1 and len(a) <= 2, "only one-pole filters are supported"
    x = np.asarray(x, dtype=float); y = np.empty_like(x); L = 256
    k = c ** np.arange(L); carry = 0.0
    for i in range(0, len(x), L):
        xb = x[i:i + L]; n = len(xb)
        yb = b0 * np.convolve(xb, k[:n])[:n] + carry * c ** np.arange(1, n + 1)
        y[i:i + n] = yb; carry = yb[-1]
    return y

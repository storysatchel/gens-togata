#!/usr/bin/env python3
"""Measure how an illustration is rendered, to compare generated plates against book art.

Each metric targets one way generated Blades '68 plates have drifted from the book:

    line       share of the image covered by thin, elongated dark marks — contour lines and
               hatching. The book draws no lines; comic-style plates score high.
    halftone   periodicity of the fine texture (FFT peak-to-median ratio of the high-pass
               luminance). A regular dot screen spikes; random spray grain stays low.
    grain      RMS of the high-pass luminance away from hard edges: how much speckle there is.
    grain_flat/grain_ramp
               the same, inside flat fields and inside gradual transitions. The book keeps
               fields clean and puts its grain in the transitions (spray shading); an all-over
               paper or halftone texture raises grain_flat.
    flat/ramp/edge
               shares of pixels whose smoothed luminance is flat, changing gradually (spray
               gradients, modelled light) or changing abruptly (shape boundaries).
    black/white
               shares of near-black (L* < 12) and near-white (L* > 92) pixels.
    chroma     mean and 90th-percentile Lab chroma.
    colors     k-means colours needed to cover 90% of pixels.
    hues       18-degree hue bins holding >5% of the chromatic pixels.
    border     True when the outer frame is cream paper rather than ink or clean white.

All measurements are taken after resizing so the short side is 1024 px; texture metrics
depend on scale, and book plates are scanned near 2x the resolution of generated ones.

Input is a CSV with columns group,path,crop. crop is optional "x0,y0,x1,y1" in fractions
of the image, used to cut book typography out of the measurement. Paths are relative to
the CSV's directory's parent (so blades_68/images/style-reference.csv uses blades_68/...).

Run:  ~/work/bin/python style_metrics.py <manifest.csv>
      [--out metrics.csv] [--sheet sheet.png]
"""

import argparse
import csv
from pathlib import Path

import cv2
import numpy as np

SHORT_SIDE = 1024


def load(path, crop):
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"cannot read {path}")
    if crop:
        x0, y0, x1, y1 = (float(v) for v in crop.split(","))
        h, w = img.shape[:2]
        img = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    h, w = img.shape[:2]
    s = SHORT_SIDE / min(h, w)
    return cv2.resize(img, (round(w * s), round(h * s)),
                      interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)


def line_share(L8):
    # Black-hat isolates dark marks narrower than the kernel; dots and grain specks are
    # then rejected by size, and blobs by elongation, leaving strokes.
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    bh = cv2.morphologyEx(L8, cv2.MORPH_BLACKHAT, k)
    mask = (bh > 40).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    keep = np.zeros(n, bool)
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 40:
            continue
        if max(w, h) / max(1, min(w, h)) >= 3 or area / (w * h) < 0.35:
            keep[i] = True
    return float(keep[lab].mean())


def halftone_score(L):
    hp = L - cv2.GaussianBlur(L, (0, 0), 3)
    t = 256
    h, w = hp.shape
    yy, xx = np.mgrid[:t, :t] - t // 2
    low = np.hypot(yy, xx) < 12
    win = np.outer(np.hanning(t), np.hanning(t))
    scores = []
    for y in range(0, h - t + 1, t):
        for x in range(0, w - t + 1, t):
            tile = hp[y:y + t, x:x + t]
            if tile.std() < 1.0:
                continue
            spec = np.abs(np.fft.fftshift(np.fft.fft2(tile * win)))
            spec[low] = 0
            v = spec[~low]
            scores.append(np.sort(v)[-8:].mean() / (np.median(v) + 1e-6))
    return float(np.median(scores)) if scores else 0.0


def tone_regions(L, edges):
    g = cv2.GaussianBlur(L, (0, 0), 4)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3) / 8
    mag = np.hypot(gx, gy)
    flat = mag < 0.15
    edge = (mag >= 1.5) | edges
    ramp = ~flat & ~edge
    return flat & ~edges, ramp, edge


def measure(img):
    lab = cv2.cvtColor(img.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    L8 = np.clip(L * 2.55, 0, 255).astype(np.uint8)
    chroma = np.hypot(a, b)

    edges = cv2.dilate(cv2.Canny(cv2.GaussianBlur(L8, (0, 0), 2), 40, 100),
                       np.ones((5, 5), np.uint8)) > 0
    hp = L - cv2.GaussianBlur(L, (0, 0), 1.5)
    rms = lambda m: float(np.sqrt((hp[m] ** 2).mean())) if m.any() else 0.0
    flat, ramp, edge = tone_regions(L, edges)

    px = lab.reshape(-1, 3)[::17]
    k = 12
    _, labels, _ = cv2.kmeans(px, k, None,
                              (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5),
                              3, cv2.KMEANS_PP_CENTERS)
    counts = np.sort(np.bincount(labels.ravel(), minlength=k))[::-1] / len(labels)
    colors = int(np.searchsorted(np.cumsum(counts), 0.9) + 1)

    chromatic = chroma > 15
    hue = (np.degrees(np.arctan2(b, a)) % 360)[chromatic]
    hist = np.bincount((hue // 18).astype(int), minlength=20)
    hues = int((hist / max(1, hist.sum()) > 0.05).sum())

    h, w = L.shape
    m = max(4, int(0.02 * min(h, w)))
    frame = np.concatenate([lab[:m].reshape(-1, 3), lab[-m:].reshape(-1, 3),
                            lab[:, :m].reshape(-1, 3), lab[:, -m:].reshape(-1, 3)])
    fL, fb = frame[:, 0].mean(), frame[:, 2].mean()
    border = bool(fL > 78 and 6 < fb < 30)

    return dict(
        line=line_share(L8), halftone=halftone_score(L), grain=rms(~edges),
        grain_flat=rms(flat), grain_ramp=rms(ramp),
        flat=float(flat.mean()), ramp=float(ramp.mean()), edge=float(edge.mean()),
        black=float((L < 12).mean()), white=float((L > 92).mean()),
        chroma=float(chroma.mean()), chroma90=float(np.percentile(chroma, 90)),
        colors=colors, hues=hues, border=border,
        aspect=round(w / h, 2))


def contact_sheet(rows, imgs, out, cell=300):
    groups = sorted({r["group"] for r in rows})
    per = {g: [i for i, r in enumerate(rows) if r["group"] == g] for g in groups}
    cols = max(len(v) for v in per.values())
    sheet = np.full((len(groups) * (cell + 20), cols * cell, 3), 255, np.uint8)
    for gi, g in enumerate(groups):
        for ci, i in enumerate(per[g]):
            im = imgs[i]
            s = cell / max(im.shape[:2])
            t = cv2.resize(im, (int(im.shape[1] * s), int(im.shape[0] * s)),
                           interpolation=cv2.INTER_AREA)
            y, x = gi * (cell + 20), ci * cell
            sheet[y:y + t.shape[0], x:x + t.shape[1]] = t
            cv2.putText(sheet, Path(rows[i]["path"]).stem[:22], (x + 2, y + cell + 14),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    cv2.imwrite(str(out), sheet)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("manifest")
    ap.add_argument("--out", help="write per-image metrics CSV here")
    ap.add_argument("--sheet", help="write a contact sheet of the measured crops here")
    args = ap.parse_args()

    manifest = Path(args.manifest)
    root = manifest.parent.parent
    rows = list(csv.DictReader(manifest.open()))
    imgs, results = [], []
    for r in rows:
        img = load(root / r["path"], r.get("crop"))
        imgs.append(img)
        results.append({"group": r["group"], "file": Path(r["path"]).name, **measure(img)})

    keys = [k for k in results[0] if k not in ("group", "file")]
    print(f"{'file':28}" + "".join(f"{k:>9}" for k in keys))
    for g in sorted({r["group"] for r in results}):
        sub = [r for r in results if r["group"] == g]
        print(f"--- {g}")
        for r in sub:
            print(f"{r['file'][:28]:28}" + "".join(f"{float(r[k]):9.3f}" for k in keys))
        print(f"{'MEAN ' + g:28}" + "".join(
            f"{np.mean([float(r[k]) for r in sub]):9.3f}" for k in keys))

    if args.out:
        with open(args.out, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(results[0]))
            w.writeheader()
            w.writerows(results)
    if args.sheet:
        contact_sheet(rows, imgs, args.sheet)


if __name__ == "__main__":
    main()

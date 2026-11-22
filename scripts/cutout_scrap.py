#!/usr/bin/env python3
"""
Turn the generated scrapbook stickers and washi tapes (photographed on pure white) into small
transparent WebP cut-outs that sit on any paper.

  public/demo/scrap/*.png  (generated, white background)  ->  public/demo/scrap/*.webp

The studio backdrop (modelled as a smooth plane fitted to the image border) is removed by
flood-filling the region that touches the border and matches it; the soft edge is feathered and
de-fringed so no white halo remains. Light objects
(a white cosmos, a cream paper scrap) keep their own colour because only the border-connected
background is removed.

Run:  python3 scripts/cutout_scrap.py            (needs Pillow and numpy)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SCRAP = ROOT / "public/demo/scrap"
SIZE = 512
# how far (0-255) a pixel may differ from the studio background and still count as background;
# light objects (a white cosmos, a cream paper scrap) need a tighter value
TOLERANCE = {"sticker-flower": 7, "sticker-heart": 8}
DEFAULT_TOL = 18
# objects with holes the backdrop shows through (the inside of a paper clip's loops)
HOLES = {"sticker-clip"}


def background_model(a: np.ndarray) -> np.ndarray:
    """The studio backdrop is never perfectly flat: fit a plane per channel to the outer border."""
    h, w, _ = a.shape
    band = 12
    mask = np.zeros((h, w), bool)
    mask[:band] = mask[-band:] = True
    mask[:, :band] = mask[:, -band:] = True
    ys, xs = np.nonzero(mask)
    A = np.column_stack([np.ones_like(xs), xs / w, ys / h]).astype(np.float64)
    gy, gx = np.mgrid[0:h, 0:w]
    G = np.stack([np.ones_like(gx), gx / w, gy / h], axis=-1).astype(np.float64)
    model = np.empty((h, w, 3))
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, a[ys, xs, c].astype(np.float64), rcond=None)
        model[..., c] = G @ coef
    return model


def fill(mask: np.ndarray, seeds: list, out: np.ndarray) -> int:
    """Flood-fill `mask` from `seeds` into `out` (4-neighbour). Returns the number of pixels filled."""
    h, w = mask.shape
    stack = [s for s in seeds if mask[s] and not out[s]]
    for s in stack:
        out[s] = True
    n = len(stack)
    while stack:
        y, x = stack.pop()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True
                stack.append((ny, nx))
                n += 1
    return n


def cutout(src: Path, dst: Path, tol: int, holes: bool) -> None:
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    dist = np.abs(a - background_model(a)).max(axis=2)  # 0 = exactly the backdrop
    h, w = dist.shape
    near = dist <= tol
    # the backdrop region connected to the border
    bg = np.zeros_like(near)
    fill(near, [(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)], bg)
    if holes:  # plus enclosed backdrop pockets big enough to be holes, not highlights
        for y, x in zip(*np.nonzero(near & ~bg)):
            if bg[y, x]:
                continue
            pocket = np.zeros_like(near)
            if fill(near & ~bg, [(y, x)], pocket) > h * w * 0.002:
                bg |= pocket
            else:
                near[pocket] = False  # small: part of the object, don't revisit
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    # soften the cut by one pixel, then recover edge colours so they don't carry the white
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.1))
    al = np.asarray(alpha).astype(np.float32) / 255.0
    rgb = a.astype(np.float32)
    safe = np.maximum(al, 0.05)[..., None]
    backdrop = background_model(a).astype(np.float32)
    rgb = np.clip((rgb - backdrop * (1.0 - safe)) / safe, 0, 255)
    out = np.dstack([rgb, al * 255.0]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    box = img.getbbox()
    if box:  # trim the empty margin, keep a few pixels of air
        pad = 6
        img = img.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad)))
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    img.save(dst, "WEBP", quality=88, method=6)


def main() -> None:
    files = sorted(SCRAP.glob("*.png"))
    if not files:
        sys.exit("no PNG stickers in public/demo/scrap")
    for f in files:
        tol = TOLERANCE.get(f.stem, DEFAULT_TOL)
        cutout(f, f.with_suffix(".webp"), tol, f.stem in HOLES)
        print(f"{f.name} -> {f.with_suffix('.webp').name} (tolerance {tol})")


if __name__ == "__main__":
    main()

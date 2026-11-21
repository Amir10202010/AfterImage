"""Generate the starting demo photos from PHOTO_PROMPTS.json with Pollinations (keyed API).

Reads POLLINATIONS_API_KEY (and optional POLLINATIONS_MODEL) from .env. The key is sent only
in the Authorization header, never in a URL or log line.

Usage:
  python scripts/gen_photos.py --limit 3        # first 3 missing files
  python scripts/gen_photos.py                  # all missing files
  python scripts/gen_photos.py --ids 1,5,9      # specific ids
  python scripts/gen_photos.py --ids 1 --force  # redo an existing file
Existing files are skipped unless --force. Re-run to resume after a quota stop.
"""
import argparse, io, json, os, random, sys, time, urllib.error, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://gen.pollinations.ai/image/"
SPARE = 1.08      # ask for 8% extra height, cut from the bottom (where a watermark would sit)
MIN_BOTTOM = 0.06
MAX_PIXELS = 1_000_000


def load_env():
    env = {}
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    env.update({k: v for k, v in os.environ.items() if k.startswith("POLLINATIONS_")})
    return env


def request_size(w, h):
    """Target ratio plus spare height, scaled under the model's pixel cap."""
    hh = h * SPARE
    k = min(1.0, (MAX_PIXELS / (w * hh)) ** 0.5)
    return int(w * k) // 16 * 16, int(hh * k) // 16 * 16


def crop_box(w, h, ratio):
    """Same rule as src/lib/imagine.ts cropBox: drop >=6% at the bottom, then trim to the exact ratio."""
    usable = max(1, round(h * (1 - MIN_BOTTOM)))
    if w / usable > ratio:
        cw = round(usable * ratio)
        x = (w - cw) // 2
        return x, 0, x + cw, usable
    return 0, 0, w, min(usable, round(w / ratio))


def finish(data, item):
    im = Image.open(io.BytesIO(data))
    im = im.convert("RGBA" if item["path"].endswith(".png") else "RGB")
    im = im.crop(crop_box(im.width, im.height, item["width"] / item["height"]))
    out = io.BytesIO()
    if item["path"].endswith(".png"):
        im.save(out, "PNG", optimize=True)
    else:
        im.save(out, "JPEG", quality=90, optimize=True, progressive=True)
    return out.getvalue()


def fetch(item, keys, model, retries=4):
    w, h = request_size(item["width"], item["height"])
    q = urllib.parse.urlencode({"model": model, "width": w, "height": h, "seed": random.randint(1, 2**31 - 1)})
    url = BASE + urllib.parse.quote(item["prompt"], safe="") + "?" + q
    for n in range(retries):
        key = keys[n % len(keys)]
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}", "User-Agent": "afterimage-demo/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
                if r.headers.get("Content-Type", "").startswith("image") and len(data) > 5000:
                    return data
                print(f"   unexpected response ({r.headers.get('Content-Type')})", file=sys.stderr)
        except urllib.error.HTTPError as e:
            print(f"   HTTP {e.code}", file=sys.stderr)
            if e.code in (400, 401, 403):
                return None
            if e.code == 402:
                print("   balance or key budget exhausted; resume later", file=sys.stderr)
                raise SystemExit(2)
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"   network: {e}", file=sys.stderr)
        time.sleep(6 * (n + 1))
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--ids", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--pause", type=float, default=1.5)
    a = ap.parse_args()

    env = load_env()
    keys = [k.strip() for k in env.get("POLLINATIONS_API_KEY", "").split(",") if k.strip()]
    if not keys:
        sys.exit("POLLINATIONS_API_KEY is missing in .env")
    model = env.get("POLLINATIONS_MODEL") or "zimage"

    items = json.load(open(os.path.join(ROOT, "PHOTO_PROMPTS.json"), encoding="utf-8"))
    if a.ids:
        want = {int(x) for x in a.ids.split(",")}
        items = [i for i in items if i["id"] in want]
    done = failed = 0
    for it in items:
        out = os.path.join(ROOT, it["path"])
        if os.path.exists(out) and not a.force:
            continue
        if a.limit and done >= a.limit:
            break
        print(f"[{it['id']}] {it['path']}")
        data = fetch(it, keys, model)
        if not data:
            print("   FAILED", file=sys.stderr)
            failed += 1
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "wb") as f:
            f.write(finish(data, it))
        done += 1
        time.sleep(a.pause)
    print(f"saved={done} failed={failed}")


if __name__ == "__main__":
    main()

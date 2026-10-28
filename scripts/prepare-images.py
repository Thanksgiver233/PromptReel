"""裁掉生成图右下角的水印，压缩为 web 用 jpg。

对 assets/ 下所有 *.png 生效：裁掉底部 10%（水印位置），限宽 1200，输出同名 .jpg。
"""
from pathlib import Path
from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "assets"
TARGET_W = 1200

pngs = sorted(ASSETS.glob("*.png"))
if not pngs:
    print("没有待处理的 png")

for src in pngs:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    # 水印固定在底部右下角，裁掉底部约 10%
    im = im.crop((0, 0, w, int(h * 0.90)))
    if im.width > TARGET_W:
        im = im.resize((TARGET_W, round(im.height * TARGET_W / im.width)), Image.LANCZOS)
    out = src.with_suffix(".jpg")
    im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    src.unlink()
    print(f"{out.name}  {im.size[0]}x{im.size[1]}  {out.stat().st_size // 1024}KB")

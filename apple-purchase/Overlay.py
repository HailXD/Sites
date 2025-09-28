from PIL import Image, ImageDraw
import matplotlib.pyplot as plt
from pathlib import Path


def _normalize_box(x1, y1, x2, y2, size):
    w, h = size
    left, top = min(x1, x2), min(y1, y2)
    right, bottom = max(x1, x2), max(y1, y2)
    left = max(0, min(left, w))
    right = max(0, min(right, w))
    top = max(0, min(top, h))
    bottom = max(0, min(bottom, h))
    return left, top, right, bottom


def apply_overlays(img: Image.Image, boxes, fill=(255, 0, 0, 128)) -> Image.Image:
    base = img.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for x1, y1, x2, y2 in boxes:
        left, top, right, bottom = _normalize_box(x1, y1, x2, y2, base.size)
        draw.rectangle([left, top, right, bottom], fill=fill)

    return Image.alpha_composite(base, overlay)


def save_crops(img: Image.Image, items, outdir: Path) -> list[Path]:
    outdir.mkdir(parents=True, exist_ok=True)
    saved_paths = []
    for filename, (x1, y1, x2, y2) in items:
        left, top, right, bottom = _normalize_box(x1, y1, x2, y2, img.size)
        if left == right or top == bottom:
            continue
        crop = img.crop((left, top, right, bottom))
        dest = outdir / filename
        crop.save(dest)
        saved_paths.append(dest)
    return saved_paths


def main():
    store_path = Path("Assets/store.png")
    purchase_path = Path("Assets/purchase.png")
    outdir = Path("Assets")

    if not store_path.exists():
        raise FileNotFoundError(f"Could not find {store_path.resolve()}")
    if not purchase_path.exists():
        raise FileNotFoundError(f"Could not find {purchase_path.resolve()}")

    store_items = [
        ("icon.png", (108, 849, 245, 986)),
    ]
    purchase_items = [
        ("header.png", (60, 1517, 1229, 1625)),
        ("footer.png", (60, 2472, 1229, 2645)),
        ("entry.png", (258, 1812, 1122, 1949)),
    ]

    store_img = Image.open(store_path)
    purchase_img = Image.open(purchase_path)

    save_crops(store_img, store_items, outdir)
    save_crops(purchase_img, purchase_items, outdir)

    header_path = outdir / "header.png"
    footer_path = outdir / "footer.png"
    entry_path = outdir / "entry.png"

    if header_path.exists():
        hdr = Image.open(header_path).convert("RGBA")
        dh = ImageDraw.Draw(hdr)

        length, t, r, b = _normalize_box(63, 0, 285, 28, hdr.size)
        dh.rectangle([length, t, r, b], fill=(28, 28, 30))
        hdr.save(outdir / "header_covered.png")

    if footer_path.exists():
        ftr = Image.open(footer_path).convert("RGBA")
        df = ImageDraw.Draw(ftr)

        length, t, r, b = _normalize_box(890, 89, 1062, 133, ftr.size)
        df.rectangle([length, t, r, b], fill=(44, 44, 46))
        ftr.save(outdir / "footer_covered.png")

    if entry_path.exists():
        ent = Image.open(entry_path).convert("RGBA")
        de = ImageDraw.Draw(ent)
        w, h = ent.size

        length, t, r, b = _normalize_box(0, 10, w, 61, ent.size)
        de.rectangle([length, t, r, b], fill=(44, 44, 46))
        ent.save(outdir / "entry_covered.png")

    store_boxes = [box for _, box in store_items]
    purchase_boxes = [box for _, box in purchase_items]

    store_preview = apply_overlays(store_img, store_boxes, fill=(255, 0, 0, 96))
    purchase_preview = apply_overlays(
        purchase_img, purchase_boxes, fill=(255, 0, 0, 96)
    )

    planned_boxes = [
        (258, 1822, 1122, 1871),
        (60 + 63, 1517 + 0, 60 + 241, 1517 + 28),
        (60 + 890, 2472 + 89, 60 + 1062, 2472 + 129),
    ]
    purchase_preview = apply_overlays(
        purchase_preview, planned_boxes, fill=(0, 128, 255, 96)
    )

    show = False
    if show:
        fig, axes = plt.subplots(1, 2, figsize=(12, 8))
        axes[0].imshow(store_preview)
        axes[0].set_title("store.png (crops in red)")
        axes[0].axis("off")

        axes[1].imshow(purchase_preview)
        axes[1].set_title("purchase.png (crops red, covers blue)")
        axes[1].axis("off")

        plt.tight_layout()
        plt.show()


if __name__ == "__main__":
    main()

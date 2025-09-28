from __future__ import annotations

from pathlib import Path
from typing import Iterable, Tuple
from PIL import Image, ImageDraw, ImageFont
import argparse
import random


# ---------- Helpers ----------


RGBA = Tuple[int, int, int, int]


ASSETS = Path("Assets")
OUTPUT_DIR = Path("Output")


def _to_output_path(p: Path | str) -> Path:
    """Ensure all outputs are written inside the Output/ directory.

    The original filename is preserved (basename only). Creates the directory if missing.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    p = Path(p)
    return OUTPUT_DIR / p.name


def _font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def _add_border(img: Image.Image, pad: int = 60, color: RGBA = (28, 28, 30, 255)) -> Image.Image:
    img = img.convert("RGBA")
    bordered = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), color)
    bordered.paste(img, (pad, pad), img)
    return bordered


def _vstack(images: Iterable[Image.Image]) -> Image.Image:
    imgs = [im.convert("RGBA") for im in images]
    width = max(im.width for im in imgs)
    height = sum(im.height for im in imgs)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    y = 0
    for im in imgs:
        canvas.paste(im, (0, y), im)
        y += im.height
    return canvas


# ---------- Building blocks (in-memory) ----------


def render_entry(
    *,
    title_text: str,
    price_text: str,
    entry_path: Path | str = ASSETS / "entry_covered.png",
    icon_path: Path | str = ASSETS / "icon.png",
    left_pad: int = 60,
    right_pad: int = 108,
    pad_color: RGBA = (44, 44, 46, 255),
) -> Image.Image:
    base = Image.open(entry_path).convert("RGBA")

    # Extend right by 1px to match prior logic
    base_plus = Image.new("RGBA", (base.width + 1, base.height), pad_color)
    base_plus.paste(base, (0, 0))
    base = base_plus

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Title
    title_font = _font(r"Assets\Fonts\OpenType\SF-Pro-Display-Regular.otf", 53)
    draw.text((36, 0), title_text, font=title_font, fill=(255, 255, 255, 255))

    # Right-aligned price
    price_font = _font(r"Assets\Fonts\OpenType\SF-Pro-Display-Regular.otf", 51)
    anchor_right_x = 866
    top_y = 2
    price_bbox = draw.textbbox((0, 0), price_text, font=price_font)
    price_w = price_bbox[2] - price_bbox[0]
    price_x = anchor_right_x - price_w
    draw.text((price_x, top_y), price_text, font=price_font, fill=(160, 160, 160, 255))

    composited = Image.alpha_composite(base, overlay)

    # optional icon prepend
    icon_path = Path(icon_path)
    if icon_path.exists():
        icon_img = Image.open(icon_path).convert("RGBA")
        new_h = max(icon_img.height, composited.height)
        new_w = icon_img.width + composited.width
        canvas = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))
        icon_y = (new_h - icon_img.height) // 2
        comp_y = (new_h - composited.height) // 2
        canvas.paste(icon_img, (0, icon_y), icon_img)
        canvas.paste(composited, (icon_img.width, comp_y), composited)
        composited = canvas

    # Surround left/right padding (reduce right by 1 due to +1 extension earlier)
    adjusted_right_pad = max(0, right_pad - 1)
    padded_w = composited.width + left_pad + adjusted_right_pad
    padded_h = composited.height
    outer = Image.new("RGBA", (padded_w, padded_h), pad_color)
    outer.paste(composited, (left_pad, 0), composited)
    return outer


def render_header(*, header_date_text: str, header_src: Path | str = ASSETS / "header_covered.png") -> Image.Image:
    header_img = Image.open(header_src).convert("RGBA")
    header_overlay = Image.new("RGBA", header_img.size, (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(header_overlay)
    header_font = _font(r"Assets\Fonts\OpenType\SF-Pro-Text-Regular.otf", 38)
    hdraw.text((61, -9), header_date_text, font=header_font, fill=(153, 152, 158, 255))
    return Image.alpha_composite(header_img, header_overlay)


def render_footer(*, footer_total_text: str, footer_src: Path | str = ASSETS / "footer_covered.png") -> Image.Image:
    footer_img = Image.open(footer_src).convert("RGBA")
    f_overlay = Image.new("RGBA", footer_img.size, (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(f_overlay)
    f_font = _font(r"Assets\Fonts\OpenType\SF-Pro-Display-Medium.otf", 51)
    anchor_right_x = 1064
    top_y = 80
    bbox = fdraw.textbbox((0, 0), footer_total_text, font=f_font)
    text_w = bbox[2] - bbox[0]
    x_pos = anchor_right_x - text_w
    fdraw.text((x_pos, top_y), footer_total_text, font=f_font, fill=(255, 255, 255, 255))
    return Image.alpha_composite(footer_img, f_overlay)


def build_single_receipt(
    *,
    title_text: str,
    price_text: str,
    header_date_text: str,
    footer_total_text: str,
) -> Image.Image:
    header = render_header(header_date_text=header_date_text)
    entry = render_entry(title_text=title_text, price_text=price_text)
    footer = render_footer(footer_total_text=footer_total_text)
    return _vstack([header, entry, footer])


def _random_title() -> str:
    titles = [
        "Cat Food Pack",
        "Booster Bundle",
        "Energy Refill",
        "Special Gems",
        "Premium Ticket",
        "Rare Capsule",
        "XP Booster",
    ]
    return random.choice(titles)


def _random_price(prefix: str = "S$") -> str:
    values = [
        "0.98",
        "1.28",
        "1.98",
        "2.58",
        "2.98",
        "3.98",
        "4.98",
        "5.98",
        "7.98",
        "9.98",
        "12.98",
        "19.98",
        "108.98",
    ]
    return f"{prefix} {random.choice(values)}"


def _random_date() -> str:
    days = ["01", "03", "07", "11", "14", "17", "21", "24", "28"]
    months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    years = ["2015", "2016", "2017"]
    return f"{random.choice(days)} {random.choice(months)} {random.choice(years)}"


def build_random_receipt() -> Image.Image:
    return build_single_receipt(
        title_text=_random_title(),
        price_text=_random_price(),
        header_date_text=_random_date(),
        footer_total_text=_random_price(),
    )


# ---------- Generators (match legacy outputs) ----------


def generate_single(output: Path) -> Path:
    """Equivalent of Create.py -> final.png, with 60px border added."""
    img = build_single_receipt(
        title_text="Limited Sale: Platinum",
        price_text="S$ 108.98",
        header_date_text="21 JAN 2016",
        footer_total_text="S$ 2.58",
    )
    img = _add_border(img, 60, (28, 28, 30, 255))
    img.save(output)
    return output


def generate_two_entries(output: Path) -> Path:
    """Equivalent of Create2.py -> final2.png, with 60px border added."""
    header = render_header(header_date_text="21 JAN 2016")
    entry = render_entry(title_text="Limited Sale: Platinum", price_text="S$ 108.98")
    footer = render_footer(footer_total_text="S$ 2.58")

    spacer = Image.new("RGBA", (entry.width, 48), (44, 44, 46, 255))
    middle = _vstack([entry, spacer, entry])
    img = _vstack([header, middle, footer])
    img = _add_border(img, 60, (28, 28, 30, 255))
    img.save(output)
    return output


def generate_two_receipts(output: Path, *, seed: int | None = None) -> Path:
    """Equivalent of create3.py -> final3.png, with 60px border added."""
    if seed is not None:
        random.seed(seed)
    else:
        random.seed()

    top = build_random_receipt()
    bottom = build_random_receipt()
    spacer = Image.new("RGBA", (max(top.width, bottom.width), 100), (28, 28, 30, 255))
    img = _vstack([top, spacer, bottom])
    img = _add_border(img, 60, (28, 28, 30, 255))
    img.save(output)
    return output


def _price_cents_from_text(text: str) -> int:
    # Expect formats like "S$ 12.98" or "12.98"; extract digits
    s = text.strip()
    # Remove currency prefix if present
    if s.upper().startswith("S$"):
        s = s[2:].strip()
    # Now s is like "12.98" or "108.98"
    if "." in s:
        whole, frac = s.split(".", 1)
        frac = (frac + "00")[:2]
    else:
        whole, frac = s, "00"
    try:
        return int(whole) * 100 + int(frac)
    except ValueError:
        return 0


def _format_cents(cents: int, prefix: str = "S$") -> str:
    return f"{prefix} {cents/100:.2f}"


def build_receipt_three_entries(*, header_date_text: str) -> Image.Image:
    """Build a single receipt with exactly three entries and a correct footer total."""
    # Generate three random items
    titles = [_random_title() for _ in range(3)]
    price_texts = [_random_price() for _ in range(3)]
    price_cents = [_price_cents_from_text(t) for t in price_texts]
    total = sum(price_cents)
    total_text = _format_cents(total)

    header = render_header(header_date_text=header_date_text)
    entries = [render_entry(title_text=t, price_text=p) for t, p in zip(titles, price_texts)]
    spacer = Image.new("RGBA", (entries[0].width, 48), (44, 44, 46, 255))

    middle = _vstack([entries[0], spacer, entries[1], spacer, entries[2]])
    footer = render_footer(footer_total_text=total_text)
    return _vstack([header, middle, footer])


def generate_two_receipts_three_entries(output: Path, *, seed: int | None = None) -> Path:
    """Two receipts stacked, each with 3 entries. Newest date on top, oldest at bottom."""
    if seed is not None:
        random.seed(seed)
    else:
        random.seed()

    # Create two dates and order newest (max) to oldest (min)
    def date_tuple_from_text(s: str) -> Tuple[int, int, int]:
        # "21 JAN 2016" -> (2016, 1, 21)
        day, mon, year = s.split()
        months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
        m = months.index(mon.upper()) + 1 if mon.upper() in months else 1
        return (int(year), m, int(day))

    d1 = _random_date()
    d2 = _random_date()
    # Ensure they are not identical to better show ordering; if equal, tweak second
    if d2 == d1:
        d2 = _random_date()
    # Sort by tuple descending (newest first)
    top_date, bottom_date = sorted([d1, d2], key=lambda s: date_tuple_from_text(s), reverse=True)

    top = build_receipt_three_entries(header_date_text=top_date)
    bottom = build_receipt_three_entries(header_date_text=bottom_date)

    spacer = Image.new("RGBA", (max(top.width, bottom.width), 100), (28, 28, 30, 255))
    img = _vstack([top, spacer, bottom])
    img = _add_border(img, 60, (28, 28, 30, 255))
    img.save(output)
    return output


# ---------- CLI ----------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Apple-style receipt images.")
    sub = parser.add_subparsers(dest="cmd")

    p1 = sub.add_parser("single", help="Generate a single-entry receipt (final.png)")
    p1.add_argument("--out", type=Path, default=Path("final.png"))

    p2 = sub.add_parser("two-entries", help="Generate receipt with two identical entries (final2.png)")
    p2.add_argument("--out", type=Path, default=Path("final2.png"))

    p3 = sub.add_parser(
        "two-receipts",
        help="Generate two independent receipts stacked with spacer (final3.png)",
    )
    p3.add_argument("--out", type=Path, default=Path("final3.png"))
    p3.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")

    p4 = sub.add_parser(
        "two-receipts-three-entries",
        help="Two receipts, each with three entries; newest date on top",
    )
    p4.add_argument("--out", type=Path, default=Path("final_2x3.png"))
    p4.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")

    return parser.parse_args()


def interactive_choice() -> str:
    print("Select what to generate:")
    print("  1) single        - Single-entry receipt (final.png)")
    print("  2) two-entries   - Receipt with two identical entries (final2.png)")
    print("  3) two-receipts  - Two random receipts stacked (final3.png)")
    print("  4) two-receipts-three-entries - Two receipts, three entries each (final_2x3.png)")
    while True:
        sel = input("Enter 1/2/3/4: ").strip()
        if sel in {"1", "2", "3", "4"}:
            return {
                "1": "single",
                "2": "two-entries",
                "3": "two-receipts",
                "4": "two-receipts-three-entries",
            }[sel]
        print("Invalid choice. Please enter 1, 2, 3, or 4.")


def main() -> None:
    ns = parse_args()
    cmd = ns.cmd or interactive_choice()

    if cmd == "single":
        requested = ns.out if hasattr(ns, "out") else Path("final.png")
        out = generate_single(_to_output_path(requested))
    elif cmd == "two-entries":
        requested = ns.out if hasattr(ns, "out") else Path("final2.png")
        out = generate_two_entries(_to_output_path(requested))
    elif cmd == "two-receipts":
        seed = ns.seed if hasattr(ns, "seed") else None
        requested = ns.out if hasattr(ns, "out") else Path("final3.png")
        out = generate_two_receipts(_to_output_path(requested), seed=seed)
    elif cmd == "two-receipts-three-entries":
        seed = ns.seed if hasattr(ns, "seed") else None
        requested = ns.out if hasattr(ns, "out") else Path("final_2x3.png")
        out = generate_two_receipts_three_entries(_to_output_path(requested), seed=seed)
    else:
        raise SystemExit(f"Unknown command: {cmd}")

    print(f"Saved: {Path(out).resolve()}")


if __name__ == "__main__":
    main()

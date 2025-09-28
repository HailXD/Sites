from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import tkinter as tk
from tkinter import ttk, messagebox

try:
    # Tk >= 8.6 supports PNG in PhotoImage; PIL not strictly required for preview.
    from PIL import Image, ImageDraw, ImageFont, ImageTk  # type: ignore
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False


# --- Config ---
ASSETS_DIR = Path("Assets")
ENTRY_IMAGE = ASSETS_DIR / "entry.png"
HEADER_IMAGE = ASSETS_DIR / "header.png"
FOOTER_IMAGE = ASSETS_DIR / "footer.png"
DEFAULT_FILL_RGBA = (255, 0, 0, 128)
DEFAULT_TEXT = "New Text"


@dataclass
class TextProps:
    text: str = DEFAULT_TEXT
    x: int = 100
    y: int = 40
    font_path: Optional[Path] = None
    font_size: int = 28
    fill: Tuple[int, int, int, int] = DEFAULT_FILL_RGBA


@dataclass
class TextItem:
    props: TextProps
    tag: str
    # PIL-backed rendering (accurate fonts)
    image_id: Optional[int] = None
    photo: Optional[object] = None  # keep PhotoImage alive
    # Fallback Tk text id (used if Pillow unavailable)
    text_id: Optional[int] = None
    rect_id: Optional[int] = None
    handle_ids: Dict[str, int] = field(default_factory=dict)


class TextOverlayGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Text Overlay GUI")

        # Choose initial base image (entry/header/footer), preferring entry.png
        candidates = [ENTRY_IMAGE, HEADER_IMAGE, FOOTER_IMAGE]
        existing = [p for p in candidates if p.exists()]
        if not existing:
            messagebox.showerror(
                "Missing Images",
                "Could not find any base image in Assets (entry.png, header.png, footer.png).",
            )
            self.destroy()
            return

        self.base_image_path: Path = existing[0]
        # Zoom state (model coordinates remain in base pixels)
        self.scale: float = 1.0

        # Load background image for the selected base
        self._load_background(self.base_image_path)

        self.font_options = self._scan_sf_fonts()
        self.items: List[TextItem] = []
        self.selected: Optional[TextItem] = None

        self._build_ui()
        self._bind_canvas_events()

    # --- Font scanning ---
    def _scan_sf_fonts(self) -> Dict[str, Path]:
        candidates: List[Path] = []
        for sub in [ASSETS_DIR / "Fonts" / "TrueType", ASSETS_DIR / "Fonts" / "OpenType", ASSETS_DIR / "Fonts"]:
            if sub.exists():
                for ext in ("*.ttf", "*.otf"):
                    candidates.extend(sub.rglob(ext))
        mapping: Dict[str, Path] = {}
        for p in candidates:
            name = p.name
            if "SF" in name or "San" in name or "Pro" in name:
                # Create human-readable name without extension
                disp = name.rsplit(".", 1)[0]
                mapping[disp] = p
        return dict(sorted(mapping.items()))

    # --- Background handling ---
    def _label_for_path(self, p: Path) -> str:
        try:
            for k, v in self.base_options.items():
                if p == v:
                    return k
        except Exception:
            pass
        return p.name

    def _load_background(self, img_path: Path) -> None:
        """Load base image and prepare for scaled rendering."""
        if PIL_AVAILABLE:
            self.bg_pil = Image.open(img_path).convert("RGBA")
            self.base_w, self.base_h = self.bg_pil.size
            self._make_scaled_background()
        else:
            # Fallback without PIL: keep a PhotoImage, no smooth zoom support
            self.bg_pil = None  # type: ignore
            self.bg_img = tk.PhotoImage(file=str(img_path))
            self.base_w = self.bg_w = self.bg_img.width()
            self.base_h = self.bg_h = self.bg_img.height()

    def _make_scaled_background(self) -> None:
        """Create a scaled PhotoImage from the base PIL image according to self.scale."""
        if PIL_AVAILABLE and getattr(self, "bg_pil", None) is not None:
            w = max(1, int(round(self.base_w * self.scale)))
            h = max(1, int(round(self.base_h * self.scale)))
            scaled = self.bg_pil.resize((w, h), Image.LANCZOS)
            self.bg_img = ImageTk.PhotoImage(scaled)
            self.bg_w, self.bg_h = w, h
        else:
            # Without PIL, don't rescale (keep original)
            self.bg_w = self.base_w
            self.bg_h = self.base_h

    def _apply_zoom(self) -> None:
        """Apply current zoom to background and redraw items."""
        self._make_scaled_background()
        # Update canvas size and background image
        self.canvas.config(width=self.bg_w, height=self.bg_h)
        self.canvas.delete("background")
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.bg_img, tags=("background",))
        # Adjust window geometry to fit new background width/height
        try:
            self.geometry(f"{self.bg_w + 380}x{max(self.bg_h, 520)}")
        except Exception:
            pass
        # Redraw items to ensure they appear over the new background
        for it in self.items:
            self._draw_item(it)
        self._update_code_boxes()

    def on_base_change(self, _event=None) -> None:
        label = self.var_base.get()
        new_path = self.base_options.get(label)
        if not new_path or not new_path.exists():
            messagebox.showerror("Missing Image", f"Could not find: {new_path}")
            # reset selection to previous valid
            self.var_base.set(self._label_for_path(self.base_image_path))
            return
        self.base_image_path = new_path
        self._load_background(self.base_image_path)
        self._apply_zoom()

    # --- UI ---
    def _build_ui(self) -> None:
        self.geometry(f"{self.bg_w + 380}x{max(self.bg_h, 520)}")
        self.resizable(True, True)

        root = ttk.Frame(self)
        root.pack(fill=tk.BOTH, expand=True)

        # Canvas area
        canvas_frame = ttk.Frame(root)
        canvas_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.canvas = tk.Canvas(canvas_frame, width=self.bg_w, height=self.bg_h, bg="#222", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.bg_img, tags=("background",))

        # Sidebar controls
        side = ttk.Frame(root, padding=8)
        side.pack(side=tk.RIGHT, fill=tk.Y)

        # Base image selector
        ttk.Label(side, text="Base Image").pack(anchor=tk.W)
        self.base_options = {
            "entry.png": ENTRY_IMAGE,
            "header.png": HEADER_IMAGE,
            "footer.png": FOOTER_IMAGE,
        }
        self.var_base = tk.StringVar(value=self._label_for_path(self.base_image_path))
        self.base_combo = ttk.Combobox(
            side,
            values=list(self.base_options.keys()),
            textvariable=self.var_base,
            state="readonly",
        )
        self.base_combo.pack(fill=tk.X)
        self.base_combo.bind("<<ComboboxSelected>>", self.on_base_change)

        # Zoom controls
        ttk.Label(side, text="Zoom").pack(anchor=tk.W, pady=(8, 0))
        self.var_zoom = tk.IntVar(value=int(self.scale * 100))
        self.zoom_scale = ttk.Scale(
            side,
            from_=25,
            to=400,
            value=self.var_zoom.get(),
            command=lambda v: self.on_zoom_change(v),
        )
        self.zoom_scale.pack(fill=tk.X)

        btns = ttk.Frame(side)
        btns.pack(fill=tk.X)
        ttk.Button(btns, text="Add Text", command=self.add_text_item).pack(side=tk.LEFT)
        ttk.Button(btns, text="Delete", command=self.delete_selected).pack(side=tk.LEFT, padx=(8, 0))
        ttk.Button(btns, text="Export PNG", command=self.export_png).pack(side=tk.RIGHT)

        ttk.Separator(side).pack(fill=tk.X, pady=8)

        # List of items
        ttk.Label(side, text="Texts").pack(anchor=tk.W)
        self.listbox = tk.Listbox(side, height=6)
        self.listbox.pack(fill=tk.X)
        self.listbox.bind("<<ListboxSelect>>", self.on_list_select)

        ttk.Separator(side).pack(fill=tk.X, pady=8)

        # Editor fields
        self.var_text = tk.StringVar()
        self.var_font_size = tk.IntVar(value=28)
        self.var_x = tk.IntVar(value=100)
        self.var_y = tk.IntVar(value=40)

        ttk.Label(side, text="Text").pack(anchor=tk.W)
        ttk.Entry(side, textvariable=self.var_text).pack(fill=tk.X)

        row1 = ttk.Frame(side)
        row1.pack(fill=tk.X, pady=4)
        ttk.Label(row1, text="Font size").pack(side=tk.LEFT)
        ttk.Spinbox(row1, from_=6, to=300, textvariable=self.var_font_size, width=6, command=self.apply_field_changes).pack(side=tk.LEFT, padx=6)

        row2 = ttk.Frame(side)
        row2.pack(fill=tk.X, pady=4)
        ttk.Label(row2, text="X").pack(side=tk.LEFT)
        ttk.Spinbox(row2, from_=0, to=9999, textvariable=self.var_x, width=6, command=self.apply_field_changes).pack(side=tk.LEFT, padx=6)
        ttk.Label(row2, text="Y").pack(side=tk.LEFT)
        ttk.Spinbox(row2, from_=0, to=9999, textvariable=self.var_y, width=6, command=self.apply_field_changes).pack(side=tk.LEFT, padx=6)

        ttk.Label(side, text="Font").pack(anchor=tk.W, pady=(6, 0))
        self.font_combo = ttk.Combobox(side, values=list(self.font_options.keys()), state="readonly")
        if self.font_options:
            # Prefer SF Pro Text Regular if available
            pref = next((k for k in self.font_options if "Text-Regular" in k or "Text Regular" in k), None)
            self.font_combo.set(pref or list(self.font_options.keys())[0])
        self.font_combo.pack(fill=tk.X)
        self.font_combo.bind("<<ComboboxSelected>>", lambda e: self.apply_field_changes())

        ttk.Button(side, text="Apply Changes", command=self.apply_field_changes).pack(anchor=tk.E, pady=6)

        ttk.Separator(side).pack(fill=tk.X, pady=8)

        ttk.Label(side, text="Code (selected)").pack(anchor=tk.W)
        self.code_selected = tk.Text(side, height=8, wrap=tk.NONE)
        self.code_selected.configure(font=("Consolas", 9))
        self.code_selected.pack(fill=tk.X)

        ttk.Label(side, text="Code (all)").pack(anchor=tk.W, pady=(6, 0))
        self.code_all = tk.Text(side, height=10, wrap=tk.NONE)
        self.code_all.configure(font=("Consolas", 9))
        self.code_all.pack(fill=tk.X)

    # --- Canvas and interactions ---
    def _bind_canvas_events(self) -> None:
        self.canvas.bind("<Button-1>", self.on_canvas_down)
        self.canvas.bind("<B1-Motion>", self.on_canvas_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_canvas_up)
        # Zoom via Ctrl + MouseWheel (Windows/macOS) and Ctrl + Button-4/5 (X11)
        self.canvas.bind("<Control-MouseWheel>", self.on_mousewheel_zoom)
        self.canvas.bind("<Control-Button-4>", lambda e: self.on_mousewheel_zoom(e, delta=120))
        self.canvas.bind("<Control-Button-5>", lambda e: self.on_mousewheel_zoom(e, delta=-120))

        self._drag_mode: Optional[str] = None  # 'move' or handle name
        self._drag_offset: Tuple[int, int] = (0, 0)
        self._orig_font_size: Optional[int] = None
        self._orig_bbox: Optional[Tuple[int, int, int, int]] = None

    def add_text_item(self) -> None:
        tag = f"item{len(self.items)+1}"
        font_path = None
        if self.font_options:
            sel = self.font_combo.get() if self.font_combo.get() else list(self.font_options.keys())[0]
            font_path = self.font_options.get(sel)
        # Place using base (unscaled) coordinates
        props = TextProps(text=DEFAULT_TEXT, x=self.base_w // 2 - 60, y=self.base_h // 2 - 10, font_path=font_path)
        item = TextItem(props=props, tag=tag)
        self.items.append(item)
        self._draw_item(item)
        self._select_item(item)
        self._refresh_listbox()

    def delete_selected(self) -> None:
        item = self.selected
        if not item:
            return
        # delete canvas items
        if item.text_id:
            self.canvas.delete(item.text_id)
        if item.image_id:
            self.canvas.delete(item.image_id)
        if item.rect_id:
            self.canvas.delete(item.rect_id)
        for hid in item.handle_ids.values():
            self.canvas.delete(hid)
        # remove from list
        self.items.remove(item)
        self.selected = None
        self._refresh_listbox()
        self._update_code_boxes()

    def _draw_item(self, item: TextItem) -> None:
        # Create or update the visual for the text item on canvas
        if PIL_AVAILABLE:
            # Resolve font path (selected or first SF fallback or Segoe UI)
            if item.props.font_path and Path(item.props.font_path).exists():
                fpath = str(item.props.font_path)
            elif self.font_options:
                fpath = str(next(iter(self.font_options.values())))
            else:
                fpath = r"C:\\Windows\\Fonts\\segoeui.ttf"

            try:
                scaled_font_size = max(1, int(round(item.props.font_size * self.scale)))
                font = ImageFont.truetype(fpath, scaled_font_size)
            except Exception:
                font = ImageFont.load_default()

            # Measure and render to tight RGBA image
            tmp = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
            dd = ImageDraw.Draw(tmp)
            bbox = dd.textbbox((0, 0), item.props.text, font=font)
            w, h = max(1, bbox[2] - bbox[0]), max(1, bbox[3] - bbox[1])
            img_txt = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            d2 = ImageDraw.Draw(img_txt)
            d2.text((-bbox[0], -bbox[1]), item.props.text, font=font, fill=item.props.fill)

            photo = ImageTk.PhotoImage(img_txt)
            if item.image_id is None:
                item.image_id = self.canvas.create_image(
                    int(round(item.props.x * self.scale)),
                    int(round(item.props.y * self.scale)),
                    image=photo,
                    anchor=tk.NW,
                    tags=(item.tag,),
                )
            else:
                self.canvas.itemconfigure(item.image_id, image=photo)
                self.canvas.coords(
                    item.image_id,
                    int(round(item.props.x * self.scale)),
                    int(round(item.props.y * self.scale)),
                )
            item.photo = photo
            # Ensure fallback text is removed if previously created
            if item.text_id is not None:
                self.canvas.delete(item.text_id)
                item.text_id = None
        else:
            # Fallback: Tk canvas text (won't use SF font files)
            scaled_font_size = max(1, int(round(item.props.font_size * self.scale)))
            font = ("Segoe UI", scaled_font_size)
            if item.text_id is None:
                item.text_id = self.canvas.create_text(
                    int(round(item.props.x * self.scale)),
                    int(round(item.props.y * self.scale)),
                    text=item.props.text,
                    fill="#ff0000",
                    font=font,
                    anchor=tk.NW,
                    tags=(item.tag,),
                )
            else:
                self.canvas.itemconfigure(item.text_id, text=item.props.text, font=font)
                self.canvas.coords(
                    item.text_id,
                    int(round(item.props.x * self.scale)),
                    int(round(item.props.y * self.scale)),
                )
            # Remove PIL image if exists
            if item.image_id is not None:
                self.canvas.delete(item.image_id)
                item.image_id = None
                item.photo = None

        # Compute bbox and draw selection rect + handles if selected
        self._update_item_decorations(item)

    def _update_item_decorations(self, item: TextItem) -> None:
        bbox = self._get_item_bbox(item)
        if not bbox:
            return
        x1, y1, x2, y2 = bbox
        pad = 6
        rx1, ry1, rx2, ry2 = x1 - pad, y1 - pad, x2 + pad, y2 + pad

        # Rectangle
        if item.rect_id is None:
            item.rect_id = self.canvas.create_rectangle(rx1, ry1, rx2, ry2, outline="#00aaff", width=1, dash=(3, 2), tags=(item.tag,))
        else:
            self.canvas.coords(item.rect_id, rx1, ry1, rx2, ry2)

        # Handles (8)
        handles = {
            "nw": (rx1, ry1),
            "n": ((rx1 + rx2) // 2, ry1),
            "ne": (rx2, ry1),
            "w": (rx1, (ry1 + ry2) // 2),
            "e": (rx2, (ry1 + ry2) // 2),
            "sw": (rx1, ry2),
            "s": ((rx1 + rx2) // 2, ry2),
            "se": (rx2, ry2),
        }
        size = 6
        for name, (cx, cy) in handles.items():
            xh1, yh1, xh2, yh2 = cx - size, cy - size, cx + size, cy + size
            if name in item.handle_ids:
                self.canvas.coords(item.handle_ids[name], xh1, yh1, xh2, yh2)
            else:
                item.handle_ids[name] = self.canvas.create_rectangle(
                    xh1, yh1, xh2, yh2, fill="#00aaff", outline="", tags=(item.tag, f"handle:{name}")
                )

        # Keep only selected item's decorations visible
        if self.selected is not item:
            if item.rect_id:
                self.canvas.itemconfigure(item.rect_id, state=tk.HIDDEN)
            for hid in item.handle_ids.values():
                self.canvas.itemconfigure(hid, state=tk.HIDDEN)
        else:
            if item.rect_id:
                self.canvas.itemconfigure(item.rect_id, state=tk.NORMAL)
            for hid in item.handle_ids.values():
                self.canvas.itemconfigure(hid, state=tk.NORMAL)

    def _get_item_bbox(self, item: TextItem) -> Optional[Tuple[int, int, int, int]]:
        if item.image_id is not None:
            return self.canvas.bbox(item.image_id)
        if item.text_id is not None:
            return self.canvas.bbox(item.text_id)
        return None

    def _select_item(self, item: Optional[TextItem]) -> None:
        self.selected = item
        # Update decorations visibility
        for it in self.items:
            self._update_item_decorations(it)
        # Update fields
        if item:
            self.var_text.set(item.props.text)
            self.var_font_size.set(item.props.font_size)
            self.var_x.set(item.props.x)
            self.var_y.set(item.props.y)
            # Set font combo selection by path
            if item.props.font_path:
                for name, path in self.font_options.items():
                    if path == item.props.font_path:
                        self.font_combo.set(name)
                        break
        self._update_code_boxes()

    def _refresh_listbox(self) -> None:
        sel_index = None
        if self.selected and self.selected in self.items:
            sel_index = self.items.index(self.selected)
        self.listbox.delete(0, tk.END)
        for idx, it in enumerate(self.items):
            label = f"{idx+1}. {it.props.text}"
            self.listbox.insert(tk.END, label)
        if sel_index is not None:
            self.listbox.select_set(sel_index)
            self.listbox.see(sel_index)

    def on_list_select(self, _event):
        selection = self.listbox.curselection()
        if selection:
            idx = selection[0]
            self._select_item(self.items[idx])

    # --- Field changes ---
    def apply_field_changes(self) -> None:
        item = self.selected
        if not item:
            return
        item.props.text = self.var_text.get()
        item.props.font_size = int(self.var_font_size.get())
        item.props.x = int(self.var_x.get())
        item.props.y = int(self.var_y.get())
        if self.font_combo.get() in self.font_options:
            item.props.font_path = self.font_options[self.font_combo.get()]
        self._draw_item(item)
        self._refresh_listbox()
        self._update_code_boxes()

    # --- Mouse interactions ---
    def _find_item_by_canvas_id(self, cid: int) -> Optional[TextItem]:
        tags = self.canvas.gettags(cid)
        for it in self.items:
            if it.tag in tags:
                return it
        return None

    def on_canvas_down(self, event):
        cid = self.canvas.find_closest(event.x, event.y)[0]
        it = self._find_item_by_canvas_id(cid)
        if it is None:
            self._select_item(None)
            self._refresh_listbox()
            return
        self._select_item(it)
        self._refresh_listbox()

        tags = self.canvas.gettags(cid)
        handle = None
        for t in tags:
            if t.startswith("handle:"):
                handle = t.split(":", 1)[1]
                break
        if handle:
            self._drag_mode = handle  # resizing (corners or sides)
            self._orig_font_size = it.props.font_size
            self._orig_bbox = self._get_item_bbox(it)
        else:
            self._drag_mode = "move"
            # Remember offset inside the rect/text (in model coords)
            self._drag_offset = (
                (event.x / self.scale) - it.props.x,
                (event.y / self.scale) - it.props.y,
            )

    def on_canvas_drag(self, event):
        it = self.selected
        if not it:
            return
        if self._drag_mode == "move":
            it.props.x = int(round((event.x / self.scale) - self._drag_offset[0]))
            it.props.y = int(round((event.y / self.scale) - self._drag_offset[1]))
            self.var_x.set(it.props.x)
            self.var_y.set(it.props.y)
            self._draw_item(it)
            self._update_code_boxes()
        elif self._drag_mode in {"nw", "ne", "sw", "se"}:
            # Corner drag -> scale font size based on bbox height change
            if not self._orig_bbox or self._orig_font_size is None:
                return
            x1, y1, x2, y2 = self._orig_bbox
            orig_h = max(1, y2 - y1)
            # Determine new height from cursor distance to opposite corner
            if self._drag_mode == "nw":
                opp = (x2, y2)
            elif self._drag_mode == "ne":
                opp = (x1, y2)
            elif self._drag_mode == "sw":
                opp = (x2, y1)
            else:  # se
                opp = (x1, y1)
            dx = event.x - opp[0]
            dy = event.y - opp[1]
            new_h = int((dx * dx + dy * dy) ** 0.5)  # approximate radial scale
            if new_h > 1:
                scale = new_h / orig_h
                new_size = max(6, int(self._orig_font_size * scale))
                it.props.font_size = new_size
                self.var_font_size.set(new_size)
                self._draw_item(it)
                self._update_code_boxes()
        elif self._drag_mode in {"n", "s"}:
            # Vertical side drag -> adjust Y only (spacing by vertical positioning)
            it.props.y = int(round(event.y / self.scale))
            self.var_y.set(it.props.y)
            self._draw_item(it)
            self._update_code_boxes()
        elif self._drag_mode in {"w", "e"}:
            # Horizontal side drag -> adjust X only (spacing by horizontal positioning)
            it.props.x = int(round(event.x / self.scale))
            self.var_x.set(it.props.x)
            self._draw_item(it)
            self._update_code_boxes()

    def on_canvas_up(self, _event):
        self._drag_mode = None
        self._orig_font_size = None
        self._orig_bbox = None

    # --- Zoom controls ---
    def on_zoom_change(self, value: str | float) -> None:
        try:
            v = float(value)
        except Exception:
            return
        new_scale = max(0.25, min(4.0, v / 100.0))
        if abs(new_scale - self.scale) < 1e-3:
            return
        self.scale = new_scale
        # Sync slider variable
        if isinstance(self.var_zoom, tk.Variable):
            try:
                self.var_zoom.set(int(round(self.scale * 100)))
            except Exception:
                pass
        self._apply_zoom()

    def on_mousewheel_zoom(self, event, delta=None):
        d = delta if delta is not None else getattr(event, "delta", 0)
        if d == 0:
            return
        factor = 1.1 if d > 0 else 1 / 1.1
        new_scale = max(0.25, min(4.0, self.scale * factor))
        self.scale = new_scale
        # Update slider and apply
        try:
            self.zoom_scale.set(self.scale * 100)
            self.var_zoom.set(int(round(self.scale * 100)))
        except Exception:
            pass
        self._apply_zoom()

    # --- Code generation ---
    def _code_for_item(self, it: TextItem) -> str:
        text = it.props.text.replace("\\", "\\\\").replace("\"", r"\"")
        font_path = str(it.props.font_path) if it.props.font_path else "C:\\Windows\\Fonts\\segoeui.ttf"
        r, g, b, a = it.props.fill
        code = (
            "# Text: {label}\n"
            "font = ImageFont.truetype(r\"{font_path}\", {size})\n"
            "draw.text(({x}, {y}), \"{text}\", font=font, fill=({r}, {g}, {b}, {a}))\n"
        ).format(
            label=text,
            font_path=font_path,
            size=it.props.font_size,
            x=it.props.x,
            y=it.props.y,
            text=text,
            r=r,
            g=g,
            b=b,
            a=a,
        )
        return code

    def _update_code_boxes(self) -> None:
        self.code_selected.configure(state=tk.NORMAL)
        self.code_selected.delete("1.0", tk.END)
        if self.selected:
            self.code_selected.insert("1.0", self._code_for_item(self.selected))
        self.code_selected.configure(state=tk.DISABLED)

        self.code_all.configure(state=tk.NORMAL)
        self.code_all.delete("1.0", tk.END)
        header = (
            "from pathlib import Path\n"
            "from PIL import Image, ImageDraw, ImageFont\n\n"
            f"img = Image.open(r\"{self.base_image_path}\").convert(\"RGBA\")\n"
            "overlay = Image.new(\"RGBA\", img.size, (0, 0, 0, 0))\n"
            "draw = ImageDraw.Draw(overlay)\n\n"
        )
        self.code_all.insert("1.0", header)
        for it in self.items:
            self.code_all.insert(tk.END, self._code_for_item(it) + "\n")
        self.code_all.insert(tk.END, "out = Image.alpha_composite(img, overlay)\n")
        self.code_all.insert(tk.END, "out.save(\"output.png\")\n")
        self.code_all.configure(state=tk.DISABLED)

    # --- Export PNG using PIL (if available) ---
    def export_png(self) -> None:
        if not PIL_AVAILABLE:
            messagebox.showwarning(
                "Pillow not installed",
                "Install Pillow (pip install pillow) to export a PNG from the GUI.\n"
                "You can still copy the code from the right panel.",
            )
            return
        img = Image.open(self.base_image_path).convert("RGBA")
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        for it in self.items:
            font_path = str(it.props.font_path) if it.props.font_path else r"C:\\Windows\\Fonts\\segoeui.ttf"
            try:
                font = ImageFont.truetype(font_path, it.props.font_size)
            except Exception:
                font = ImageFont.load_default()
            draw.text((it.props.x, it.props.y), it.props.text, font=font, fill=it.props.fill)
        out = Image.alpha_composite(img, overlay)
        out.save("output.png")
        messagebox.showinfo("Exported", f"Saved: {Path('output.png').resolve()}")


def main():
    app = TextOverlayGUI()
    # If initialization failed due to missing image, app is destroyed
    try:
        app.mainloop()
    except tk.TclError:
        # Likely running in a headless environment
        print("GUI could not be displayed (no display). Run locally on your desktop.")


if __name__ == "__main__":
    main()

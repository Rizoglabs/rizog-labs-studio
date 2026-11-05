"""RizogCAD web server. DWG requires separately installed ODA or LibreDWG.

No file is permanently retained; temporary directories are deleted after each request.
CAD rendering is best effort; verify every sheet before technical use.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from typing import Any
from urllib.parse import quote

import ezdxf
import fitz
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, Response
from ezdxf.addons.drawing import Frontend, RenderContext, config as dconfig, layout as dlayout, pymupdf

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 100 * 1024 * 1024
MAX_PAGES = 150
SIZES = {
    "A0": (841.0, 1189.0),
    "A1": (594.0, 841.0),
    "A2": (420.0, 594.0),
    "A3": (297.0, 420.0),
    "A4": (210.0, 297.0),
}
app = FastAPI(title="RizogCAD", docs_url=None, redoc_url=None)


def cad_engine() -> tuple[str | None, str | None]:
    custom = os.environ.get("ODA_CONVERTER", "").strip()
    if custom and Path(custom).is_file():
        return "ODA", custom
    exe = shutil.which("ODAFileConverter") or shutil.which("TeighaFileConverter")
    if exe:
        return "ODA", exe
    dwg = shutil.which("dwg2dxf")
    if dwg:
        return "LibreDWG", dwg
    return None, None


@app.get("/", response_class=HTMLResponse)
async def home():
    return (ROOT / "index.html").read_text(encoding="utf-8")


@app.get("/api/health")
async def health():
    kind, _ = cad_engine()
    return {
        "ready": True,
        "dwg_ready": kind is not None,
        "dxf_ready": True,
        "engine": kind or "DXF only",
        "reason": "DWG memerlukan ODA File Converter atau dwg2dxf di server." if not kind else "",
    }


def safe_filename(raw: str) -> str:
    name = raw.replace("\\", "/").split("/")[-1].strip()
    name = re.sub(r"[^a-zA-Z0-9._ -]", "_", name)[:160]
    if not name.lower().endswith((".dwg", ".dxf")) or name.startswith("."):
        raise HTTPException(400, "Pilih file .dwg atau .dxf yang valid.")
    return name


async def save_body(req: Request, folder: Path, original_name: str) -> Path:
    file = folder / safe_filename(original_name)
    total = 0
    with file.open("wb") as fh:
        async for chunk in req.stream():
            total += len(chunk)
            if total > MAX_BYTES:
                raise HTTPException(413, "File terlalu besar. Batas maksimal 100 MB.")
            fh.write(chunk)
    if not total:
        raise HTTPException(400, "File kosong.")
    return file


def to_dxf(src: Path, outdir: Path) -> Path:
    if src.suffix.lower() == ".dxf":
        return src
    kind, executable = cad_engine()
    if not executable:
        raise HTTPException(503, "Engine DWG belum diinstal. Instal ODA File Converter atau dwg2dxf di server. DXF tetap dapat dikonversi.")
    outdir.mkdir(parents=True, exist_ok=True)
    if kind == "ODA":
        command = [executable, str(src.parent), str(outdir), "ACAD2018", "DXF", "0", "1", "*.dwg"]
        if os.name != "nt" and not os.environ.get("DISPLAY") and shutil.which("xvfb-run"):
            command = ["xvfb-run", "-a", *command]
    else:
        command = [executable, "-y", "-o", str(outdir / (src.stem + ".dxf")), str(src)]
    try:
        result = subprocess.run(command, capture_output=True, text=True, errors="replace", timeout=180, check=False)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Engine CAD melewati batas waktu (3 menit). Coba file yang lebih kecil.")
    except OSError as e:
        raise HTTPException(503, f"Gagal menjalankan engine CAD ({kind}): {e.strerror or str(e)}")
    files = [p for p in outdir.rglob("*") if p.is_file() and p.suffix.lower() == ".dxf"]
    if result.returncode != 0 and not files:
        err = (result.stderr or result.stdout or "").strip().splitlines()
        excerpt = " | ".join(err[-3:])[:280]
        raise HTTPException(422, f"Engine {kind} gagal membaca DWG (kode {result.returncode}). {excerpt}")
    if not files:
        raise HTTPException(422, f"Engine {kind} tidak menghasilkan DXF. Periksa versi/validitas file DWG.")
    exact = [p for p in files if p.stem.lower() == src.stem.lower()]
    return exact[0] if exact else max(files, key=lambda x: x.stat().st_size)


def open_dxf(path: Path) -> ezdxf.document.Drawing:
    try:
        return ezdxf.readfile(str(path))
    except Exception as first:
        try:
            from ezdxf import recover
            doc, auditor = recover.readfile(str(path))
            return doc
        except Exception:
            raise HTTPException(422, f"DXF tidak dapat dibaca setelah dikonversi: {str(first)[:140]}")


def stats(doc: ezdxf.document.Drawing) -> tuple[list[dict[str, Any]], list[str]]:
    items: list[dict[str, Any]] = []
    warnings = []
    for name in doc.layout_names_in_taborder():
        if name.lower() == "model":
            continue
        sheet = doc.layouts.get(name)
        num = len(sheet)
        printable = sum(1 for e in sheet if not (e.dxftype() == "VIEWPORT" and e.dxf.get("id", 0) == 1))
        numvp = len([e for e in sheet if e.dxftype() == "VIEWPORT" and e.dxf.get("id", 0) != 1])
        items.append({"name": name, "entities": num, "printable": printable, "viewports": numvp, "paper_size": _original_size(sheet)})
        if numvp:
            warnings.append(f"{name}: memiliki {numvp} VIEWPORT; cek hasil PDF dengan gambar CAD asli.")
    return items, warnings


def _original_size(space) -> list[float] | None:
    if space.name.lower() == "model":
        return None
    try:
        settings = space.dxf_layout.dxf
        w, h = float(settings.paper_width), float(settings.paper_height)
        if 50 <= w <= 2000 and 50 <= h <= 2000:
            return [round(w, 1), round(h, 1)]
    except Exception:
        pass
    return None


def pdf_page(doc: ezdxf.document.Drawing, space, paper: str, orientation: str, theme: str) -> bytes:
    if paper == "source" and space.name.lower() != "model":
        try:
            page = dlayout.Page.from_dxf_layout(space.dxf_layout)
            if not 50 <= page.width <= 2000 or not 50 <= page.height <= 2000:
                raise ValueError("invalid paper size")
        except Exception:
            w, h = SIZES["A3"]
            page = dlayout.Page(w, h, dlayout.Units.mm, margins=dlayout.Margins.all(7))
    else:
        w, h = SIZES.get(paper, SIZES["A3"])
        page = dlayout.Page(w, h, dlayout.Units.mm, margins=dlayout.Margins.all(7))
    if orientation in ("portrait", "landscape"):
        if orientation == "landscape" and page.width < page.height or orientation == "portrait" and page.width > page.height:
            page = dlayout.Page(page.height, page.width, dlayout.Units.mm, margins=dlayout.Margins.all(7))
    else:
        if paper != "source":
            try:
                from ezdxf import bbox
                bb = bbox.extents(space)
                if bb.has_data:
                    size = bb.size
                    drawing_landscape = size.x >= size.y
                    page_landscape = page.width >= page.height
                    if drawing_landscape != page_landscape:
                        page = dlayout.Page(page.height, page.width, dlayout.Units.mm, margins=dlayout.Margins.all(7))
            except Exception:
                pass
    if not len(space):
        blank = fitz.open()
        blank.new_page(width=page.width * 72/25.4, height=page.height * 72/25.4)
        raw = blank.tobytes()
        blank.close()
        return raw
    backend = pymupdf.PyMuPdfBackend()
    policy = dconfig.ColorPolicy.BLACK if theme == "mono" else dconfig.ColorPolicy.COLOR
    opts = dconfig.Configuration(background_policy=dconfig.BackgroundPolicy.WHITE, color_policy=policy)
    Frontend(RenderContext(doc), backend, config=opts).draw_layout(space)
    return backend.get_pdf_bytes(page)


@app.post("/api/inspect")
async def inspect(req: Request, filename: str = Query(..., min_length=1, max_length=240)):
    with tempfile.TemporaryDirectory(prefix="rizogcad_") as temp:
        root = Path(temp)
        src = await save_body(req, root, filename)
        dxf = to_dxf(src, root / "converted")
        doc = open_dxf(dxf)
        items, warnings = stats(doc)
        return {"layouts": items, "warnings": warnings, "model_entities": len(doc.modelspace()), "file": filename}


@app.post("/api/convert")
async def convert(
    req: Request,
    filename: str = Query(..., min_length=1, max_length=240),
    paper: str = "source",
    orientation: str = "auto",
    theme: str = "mono",
    content: str = "layouts",
    include_model: int = 0,
    layouts: str = "[]",
):
    if paper != "source" and paper not in SIZES:
        raise HTTPException(400, "Ukuran kertas tidak dikenal.")
    if orientation not in {"auto", "landscape", "portrait"} or theme not in {"mono", "color"} or content not in {"layouts", "model"}:
        raise HTTPException(400, "Opsi output tidak valid.")
    try:
        requested = json.loads(layouts)
        if not isinstance(requested, list) or len(requested) > MAX_PAGES or any(not isinstance(n, str) or len(n) > 200 for n in requested):
            raise ValueError("invalid list")
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(400, "Daftar layout tidak valid.")
    with tempfile.TemporaryDirectory(prefix="rizogcad_") as temp:
        folder = Path(temp)
        src = await save_body(req, folder, filename)
        dxf = to_dxf(src, folder / "converted")
        doc = open_dxf(dxf)
        chosen = []
        warnings = []
        if content == "model" or bool(include_model):
            chosen.append(doc.modelspace())
        if content == "layouts":
            available = set(doc.layout_names_in_taborder())
            for name in requested:
                if name not in available or name.lower() == "model":
                    raise HTTPException(400, f"Layout '{name[:80]}' tidak tersedia di file.")
                if doc.layouts.get(name) not in chosen:
                    chosen.append(doc.layouts.get(name))
        if not chosen:
            raise HTTPException(400, "Pilih minimal satu layout atau Model Space.")
        if len(chosen) > MAX_PAGES:
            raise HTTPException(400, "Terlalu banyak halaman (maksimal 150).")
        output = fitz.open()
        try:
            for sheet in chosen:
                if any(ent.dxftype() == "VIEWPORT" and ent.dxf.get("id", 0) != 1 for ent in sheet):
                    warnings.append("Ada VIEWPORT: modelspace dalam viewport perlu diperiksa.")
                try:
                    page_bytes = pdf_page(doc, sheet, paper, orientation, theme)
                    page_doc = fitz.open(stream=page_bytes, filetype="pdf")
                    output.insert_pdf(page_doc)
                    page_doc.close()
                except Exception as e:
                    raise HTTPException(422, f"Gagal membuat PDF untuk layout '{sheet.name}': {str(e)[:150]}")
            if output.page_count != len(chosen):
                raise HTTPException(500, "Jumlah halaman PDF tidak sesuai pilihan layout.")
            raw = output.tobytes(garbage=3, deflate=True)
        finally:
            output.close()
        clean_name = safe_filename(filename)
        pdf_name = clean_name.rsplit(".", 1)[0] + ".pdf"
        return Response(
            content=raw,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename*=UTF-8''" + quote(pdf_name),
                "X-Page-Count": str(len(chosen)),
                "X-Conversion-Warning": quote(" ".join(sorted(set(warnings)))) if warnings else "",
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )

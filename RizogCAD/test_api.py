"""API smoke and regression tests; no third-party CAD files are stored."""
import io
import json
from pathlib import Path

import fitz
import pytest
from fastapi.testclient import TestClient

from server import app

ROOT = Path(__file__).parent
client = TestClient(app)
DATA = (ROOT / "demo_three_layouts.dxf").read_bytes() if (ROOT / "demo_three_layouts.dxf").is_file() else None


def generate_sample_dxf():
    import ezdxf
    doc = ezdxf.new("R2018")
    for index in range(3):
        layout = doc.layouts.new(f"SHEET_{index+1}")
        layout.page_setup(size=(420, 297), units="mm")
        layout.add_line((0, 0), (200, 190))
        layout.add_circle((100, 100), radius=20 + index * 10)
    out = io.StringIO()
    doc.write(out)
    return out.getvalue().encode("utf-8")


DATA = DATA or generate_sample_dxf()
SHEETS = ["SHEET_1", "SHEET_2", "SHEET_3"]


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["dxf_ready"] is True
    assert "auth_required" in res.json()


def test_scan_and_pdf(monkeypatch):
    monkeypatch.delenv("RIZOGCAD_ACCESS_KEY", raising=False)
    scan = client.post("/api/inspect?filename=test.dxf", content=DATA)
    assert scan.status_code == 200, scan.text
    layouts = scan.json()["layouts"]
    names = [i["name"] for i in layouts]
    assert set(SHEETS).issubset(set(names))
    pdf = client.post("/api/convert", params={
        "filename": "test.dxf",
        "content": "layouts",
        "layouts": json.dumps(SHEETS),
        "paper": "A3",
        "orientation": "landscape",
        "theme": "mono",
    }, content=DATA)
    assert pdf.status_code == 200, pdf.text
    assert pdf.content.startswith(b"%PDF-")
    assert pdf.headers["X-Page-Count"] == "3"
    document = fitz.open(stream=pdf.content, filetype="pdf")
    assert document.page_count == 3
    for page in document:
        assert len(page.get_drawings()) > 0
    document.close()


def test_invalid_extension():
    res = client.post("/api/inspect?filename=readme.txt", content=DATA)
    assert res.status_code == 400


def test_authentication(monkeypatch):
    monkeypatch.setenv("RIZOGCAD_ACCESS_KEY", "staging-secret")
    assert client.post("/api/inspect?filename=test.dxf", content=DATA).status_code == 401
    assert client.post("/api/inspect?filename=test.dxf",
                       headers={"X-Access-Key": "bad"},
                       content=DATA).status_code == 401
    ok = client.post("/api/inspect?filename=test.dxf",
                     headers={"X-Access-Key": "staging-secret"},
                     content=DATA)
    assert ok.status_code == 200

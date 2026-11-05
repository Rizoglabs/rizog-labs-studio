# RizogCAD — DWG / DXF ke PDF multi-halaman

Web app konversi CAD ke PDF. UI responsif di **index.html** dan server FastAPI di **server.py**. Saat ini **DXF** bisa dirender setelah instalasi dependensi Python; **DWG** memerlukan engine tambahan **ODA File Converter** atau **LibreDWG dwg2dxf** di server.

## Jalankan

```bash
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8000
```

Buka http://127.0.0.1:8000 di browser. Pengguna HP dapat mengakses IP server dari jaringan Wi-Fi yang sama jika bind `--host 0.0.0.0`.

Untuk DWG, instal ODA File Converter dari https://www.opendesign.com/guestfiles/oda_file_converter atau `dwg2dxf` dari LibreDWG. Tambahkan binary ke PATH, atau set env `ODA_CONVERTER`. Pada Linux headless, ODA mungkin memerlukan `xvfb-run`.

## Fitur

- Upload DWG/DXF dan deteksi layout
- Pilih semua layout atau subset, sertakan Model Space opsional
- Paper A0–A4 / source, portrait/landscape, hitam-putih/warna
- Buat satu PDF multi-halaman, preview dan download
- File sumber dihapus dari direktori sementara setelah selesai

## Verifikasi dan batasan

- Tes DXF dasar: `python smoke_test.py` (3 layout → 3 halaman PDF). Tes ini **tidak** membuktikan akurasi DWG kompleks.
- Baca DWG **tidak** berfungsi dengan HTML statis / GitHub Pages saja. Backend CAD **harus di-host dan dipasang engine-nya**.
- Renderer ezdxf bukan pengganti AutoCAD PUBLISH. XREF, SHX, pengaturan plot CTB/STB, dan isi VIEWPORT yang terhubung ke Model Space dapat hilang atau berbeda. **Verifikasi tiap lembar PDF terhadap CAD asli sebelum digunakan untuk pekerjaan teknik**.
- Jangan paparkan server pemroses file tanpa autentikasi, HTTPS, pembatasan beban, serta sandboxing.
- Dependensi PyMuPDF memakai lisensi AGPL atau lisensi komersial; perhatikan sebelum distribusi.
- Jangan commit gambar CAD proyek atau dokumen klien ke repo publik.

Branch staging ini dipisahkan dari branch main proyek Rizog Labs Studio karena repo khusus RizogCAD belum tersedia.

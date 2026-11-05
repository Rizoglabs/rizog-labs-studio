# RizogCAD — DWG/DXF → PDF Multi-halaman

Website responsive untuk HP dan PC. Pengguna tidak perlu menginstal AutoCAD.

## Status implementasi

- Frontend HTML tersedia dan terhubung ke FastAPI backend.
- Pembaca DXF, daftar tab paper layout dan ekspor PDF gabungan tersedia.
- Dockerfile membangun **LibreDWG 0.14** dari sumber resmi GNU sehingga dapat mencoba DWG 2018 di server. Ini masih memerlukan validasi gambar nyata.
- Proteksi `RIZOGCAD_ACCESS_KEY` dapat diaktifkan untuk mencegah orang lain mengirim gambar proyek.
- Test otomatis untuk PDF 3 layout, akses API, dan Docker build tersedia di GitHub Actions.

## Jalankan lokal — DXF

```bash
cd RizogCAD
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8000
```

Buka `http://127.0.0.1:8000/`. Tanpa LibreDWG/ODA, mode DXF berfungsi, DWG belum.

## Jalankan lokal — Docker (DWG dan DXF)

Butuh Docker, koneksi internet saat build, dan ruang disk yang memadai.

```bash
docker build -t rizogcad -f RizogCAD/Dockerfile RizogCAD
docker run --rm -p 8000:10000 -e RIZOGCAD_ACCESS_KEY="GANTI_DENGAN_KODE_PANJANG" rizogcad
```

Buka `http://127.0.0.1:8000`, masukkan kode akses, upload DWG/DXF, tunggu daftar layout, pilih semua layout, lalu konversi PDF.

## Hosting Render

Gunakan koneksi GitHub dari repository `Rizoglabs/rizog-labs-studio`.

- Branch: `rizogcad-converter`
- Name: `rizogcad`
- Runtime: `Docker`
- Dockerfile path: `./RizogCAD/Dockerfile`
- Docker build context: `./RizogCAD`
- Region: Singapore (untuk pengguna Indonesia)
- Plan: Free (untuk uji coba; memori/waktu build dapat membatasi file CAD besar)
- Environment variable: `RIZOGCAD_ACCESS_KEY` = kode rahasia kuat.
- Health check: `/api/health`

Jangan menaruh password/token dalam source code, file `.env` yang dipush, maupun README.

## Keterbatasan CAD — wajib dibaca

- PDF **mengikuti layout yang benar-benar ada** di DWG/DXF. Bila banyak lembar ternyata digambar berdampingan di satu *Model Space*, fitur Layout belum otomatis memecahnya menjadi halaman individual. Pengguna bisa memilih Model Space, tetapi hasilnya satu lembar besar.
- LibreDWG adalah implementasi reverse-engineering DWG; sebagian file kompleks, XREF, block, font SHX, OLE dan properti plot dapat tidak lengkap.
- Renderer ezdxf bukan AutoCAD Publish: clipping VIEWPORT, 3D, dan sudut tampilan dapat berbeda. Periksa **seluruh halaman, dimensi, title block dan skala** sebelum dipakai pada dokumen teknik.
- Tidak ada penyimpanan dokumen permanen oleh server; file temporer dihapus setelah masing-masing request. Transfer tetap melewati server yang dipakai. Jangan mengaktifkan akses publik tanpa autentikasi.
- Lisensi: LibreDWG GPLv3+, PyMuPDF AGPL atau komersial; periksa kewajiban lisensi untuk penggunaan/distribusi.

## Pengujian

```bash
pip install pytest httpx
python -m pytest -v test_api.py
python smoke_test.py
```

PDF contoh 3 layout hanya membuktikan jalur DXF dan pagination, **bukan validitas DWG asli**.

Project dibuat di branch terpisah agar website utama Rizog Labs Studio di `main` tidak berubah.

## Cara paling mudah: deploy GRATIS dari GitHub langsung ke blitz.cloud

Tidak perlu Render, kartu kredit, maupun membuat paket Docker publik.

1. Kunjungi https://dashboard.blitz.cloud/ dan buat akun Free, kemudian verifikasi email.
2. Pilih **Host something new → My own code**. Hubungkan GitHub akun Rizoglabs bila diminta, lalu pilih repository `Rizoglabs/rizog-labs-studio`.
3. Buka **Advanced settings** dan isi **Branch**: `rizogcad-converter`, **Folder to build**: `RizogCAD`, **Dockerfile**: `Dockerfile`.
4. Beri nama aplikasi `rizogcad` dan deploy. Docker image sudah dikonfigurasi memakai port 10000; bila dashboard tidak mendeteksi port, atur 10000.
5. Di tab **Environment**, tambahkan `RIZOGCAD_ACCESS_KEY` dengan kode akses kuat dan rahasia. Restart/redeploy bila diminta.
6. Buka alamat HTTPS aplikasi yang diberikan. Pastikan `/api/health` menampilkan `dwg_ready: true`; lalu lakukan tes DXF dan DWG. Periksa halaman/VIEWPORT/manual plotting CAD sebelum memakai PDF untuk engineering.

Keterbatasan Free: memori total 512 MB dan aplikasi tidur saat idle. DWG besar atau kompleks dapat kehabisan RAM. Dokumentasi: https://blitz.cloud/docs/deploy-from-github/ .

## Deploy GRATIS tanpa kartu: blitz.cloud

Render menolak pembuatan layanan pada akun saat ini dengan HTTP 402 (memerlukan metode pembayaran). Alternatif yang mendukung Docker publik tanpa kartu: **blitz.cloud Free**.

1. GitHub Actions workflow `.github/workflows/rizogcad-publish.yml` membangun dan mengirim Docker image `ghcr.io/rizoglabs/rizogcad:latest` (linux/amd64) ke GitHub Container Registry (GHCR).
2. Setelah workflow berhasil, di GitHub buka profil **Rizoglabs → Packages → rizogcad → Package settings → Change visibility → Public**. GitHub membuat paket pertama kali sebagai private; hanya jadikan paket Docker ini public, bukan file gambar teknik.
3. Daftar dan verifikasi email di https://dashboard.blitz.cloud/ menggunakan akun gratis. Pilih **Host something new → An app from Docker Hub**, lalu tempel image lengkap `ghcr.io/rizoglabs/rizogcad:latest`.
4. Pilih Free, port **10000** jika diminta, dan buat environment variable `RIZOGCAD_ACCESS_KEY` bernilai kode panjang acak (jangan dipush ke GitHub).
5. Uji alamat HTTPS yang diberikan: `/api/health` menampilkan `dwg_ready: true` sebelum mencoba upload. Masukkan kode akses di halaman dan uji 1 file DXF, kemudian DWG berlayout.
6. Paket free blitz.cloud membatasi memori total 512 MB dan menidurkan aplikasi saat idle; gambar tower DWG yang sangat rumit mungkin gagal karena RAM. Verifikasi hasil PDF terhadap DWG sumber.

Tidak ada akun/kode akses blitz yang dibuat secara otomatis oleh GitHub Actions. User harus melakukan pendaftaran satu kali dan mengaktifkan publikasi paket Docker agar bisa ditarik oleh hosting.

Referensi layanan: https://blitz.cloud/docs/deploy-docker-image/ ; https://blitz.cloud/faq/

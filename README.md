# TRYOUT TKA MI HUSNAYAIN SLEMAN — Ujian Online

Aplikasi ujian online untuk HP. Siswa membuka alamat GitHub Pages, masuk dengan NISN + password, mengerjakan 90 menit, lalu hasilnya masuk ke Google Sheet guru lengkap dengan rekap nilai dan analisis butir soal.

- **Tampilan siswa:** `index.html` (di HP). **Tampilan guru:** `guru.html` (PIN guru).
- **Data:** semua di Google Sheet milik guru (siswa, soal, kunci, hasil). Kunci jawaban dan PIN **tidak** ada di GitHub dan tidak dikirim ke HP siswa.
- **Gambar soal:** folder `gambar/` (di GitHub).

## A. Pasang sekali (±15 menit)

### 1. Google Sheet + backend
1. Buka Google Drive → **Baru → Unggah file** → pilih `data/Template_Data_Ujian_TKA_Husnayain.xlsx` → buka dengan Google Sheets → **File → Simpan sebagai Google Spreadsheet**.
2. Di Sheet itu: **Ekstensi → Apps Script**. Hapus isi `Code.gs`, tempel seluruh isi `apps-script/Code.gs`, klik **Simpan**.
3. **Terapkan → Deployment baru → jenis: Aplikasi web**. Isi: *Jalankan sebagai* **Saya**, *Yang memiliki akses* **Siapa saja** → **Terapkan**. Izinkan akses saat diminta (Lanjutan → Buka… → Izinkan).
4. Salin **URL aplikasi web** (berakhiran `/exec`).

### 2. GitHub Pages
1. Buat repositori baru di GitHub (mis. `tryout-tka`), unggah **seluruh isi** folder ini kecuali `apps-script/` dan `data/` (boleh juga ikut, tidak berbahaya).
2. Buka `js/config.js`, isi `API_URL` dengan URL `/exec` tadi, simpan (commit).
3. **Settings → Pages → Branch: main / root → Save**. Tunggu 1–2 menit. Alamat siswa: `https://NAMA-AKUN.github.io/tryout-tka/` dan guru: `.../guru.html`.

### 3. Coba dulu
Masuk sebagai satu siswa, kerjakan, kumpulkan. Lalu buka `guru.html` (PIN di sheet **Pengaturan**, baris `pin_guru`) dan lihat hasilnya. Siswa uji bisa dihapus lewat tombol **Reset** di tab Pemantauan.

## B. Hari ujian
1. Pastikan sheet **Pengaturan**: `status_ujian = buka`.
2. Bagikan alamat siswa. Siswa masuk dengan NISN dan password (huruf besar/kecil password tidak dibedakan).
3. Pantau di `guru.html` → **Pemantauan** (siapa mengerjakan, sisa waktu, berapa kali keluar layar).
4. Selesai: **Rekap Nilai** (unduh CSV/cetak) dan **Analisis Butir**. Tombol "Perbarui sheet" menulis keduanya ke Google Sheet.

## C. Aturan yang berlaku
- Satu kali ikut. Jika HP mati/macet, siswa masuk lagi dan **lanjut** dengan sisa waktu (waktu tidak berhenti). Jika benar-benar gagal kirim, guru bisa **Reset** siswa itu.
- Layar mirip CBT: layar penuh, tombol kembali dimatikan, salin/tempel dimatikan, dan **setiap keluar layar dicatat** (peringatan merah, bukan dikumpulkan paksa). Petunjuk keluar ada di halaman awal dan tombol ❓.
- Login di perangkat kedua otomatis mengunci perangkat pertama.
- Waktu habis → jawaban dikumpulkan otomatis. Jawaban disimpan otomatis tiap beberapa detik (dan di HP bila sinyal putus).
- Hasil dikirim ke guru otomatis ke Sheet. Setelah selesai, siswa juga punya tombol **kirim bukti ke WhatsApp guru** (nomor di Pengaturan). Jika pengiriman gagal, tersedia tombol kirim jawaban lewat WhatsApp.
- Penilaian dilakukan di server. Soal centang dan Benar/Salah dinilai **sebagian** (ubah ke `penuh` di Pengaturan bila ingin semua-benar-baru-dapat-poin).

## D. Memakai ulang untuk ujian berikutnya
1. Buat salinan Google Sheet (atau kosongkan sheet `Status`, `Hasil`, `Rekap Nilai`, `Analisis Butir`).
2. Isi sheet **Soal** (lihat sheet *Petunjuk* di dalamnya: tipe `pg`/`pgk`/`bs`, kunci, gambar) dan ubah `mapel`, `paket`, `durasi_menit` di **Pengaturan**.
3. Unggah gambar baru ke `gambar/` di GitHub. **Kode tidak perlu diubah.**
4. Jika membuat salinan Sheet, ulangi langkah deploy Apps Script dan ganti `API_URL`.

## E. Kunci yang perlu dicek guru
Dokumen soal menandai dua nomor untuk dicek dengan kunci resmi: **No. 21** (kunci dipakai 1,2,3; di naskah sumber hanya 1 dan 2) dan **No. 28** (gambar tidak memuat nama planet; kunci A). Jika kunci diubah di sheet **Soal** setelah siswa selesai, pakai **Pengaturan → Hitung ulang semua nilai** di `guru.html`.

## F. Pemecahan masalah
- *"Alamat server belum diatur"* → isi `API_URL` di `js/config.js`.
- *Perubahan kode Apps Script tidak berlaku* → **Terapkan → Kelola deployment → ikon pensil → Versi baru → Terapkan**.
- *NISN kehilangan angka 0 di depan* → format kolom NISN/password sebagai **Teks** (Format → Angka → Teks).
- *Gambar tidak muncul* → nama file di kolom `gambar` harus sama persis dengan file di `gambar/`.

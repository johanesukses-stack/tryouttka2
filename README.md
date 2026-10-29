# TRYOUT TKA MI HUSNAYAIN SLEMAN — Ujian Online (Multi-Paket)

Satu aplikasi, satu akun siswa (NISN + password), banyak paket: **MTK**, **BIN**, **IPAS**, masing-masing Paket 1, 2, 3, dst. Tiap paket punya soal, durasi, jadwal, status, dan hasil sendiri. Data tetap di Google Sheet milik guru; kunci jawaban dan PIN tidak ada di GitHub.

- **Siswa:** `index.html` (di HP). Setelah login siswa langsung masuk ke paket yang dibuka untuk kelasnya. Jika ada lebih dari satu paket dibuka, muncul pilihan.
- **Guru:** `guru.html` (PIN di sheet **Pengaturan**). Tab: **Paket**, Pemantauan, Rekap Nilai, Analisis Butir, Riwayat Siswa, Pengaturan. Pemilih paket ada di pojok kanan atas.

## Peningkatan dari versi satu paket (tanpa membuat repositori/Sheet baru)
1. Google Sheet → **Ekstensi → Apps Script** → ganti seluruh isi `Code.gs` dengan `apps-script/Code.gs` yang baru → **Simpan**.
2. **Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan.** (URL `/exec` tetap sama.)
3. Di GitHub, ganti file ini dengan yang baru: `index.html`, `guru.html`, `js/app.js`, `js/guru.js`, `css/guru.css`, `README.md`. **Jangan menimpa `js/config.js`** (isi `API_URL` Bapak tetap dipakai).
4. Buka `guru.html`. Pada panggilan pertama, data lama otomatis dimigrasi: sheet **Paket** dibuat, paket lama menjadi satu paket (kode diturunkan dari mapel dan nomor paket, mis. `IPAS-P03`), dan kolom `paket` ditambahkan ke sheet **Soal**, **Status**, **Hasil**. Nilai siswa yang sudah ada tetap utuh. Bisa juga dijalankan manual lewat menu **Ujian Online → Migrasi data lama ke multi-paket**.
5. Sheet lama `Rekap Nilai` dan `Analisis Butir` tidak dipakai lagi; rekap kini per paket (`Rekap IPAS-P03`, `Analisis IPAS-P03`). Sheet lama boleh dihapus.

Pemasangan baru dari nol: ikuti bagian A di bawah, tetapi pakai `data/Template_Data_Ujian_TKA_Husnayain.xlsx` yang sudah berformat multi-paket (tidak perlu migrasi).

## Menambah paket baru (mis. MTK Paket 1)
1. `guru.html` → tab **Paket** → **+ Paket baru**: pilih mata pelajaran dan nomor (kode jadi `MTK-P01`), isi nama, durasi (awal 90 menit), jadwal bila perlu, dan kelas peserta (kosong = semua). Paket baru berstatus **Draf**.
2. Isi soal di sheet **Soal**: kolom `paket` = `MTK-P01`, nomor soal mulai dari 1. Format kolom lain sama seperti sebelumnya (tipe `pg`/`pgk`/`bs`, kunci, bobot). Gambar: unggah ke `gambar/mtk-p01/` dan tulis `mtk-p01/q01.jpg` di kolom `gambar` (subfolder mencegah nama file bentrok antarpaket).
3. Tab **Paket** menampilkan jumlah soal dan masalah yang terdeteksi (kunci kosong, tipe salah, dst.).
4. Buka paket: **Buka sekarang** (terbuka sampai ditutup) atau **Ikuti jadwal** (otomatis buka dan tutup sesuai jam, WIB).

## Aturan
- Satu kali ikut **per paket**. Reset hanya menghapus hasil paket yang dipilih; paket lain dan nilainya tidak tersentuh.
- Status paket: **draf** (disiapkan), **aktif** (dibuka sesuai kontrol), **tutup**, **arsip**. Draf dan arsip tidak tampil bagi siswa; nilainya tetap tersimpan.
- Siswa yang sedang mengerjakan tetap bisa melanjutkan setelah paket ditutup. Siswa yang selesai tidak bisa mengulang kecuali di-reset guru.
- Jawaban dan layar ujian berjalan seperti sebelumnya (simpan otomatis, catat keluar layar, login di perangkat kedua mengunci perangkat pertama, kumpul otomatis saat waktu habis).
- Penilaian di server per paket; KKM bisa diatur per paket (kosong = KKM umum di Pengaturan).
- Gunakan **Riwayat Siswa** untuk melihat nilai tiap siswa di semua paket.

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
Masuk sebagai satu siswa, kerjakan, kumpulkan. Lalu buka `guru.html` (PIN di sheet **Pengaturan**, baris `pin_guru`) dan lihat hasilnya. Siswa uji bisa direset lewat tombol **Reset** di tab Pemantauan (hanya paket yang sedang dilihat).

## B. Hari ujian
1. Di tab **Paket**, pastikan paket hari itu berstatus **DIBUKA** (atau terjadwal).
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

## D. Kunci yang perlu dicek guru (IPAS-P03)
Dokumen soal menandai dua nomor untuk dicek dengan kunci resmi: **No. 21** (kunci dipakai 1,2,3; di naskah sumber hanya 1 dan 2) dan **No. 28** (gambar tidak memuat nama planet; kunci A). Jika kunci diubah di sheet **Soal** setelah siswa selesai, pakai **Pengaturan → Hitung ulang nilai paket ini** di `guru.html`.

## E. Pemecahan masalah
- *"Alamat server belum diatur"* → isi `API_URL` di `js/config.js`.
- *Perubahan kode Apps Script tidak berlaku* → **Terapkan → Kelola deployment → ikon pensil → Versi baru → Terapkan**.
- *NISN kehilangan angka 0 di depan* → format kolom NISN/password sebagai **Teks** (Format → Angka → Teks).
- *Paket tidak muncul di HP siswa* → cek status paket (harus DIBUKA/terjadwal yang sudah masuk jamnya) dan kolom `kelas` paket.
- *Gambar tidak muncul* → nama file di kolom `gambar` harus sama persis dengan file di `gambar/`.

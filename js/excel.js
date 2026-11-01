/* ============================================================
   Modul Excel halaman guru (dimuat dari guru.html)
   - UjianExcel.rekapNomor(D)       -> data benar/salah tiap nomor (dipakai layar & Excel)
   - UjianExcel.unduh(D, opsi)      -> file .xlsx: matriks 0/1, rekap per nomor, prioritas pendalaman
   Pustaka ExcelJS dimuat otomatis saat tombol ditekan.
   Aturan: "Benar" = skor penuh (1). Salah, kosong, dan benar sebagian = 0.
   ============================================================ */
(function (root) {
  'use strict';

  var LIB = ['https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js', 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'];
  var BATAS_RENDAH = 50, BATAS_BAIK = 75;            // persen
  var WARNA = { Rendah: 'FFFECACA', Sedang: 'FFFEF3C7', Baik: 'FFBBF7D0' };
  var TEKS = { Rendah: 'FF991B1B', Sedang: 'FF92400E', Baik: 'FF166534' };
  var BRAND = 'FF0F766E';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tgl() { var d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function kat(pct) { return pct < BATAS_RENDAH ? 'Rendah' : pct < BATAS_BAIK ? 'Sedang' : 'Baik'; }
  function penuh(rec, q) { return (Number((rec.skor || {})[q.no]) || 0) >= 0.999; }
  function sebagian(rec, q) { var s = Number((rec.skor || {})[q.no]) || 0; return s > 0 && s < 0.999; }
  function urutSiswa(a, b) { return (a.kelas + '|' + a.nama) < (b.kelas + '|' + b.nama) ? -1 : 1; }

  /* ---------- data ---------- */
  function rekapNomor(D, daftar) {
    var hasil = (daftar || D.hasil || []).slice().sort(urutSiswa), n = hasil.length;
    return D.soal.map(function (q) {
      var b = [], s = [];
      hasil.forEach(function (r) {
        var lab = r.nama + ' (' + r.kelas + ')';
        if (penuh(r, q)) b.push(lab); else s.push(sebagian(r, q) ? lab + ' - sebagian' : lab);
      });
      var pct = n ? Math.round(b.length / n * 1000) / 10 : 0;
      return { no: q.no, materi: q.materi || '', tipe: q.tipe, kunci: q.kunci, benar: b.length, salah: s.length, pct: pct, kat: kat(pct), namaBenar: b, namaSalah: s };
    });
  }
  function rekapMateri(D, rn) {
    var m = {}, urut = [];
    rn.forEach(function (r) {
      var k = r.materi || 'Umum';
      if (!m[k]) { m[k] = { materi: k, nomor: [], benar: 0, total: 0 }; urut.push(k); }
      m[k].nomor.push(r.no); m[k].benar += r.benar; m[k].total += r.benar + r.salah;
    });
    return urut.map(function (k) { var o = m[k]; o.pct = o.total ? Math.round(o.benar / o.total * 1000) / 10 : 0; o.kat = kat(o.pct); return o; })
      .sort(function (a, b) { return a.pct - b.pct; });
  }

  /* ---------- muat pustaka ---------- */
  function muat() {
    if (root.ExcelJS) return Promise.resolve();
    return new Promise(function (res, rej) {
      var i = 0;
      (function coba() {
        if (i >= LIB.length) { rej(new Error('Gagal memuat pustaka Excel. Periksa koneksi internet lalu coba lagi.')); return; }
        var s = document.createElement('script'); s.src = LIB[i++]; s.async = true;
        s.onload = function () { root.ExcelJS ? res() : coba(); };
        s.onerror = function () { s.remove(); coba(); };
        document.head.appendChild(s);
      })();
    });
  }

  /* ---------- gaya sel ---------- */
  var TIPIS = { style: 'thin', color: { argb: 'FFBFCBC9' } };
  var GARIS = { top: TIPIS, left: TIPIS, bottom: TIPIS, right: TIPIS };
  function kepala(row) {
    row.eachCell(function (c) {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = GARIS;
    });
    row.height = 32;
  }
  function kotak(ws, r1, r2, c1, c2) {
    for (var r = r1; r <= r2; r++) for (var c = c1; c <= c2; c++) ws.getCell(r, c).border = GARIS;
  }
  function warnaKat(cell, k) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA[k] } };
    cell.font = { bold: true, color: { argb: TEKS[k] } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  function judul(ws, D, teks, info) {
    ws.getCell('A1').value = (D.pengaturan.judul || 'Ujian Online') + ' - ' + teks;
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: BRAND } };
    ws.getCell('A2').value = 'Paket: ' + (D.pengaturan.pk || '') + (D.pengaturan.mapel ? ' | ' + D.pengaturan.mapel : '') + (D.pengaturan.paket ? ' | ' + D.pengaturan.paket : '') + '    ' + (info || '');
    ws.getCell('A2').font = { color: { argb: 'FF475569' } };
  }
  function huruf(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function daftarNo(rn, k) { var a = rn.filter(function (r) { return r.kat === k; }).map(function (r) { return r.no; }); return a.length ? a.join(', ') : '-'; }

  /* ---------- unduh ---------- */
  function unduh(D, opsi) {
    opsi = opsi || {};
    var hasil = (opsi.daftar || D.hasil || []).slice().sort(urutSiswa);
    if (!hasil.length) return Promise.reject(new Error('Belum ada siswa yang selesai mengerjakan.'));
    return muat().then(function () {
      var soal = D.soal, nS = soal.length, nR = hasil.length, rn = rekapNomor(D, hasil), rm = rekapMateri(D, rn);
      var wb = new root.ExcelJS.Workbook(); wb.creator = D.pengaturan.judul || 'Ujian Online'; wb.created = new Date();
      var rata = hasil.reduce(function (a, r) { return a + (Number(r.nilai) || 0); }, 0) / nR;
      var info = 'Peserta: ' + nR + '    Rata-rata nilai: ' + (Math.round(rata * 10) / 10) + '    Dibuat: ' + new Date().toLocaleDateString('id-ID');
      var HR = 5, MS = 'Matriks 0-1';                 // baris judul kolom; nama lembar matriks
      var ket = 'Benar = 1 (skor penuh). Salah, kosong, atau benar sebagian = 0.  Kategori: Rendah < ' + BATAS_RENDAH + '%, Sedang ' + BATAS_RENDAH + '-' + (BATAS_BAIK - 1) + '%, Baik >= ' + BATAS_BAIK + '%.';

      /* 1. Rekap per nomor (rumus mengambil dari lembar matriks) */
      var w1 = wb.addWorksheet('Rekap per Nomor'); judul(w1, D, 'Rekap Jawaban Benar per Nomor Soal', info);
      w1.getCell('A3').value = 'RENDAH (perlu didalami): nomor ' + daftarNo(rn, 'Rendah') + '   |   SEDANG: nomor ' + daftarNo(rn, 'Sedang') + '   |   BAIK: nomor ' + daftarNo(rn, 'Baik');
      w1.getCell('A3').font = { bold: true }; w1.getCell('A4').value = ket; w1.getCell('A4').font = { italic: true, color: { argb: 'FF64748B' }, size: 9 };
      w1.getRow(HR).values = ['No', 'Materi', 'Tipe', 'Kunci', 'Jumlah Benar', 'Jumlah Salah', '% Benar', 'Kategori', 'Urutan tersulit (1 = paling rendah)']; kepala(w1.getRow(HR));
      var urutP = rn.map(function (r) { return r.pct; });
      rn.forEach(function (r, i) {
        var row = HR + 1 + i, col = huruf(5 + i), rk = 1 + urutP.filter(function (p) { return p < r.pct; }).length, rr = HR + 1 + nR;
        w1.getRow(row).values = [r.no, r.materi, r.tipe, r.kunci];
        w1.getCell(row, 5).value = { formula: "'" + MS + "'!" + col + (rr), result: r.benar };
        w1.getCell(row, 6).value = { formula: "'" + MS + "'!" + col + (rr + 1), result: r.salah };
        w1.getCell(row, 7).value = { formula: 'E' + row + '/(E' + row + '+F' + row + ')', result: r.pct / 100 }; w1.getCell(row, 7).numFmt = '0%';
        w1.getCell(row, 8).value = r.kat; warnaKat(w1.getCell(row, 8), r.kat);
        w1.getCell(row, 9).value = { formula: 'RANK(G' + row + ',G$' + (HR + 1) + ':G$' + (HR + nS) + ',1)', result: rk };
        [1, 3, 4, 5, 6, 7, 9].forEach(function (c) { w1.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }; });
        w1.getCell(row, 2).alignment = { vertical: 'middle', wrapText: true };
      });
      kotak(w1, HR + 1, HR + nS, 1, 9);
      [6, 34, 8, 12, 12, 12, 10, 12, 20].forEach(function (w, i) { w1.getColumn(i + 1).width = w; });
      w1.views = [{ state: 'frozen', ySplit: HR }];

      /* 2. Prioritas pendalaman (terendah dahulu) */
      var w2 = wb.addWorksheet('Prioritas Pendalaman'); judul(w2, D, 'Nomor Soal dari Tingkat Benar Terendah', info);
      w2.getCell('A3').value = 'Urut dari yang paling rendah. Mulai pendalaman dari baris paling atas.'; w2.getCell('A3').font = { bold: true };
      w2.getCell('A4').value = ket; w2.getCell('A4').font = { italic: true, color: { argb: 'FF64748B' }, size: 9 };
      w2.getRow(HR).values = ['Urutan', 'No Soal', 'Materi', '% Benar', 'Jumlah Benar', 'Jumlah Salah', 'Kategori', 'Siswa yang belum benar']; kepala(w2.getRow(HR));
      var urut = rn.slice().sort(function (a, b) { return a.pct - b.pct || a.no - b.no; });
      urut.forEach(function (r, i) {
        var row = HR + 1 + i;
        w2.getRow(row).values = [i + 1, r.no, r.materi, r.pct / 100, r.benar, r.salah, r.kat, r.namaSalah.join('; ')];
        w2.getCell(row, 4).numFmt = '0%'; warnaKat(w2.getCell(row, 7), r.kat);
        [1, 2, 4, 5, 6].forEach(function (c) { w2.getCell(row, c).alignment = { horizontal: 'center', vertical: 'top' }; });
        w2.getCell(row, 3).alignment = { vertical: 'top', wrapText: true }; w2.getCell(row, 8).alignment = { vertical: 'top', wrapText: true };
      });
      kotak(w2, HR + 1, HR + nS, 1, 8);
      [8, 9, 32, 10, 12, 12, 12, 90].forEach(function (w, i) { w2.getColumn(i + 1).width = w; });
      w2.views = [{ state: 'frozen', ySplit: HR }];

      /* 3. Siapa benar, siapa salah per nomor */
      var w3 = wb.addWorksheet('Benar-Salah per Nomor'); judul(w3, D, 'Siapa yang Benar dan Siapa yang Salah di Tiap Nomor', info);
      w3.getCell('A3').value = 'Di kolom "belum benar", tulisan "sebagian" berarti siswa sudah menjawab sebagian benar (nilai matriks tetap 0).'; w3.getCell('A3').font = { bold: true };
      w3.getCell('A4').value = ket; w3.getCell('A4').font = { italic: true, color: { argb: 'FF64748B' }, size: 9 };
      w3.getRow(HR).values = ['No', 'Materi', 'Jumlah Benar', 'Siswa yang BENAR (skor 1)', 'Jumlah Salah', 'Siswa yang SALAH (skor 0)']; kepala(w3.getRow(HR));
      rn.forEach(function (r, i) {
        var row = HR + 1 + i;
        w3.getRow(row).values = [r.no, r.materi, r.benar, r.namaBenar.join('; '), r.salah, r.namaSalah.join('; ')];
        [1, 3, 5].forEach(function (c) { w3.getCell(row, c).alignment = { horizontal: 'center', vertical: 'top' }; });
        [2, 4, 6].forEach(function (c) { w3.getCell(row, c).alignment = { vertical: 'top', wrapText: true }; });
        w3.getCell(row, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        w3.getCell(row, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      });
      kotak(w3, HR + 1, HR + nS, 1, 6);
      [6, 30, 10, 70, 10, 70].forEach(function (w, i) { w3.getColumn(i + 1).width = w; });
      w3.views = [{ state: 'frozen', ySplit: HR }];

      /* 4. Matriks 0/1 (benar = 1, salah = 0) */
      var w4 = wb.addWorksheet(MS); judul(w4, D, 'Matriks Jawaban Siswa x Nomor Soal (1 = benar, 0 = salah)', info);
      w4.getCell('A3').value = 'Baris bawah: jumlah benar, jumlah salah, dan % benar tiap nomor (otomatis dari angka di atasnya).'; w4.getCell('A3').font = { bold: true };
      w4.getCell('A4').value = ket; w4.getCell('A4').font = { italic: true, color: { argb: 'FF64748B' }, size: 9 };
      var cTot = 5 + nS, cNil = 6 + nS, r1 = HR + 1, r2 = HR + nR, hd = ['No', 'Nama', 'Kelas', 'NISN'];
      soal.forEach(function (q) { hd.push(q.no); }); hd.push('Total Benar', 'Nilai'); w4.getRow(HR).values = hd; kepala(w4.getRow(HR));
      hasil.forEach(function (rec, i) {
        var row = r1 + i, tot = 0;
        w4.getRow(row).values = [i + 1, rec.nama, rec.kelas, String(rec.nisn)];
        soal.forEach(function (q, j) {
          var v = penuh(rec, q) ? 1 : 0; tot += v; var c = w4.getCell(row, 5 + j); c.value = v;
          c.alignment = { horizontal: 'center' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: v ? 'FFDCFCE7' : 'FFFEE2E2' } };
        });
        w4.getCell(row, cTot).value = { formula: 'SUM(E' + row + ':' + huruf(4 + nS) + row + ')', result: tot }; w4.getCell(row, cTot).font = { bold: true };
        w4.getCell(row, cNil).value = Number(rec.nilai) || 0; w4.getCell(row, cNil).font = { bold: true };
        w4.getCell(row, cTot).alignment = w4.getCell(row, cNil).alignment = { horizontal: 'center' };
      });
      var rB = r2 + 1, rS = r2 + 2, rP = r2 + 3, rK = r2 + 4;
      w4.getCell(rB, 2).value = 'Jumlah BENAR'; w4.getCell(rS, 2).value = 'Jumlah SALAH'; w4.getCell(rP, 2).value = '% Benar'; w4.getCell(rK, 2).value = 'Kategori';
      rn.forEach(function (r, j) {
        var col = huruf(5 + j), rng = col + r1 + ':' + col + r2;
        w4.getCell(rB, 5 + j).value = { formula: 'SUM(' + rng + ')', result: r.benar };
        w4.getCell(rS, 5 + j).value = { formula: 'COUNT(' + rng + ')-' + col + rB, result: r.salah };
        w4.getCell(rP, 5 + j).value = { formula: col + rB + '/COUNT(' + rng + ')', result: r.pct / 100 }; w4.getCell(rP, 5 + j).numFmt = '0%';
        w4.getCell(rK, 5 + j).value = r.kat; warnaKat(w4.getCell(rK, 5 + j), r.kat); w4.getCell(rK, 5 + j).font = { bold: true, size: 8, color: { argb: TEKS[r.kat] } };
        [rB, rS, rP].forEach(function (rr) { w4.getCell(rr, 5 + j).alignment = { horizontal: 'center' }; w4.getCell(rr, 5 + j).font = { bold: true }; });
      });
      [rB, rS, rP, rK].forEach(function (rr) { w4.getCell(rr, 2).font = { bold: true }; w4.getCell(rr, 2).alignment = { horizontal: 'right' }; });
      kotak(w4, r1, rK, 1, cNil);
      [5, 28, 8, 13].forEach(function (w, i) { w4.getColumn(i + 1).width = w; });
      for (var c = 5; c <= cNil; c++) w4.getColumn(c).width = c >= cTot ? 11 : 6;
      w4.views = [{ state: 'frozen', xSplit: 2, ySplit: HR }];

      /* 5. Per materi */
      var w5 = wb.addWorksheet('Per Materi'); judul(w5, D, 'Tingkat Benar per Materi (terendah dahulu)', info);
      w5.getCell('A3').value = 'Gabungan nomor soal yang satu materi; angka = jawaban benar penuh dibagi seluruh jawaban siswa pada materi itu.'; w5.getCell('A3').font = { bold: true };
      w5.getCell('A4').value = ket; w5.getCell('A4').font = { italic: true, color: { argb: 'FF64748B' }, size: 9 };
      w5.getRow(HR).values = ['Urutan', 'Materi', 'Nomor soal', 'Jumlah soal', '% Benar', 'Kategori']; kepala(w5.getRow(HR));
      rm.forEach(function (m, i) {
        var row = HR + 1 + i;
        w5.getRow(row).values = [i + 1, m.materi, m.nomor.join(', '), m.nomor.length, m.pct / 100, m.kat];
        w5.getCell(row, 5).numFmt = '0%'; warnaKat(w5.getCell(row, 6), m.kat);
        [1, 4, 5].forEach(function (c) { w5.getCell(row, c).alignment = { horizontal: 'center', vertical: 'top' }; });
        [2, 3].forEach(function (c) { w5.getCell(row, c).alignment = { vertical: 'top', wrapText: true }; });
      });
      kotak(w5, HR + 1, HR + rm.length, 1, 6);
      [8, 40, 40, 12, 10, 12].forEach(function (w, i) { w5.getColumn(i + 1).width = w; });

      var nama = opsi.namaFile || ('analisis-butir-matriks-' + String(D.pengaturan.pk || 'paket').toLowerCase() + '-' + tgl() + '.xlsx');
      return wb.xlsx.writeBuffer().then(function (buf) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        a.download = nama; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        return nama;
      });
    });
  }

  root.UjianExcel = { rekapNomor: rekapNomor, rekapMateri: rekapMateri, unduh: unduh, BATAS_RENDAH: BATAS_RENDAH, BATAS_BAIK: BATAS_BAIK };
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================
   Modul PDF halaman guru (dimuat dari guru.html)
   - UjianPDF.hasilPDF(D, daftarHasil, opsi)  -> PDF jawaban siswa vs kunci
   - UjianPDF.analisisPDF(D, opsi)            -> PDF analisis butir soal
   - UjianPDF.petaPDF(D, daftarHasil, opsi)   -> PDF Peta Belajar (insight per siswa)
   Library jsPDF + autoTable dimuat otomatis saat tombol PDF ditekan.
   ============================================================ */
(function (root) {
  'use strict';

  var LIB = [
    ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'],
    ['https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js']
  ];
  var BRAND = [15, 118, 110], INK = [20, 32, 30], MUTED = [91, 107, 104], LINE = [217, 226, 224];
  var C_OK = [21, 128, 61], C_WARN = [180, 83, 9], C_BAD = [185, 28, 28], C_NONE = [100, 116, 139];
  var WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

  /* ---------- umum ---------- */
  function T(s) { // teks aman untuk font bawaan PDF (Latin-1)
    s = String(s == null ? '' : s).replace(/\*\*/g, '');
    var map = { '≥': '>=', '≤': '<=', '≠': '!=', '≈': '~', '→': '->', '←': '<-', '↔': '<->', '✓': 'v', '✔': 'v', '✗': 'x', '−': '-', '‐': '-', '‑': '-', '⁄': '/', '∶': ':', 'α': 'alpha', 'β': 'beta', 'π': 'pi', 'Δ': 'delta', '√': 'akar ', '∠': 'sudut ', '△': 'segitiga ', '∞': 'tak hingga', '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁰': '0', '\u00a0': ' ', '\u202f': ' ', '\u2009': ' ', '\u200b': '', '\ufeff': '' };
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), code = s.charCodeAt(i);
      if (map.hasOwnProperty(ch)) o += map[ch];
      else if (ch === '\n' || ch === '\t') o += ch === '\t' ? ' ' : ch;
      else if (code < 32) continue;
      else if (code <= 255 || WINANSI_EXTRA.indexOf(ch) >= 0) o += ch;
      else o += '?';
    }
    return o;
  }
  function num(x) { return String(Math.round(Number(x) * 10) / 10).replace('.', ','); }
  function num3(x) { return String(Math.round(Number(x) * 1000) / 1000).replace('.', ','); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tgl() { var d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'siswa'; }
  function kosong(a) { return String(a == null ? '' : a).replace(/[-_,;\s]/g, '') === ''; }

  /* ---------- muat library ---------- */
  function muatSkrip(urls) {
    return new Promise(function (res, rej) {
      var i = 0;
      (function coba() {
        if (i >= urls.length) { rej(new Error('Gagal memuat pustaka PDF. Periksa koneksi internet lalu coba lagi.')); return; }
        var s = document.createElement('script');
        s.src = urls[i++]; s.async = true;
        s.onload = function () { res(); };
        s.onerror = function () { s.remove(); coba(); };
        document.head.appendChild(s);
      })();
    });
  }
  function siap() {
    if (root.jspdf && root.jspdf.jsPDF && root.jspdf.jsPDF.API && root.jspdf.jsPDF.API.autoTable) return Promise.resolve();
    var p = (root.jspdf && root.jspdf.jsPDF) ? Promise.resolve() : muatSkrip(LIB[0]);
    return p.then(function () { return muatSkrip(LIB[1]); }).then(function () {
      if (!(root.jspdf && root.jspdf.jsPDF && root.jspdf.jsPDF.API.autoTable)) throw new Error('Pustaka PDF tidak lengkap. Muat ulang halaman lalu coba lagi.');
    });
  }

  /* ---------- gambar ---------- */
  function loadImageBrowser(url) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        try {
          var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 900 / w);
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          res({ data: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height });
        } catch (e) { res(null); }
      };
      im.onerror = function () { res(null); };
      im.src = url;
    });
  }
  function siapkanGambar(soal, opsi) {
    var cache = {}, loader = opsi.loadImage || function (nama) { return loadImageBrowser((opsi.gambarDir || 'gambar/') + nama); }, tugas = [];
    soal.forEach(function (q) {
      String(q.gambar || '').split(';').forEach(function (g) {
        g = g.trim();
        if (g && !cache.hasOwnProperty(g)) { cache[g] = null; tugas.push(Promise.resolve(loader(g)).then(function (r) { cache[g] = r || null; }).catch(function () { cache[g] = null; })); }
      });
    });
    return Promise.all(tugas).then(function () { return cache; });
  }

  /* ---------- logika jawaban ---------- */
  function himpunan(s) { var o = {}; String(s || '').split(/[,;\s]+/).forEach(function (x) { if (x) o[x.toUpperCase()] = 1; }); return o; }
  function urutAngka(s) { return Object.keys(himpunan(s)).sort(function (a, b) { return a - b; }); }
  function bsParts(s) { return String(s || '').toUpperCase().split('-').map(function (x) { return x === 'B' || x === 'S' ? x : ''; }); }
  function kataBS(x, panjang) { return x === 'B' ? (panjang ? 'Benar' : 'B') : x === 'S' ? (panjang ? 'Salah' : 'S') : '-'; }
  function teksJawaban(q, ans) {
    if (kosong(ans)) return '(kosong)';
    if (q.tipe === 'pg') return String(ans).trim().toUpperCase();
    if (q.tipe === 'pgk') return urutAngka(ans).join(', ');
    var p = bsParts(ans); return q.opsi.map(function (_, i) { return (i + 1) + ':' + kataBS(p[i]); }).join('  ');
  }
  function teksKunci(q) {
    if (q.tipe === 'pg') return String(q.kunci).trim().toUpperCase();
    if (q.tipe === 'pgk') return urutAngka(q.kunci).join(', ');
    var p = bsParts(q.kunci); return q.opsi.map(function (_, i) { return (i + 1) + ':' + kataBS(p[i]); }).join('  ');
  }
  function statusButir(q, rec) {
    var ans = (rec.jawaban || {})[q.no], s = Number((rec.skor || {})[q.no]) || 0;
    if (kosong(ans)) return { label: 'Kosong', warna: C_NONE, skor: 0 };
    if (s >= 0.999) return { label: 'Benar', warna: C_OK, skor: s };
    if (s > 0) return { label: 'Sebagian', warna: C_WARN, skor: s };
    return { label: 'Salah', warna: C_BAD, skor: 0 };
  }
  function ringkasan(D, rec) {
    var o = { benar: 0, sebagian: 0, salah: 0, kosong: 0 };
    D.soal.forEach(function (q) { var st = statusButir(q, rec).label; if (st === 'Benar') o.benar++; else if (st === 'Sebagian') o.sebagian++; else if (st === 'Salah') o.salah++; else o.kosong++; });
    return o;
  }

  /* ---------- helper jsPDF ---------- */
  function buatDoc(orientasi) {
    var J = root.jspdf.jsPDF;
    return new J({ orientation: orientasi || 'portrait', unit: 'mm', format: 'a4', compress: true });
  }
  function warnaTeks(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
  function font(doc, size, style, c) { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); warnaTeks(doc, c || INK); }
  function band(doc, W, judul, sub) {
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]); doc.rect(0, 0, W, 17, 'F');
    font(doc, 11.5, 'bold', [255, 255, 255]); doc.text(T(judul), 14, 7.2);
    font(doc, 8.5, 'normal', [255, 255, 255]); doc.text(T(sub), 14, 13);
  }
  function footer(doc, W, H, kiri) {
    var n = doc.internal.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
      doc.text(T(kiri), 14, H - 8);
      doc.text('Halaman ' + i + ' dari ' + n, W - 14, H - 8, { align: 'right' });
    }
  }
  function namaPaket(D) { var p = D.pengaturan; return (p.pk || '') + ' · ' + (p.mapel || '') + (p.paket ? ' · ' + p.paket : ''); }

  /* ============================================================
     PDF 1: hasil pengerjaan siswa (jawaban dipilih vs kunci)
     ============================================================ */
  function hasilPDF(D, daftar, opsi) {
    opsi = opsi || {};
    var lengkap = opsi.mode !== 'ringkas';
    if (!daftar || !daftar.length) return Promise.reject(new Error('Belum ada siswa yang selesai mengerjakan.'));
    return siap().then(function () { return lengkap ? siapkanGambar(D.soal, opsi) : {}; }).then(function (gambar) {
      var doc = buatDoc('portrait'), W = 210, H = 297, M = 14, TOP = 16, BOT = 16, CW = W - 2 * M;
      var kkm = D.pengaturan.kkm, judul = D.pengaturan.judul || 'Ujian Online';
      var ctx = { y: 0, run: '' };

      function halamanBaru() { doc.addPage(); ctx.y = TOP; if (ctx.run) { font(doc, 7.5, 'normal', MUTED); doc.text(T(ctx.run), M, 9.5); doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(M, 11, W - M, 11); } }
      function pastikan(h) { if (ctx.y + h > H - BOT) halamanBaru(); }

      daftar.forEach(function (rec, idx) {
        rec.jawaban = rec.jawaban || {}; rec.skor = rec.skor || {};
        if (idx > 0) doc.addPage();
        ctx.run = rec.nama + ' · ' + rec.kelas + ' · ' + (D.pengaturan.pk || '');
        var hal0 = doc.internal.getNumberOfPages();

        /* kepala */
        band(doc, W, judul, 'Hasil Pengerjaan Siswa  |  ' + namaPaket(D));
        var rs = ringkasan(D, rec), tuntas = rec.nilai >= kkm;
        font(doc, 8, 'normal', MUTED); doc.text('Nama', M, 25); doc.text('Kelas / NISN', M, 31); doc.text('Selesai', M, 37); doc.text('Durasi / keluar layar', M, 43);
        font(doc, 11.5, 'bold'); doc.text(T(rec.nama), M + 36, 25);
        font(doc, 9.5, 'normal'); doc.text(T(rec.kelas + '  /  ' + rec.nisn), M + 36, 31);
        doc.text(T(String(rec.selesai || '-') + (rec.terlambat ? '  (terlambat)' : '')), M + 36, 37);
        doc.text(T(num(rec.durasi_menit) + ' menit  /  ' + (rec.keluar || 0) + ' kali'), M + 36, 43);
        var bx = W - M - 46;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.4); doc.roundedRect(bx, 21, 46, 25, 2, 2, 'S');
        font(doc, 7.5, 'normal', MUTED); doc.text('NILAI', bx + 23, 26, { align: 'center' });
        font(doc, 22, 'bold', tuntas ? C_OK : C_BAD); doc.text(num(rec.nilai), bx + 23, 36.5, { align: 'center' });
        font(doc, 8, 'bold', tuntas ? C_OK : C_BAD); doc.text(tuntas ? 'TUNTAS (KKM ' + kkm + ')' : 'BELUM TUNTAS (KKM ' + kkm + ')', bx + 23, 42.5, { align: 'center' });
        font(doc, 9, 'normal'); doc.text(T('Benar penuh: ' + rs.benar + '   |   Sebagian: ' + rs.sebagian + '   |   Salah: ' + rs.salah + '   |   Kosong: ' + rs.kosong + '   (dari ' + D.soal.length + ' soal)'), M, 52);
        if (lengkap) { font(doc, 7.5, 'normal', MUTED); doc.text('[X] = pilihan siswa     "<- KUNCI" = jawaban yang benar     Warna hijau = benar, merah = pilihan siswa yang salah.', M, 57); }
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(M, lengkap ? 60 : 55, W - M, lengkap ? 60 : 55);
        ctx.y = lengkap ? 65 : 60;

        if (!lengkap) tabelRingkas(doc, D, rec, ctx, { M: M, TOP: TOP, BOT: BOT, hal0: hal0 });
        else D.soal.forEach(function (q) { blokSoal(doc, q, rec, gambar, ctx, { W: W, H: H, M: M, CW: CW, TOP: TOP, BOT: BOT, pastikan: pastikan, halamanBaru: halamanBaru }); });
      });

      footer(doc, W, H, judul + '  |  ' + (D.pengaturan.pk || ''));
      var nama = opsi.namaFile || ('hasil-' + (D.pengaturan.pk || 'paket').toLowerCase() + '-' + (daftar.length === 1 ? slug(daftar[0].nama) : 'semua') + '-' + tgl() + '.pdf');
      doc.save(nama);
      return nama;
    });
  }

  function tabelRingkas(doc, D, rec, ctx, k) {
    var body = D.soal.map(function (q) {
      var st = statusButir(q, rec);
      return [String(q.no), T(q.materi), T(teksJawaban(q, rec.jawaban[q.no])), T(teksKunci(q)), st.label === 'Kosong' ? '0' : num3(st.skor), st.label];
    });
    doc.autoTable({
      startY: ctx.y, margin: { left: k.M, right: k.M, top: k.TOP, bottom: k.BOT },
      head: [['No', 'Materi', 'Jawaban siswa', 'Kunci jawaban', 'Skor', 'Keterangan']], body: body,
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, lineColor: LINE, lineWidth: 0.2, textColor: INK, valign: 'middle' },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 250, 249] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 52 }, 2: { cellWidth: 40 }, 3: { cellWidth: 40 }, 4: { cellWidth: 14, halign: 'center' }, 5: { cellWidth: 26, halign: 'center' } },
      didParseCell: function (d) {
        if (d.section !== 'body') return;
        var st = D.soal[d.row.index] ? statusButir(D.soal[d.row.index], rec) : null;
        if (!st) return;
        if (d.column.index === 5) { d.cell.styles.textColor = st.warna; d.cell.styles.fontStyle = 'bold'; }
        if (d.column.index === 2) d.cell.styles.textColor = st.label === 'Benar' ? C_OK : (st.label === 'Kosong' ? C_NONE : C_BAD);
        if (d.column.index === 3) { d.cell.styles.textColor = C_OK; d.cell.styles.fontStyle = 'bold'; }
      },
      didDrawPage: function () {
        var no = doc.internal.getCurrentPageInfo().pageNumber;
        if (no > k.hal0) { font(doc, 7.5, 'normal', MUTED); doc.text(T(ctx.run), k.M, 9.5); doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(k.M, 11, 210 - k.M, 11); }
      }
    });
    ctx.y = doc.lastAutoTable.finalY + 4;
  }

  function blokSoal(doc, q, rec, gambar, ctx, L) {
    var ops = [], ans = (rec.jawaban || {})[q.no], st = statusButir(q, rec), CW = L.CW, M = L.M;
    function op(h, draw, gambarOp) { ops.push({ h: h, draw: draw, gambar: !!gambarOp }); }
    function baris(teks, o) { // teks panjang -> banyak op satu baris
      o = o || {}; var size = o.size || 9, lh = o.lh || size * 0.46, ind = o.ind || 0, mw = o.marker ? 9 : 0;
      doc.setFont('helvetica', o.style || 'normal'); doc.setFontSize(size);
      doc.splitTextToSize(T(teks), CW - ind - mw).forEach(function (ln, i) {
        op(lh, function (y) {
          font(doc, size, o.style, o.warna);
          if (o.marker && i === 0) doc.text(o.marker, M + ind, y + lh * 0.78);
          doc.text(ln, M + ind + mw, y + lh * 0.78);
        });
      });
    }

    /* judul butir */
    op(6.5, function (y) {
      font(doc, 10, 'bold'); doc.text('Soal ' + q.no, M, y + 4.4);
      font(doc, 8, 'normal', MUTED); var mt = doc.splitTextToSize(T(q.materi || ''), CW - 70)[0] || ''; doc.text(mt, M + 20, y + 4.4);
      font(doc, 8.5, 'bold', st.warna); doc.text(st.label.toUpperCase() + (st.label === 'Sebagian' ? ' (skor ' + num3(st.skor) + ')' : ''), M + CW, y + 4.4, { align: 'right' });
    });
    baris(q.soal, { size: 9.2 });

    /* gambar */
    var nama = String(q.gambar || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean);
    if (nama.length) {
      var MAXW = 105, MAXH = 62, GAP = 3, baris0 = [], cur = [], curW = 0;
      nama.forEach(function (g) {
        var im = gambar[g];
        var w = 0, h = 0;
        if (im) { var r = im.w / im.h; w = Math.min(MAXW, MAXH * r); h = w / r; }
        else { w = 60; h = 8; }
        if (cur.length && curW + GAP + w > CW) { baris0.push(cur); cur = []; curW = 0; }
        cur.push({ g: g, im: im, w: w, h: h }); curW += (cur.length > 1 ? GAP : 0) + w;
      });
      if (cur.length) baris0.push(cur);
      baris0.forEach(function (row) {
        var rh = Math.max.apply(null, row.map(function (x) { return x.h; })) + 2;
        op(rh, function (y) {
          var x = M;
          row.forEach(function (it) {
            if (it.im) { doc.addImage(it.im.data, 'JPEG', x, y + 1, it.w, it.h, 'img-' + it.g, 'FAST'); doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.2); doc.rect(x, y + 1, it.w, it.h, 'S'); }
            else { font(doc, 7.5, 'italic', MUTED); doc.text('[gambar ' + T(it.g) + ' tidak termuat]', x, y + 5); }
            x += it.w + GAP;
          });
        }, true);
      });
    }

    /* opsi */
    var chosen, keyset;
    if (q.tipe === 'pg') {
      var cs = String(ans == null ? '' : ans).trim().toUpperCase(), ks = String(q.kunci).trim().toUpperCase();
      q.opsi.forEach(function (o, i) {
        var Lb = 'ABCDE'.charAt(i), pil = cs === Lb, kunci = ks === Lb;
        baris(Lb + '.  ' + o + (kunci ? '     <- KUNCI' : ''), { size: 8.8, ind: 4, marker: pil ? '[X]' : '[   ]', style: (pil || kunci) ? 'bold' : 'normal', warna: kunci ? C_OK : (pil ? C_BAD : INK) });
      });
    } else if (q.tipe === 'pgk') {
      chosen = himpunan(ans); keyset = himpunan(q.kunci);
      q.opsi.forEach(function (o, i) {
        var Lb = String(i + 1), pil = !!chosen[Lb], kunci = !!keyset[Lb];
        baris(Lb + '.  ' + o + (kunci ? '     <- KUNCI' : ''), { size: 8.8, ind: 4, marker: pil ? '[X]' : '[   ]', style: (pil || kunci) ? 'bold' : 'normal', warna: kunci ? C_OK : (pil ? C_BAD : INK) });
      });
    } else {
      var pa = bsParts(ans), pk = bsParts(q.kunci);
      q.opsi.forEach(function (o, i) {
        baris((i + 1) + '.  ' + o, { size: 8.8, ind: 4 });
        var cocok = pa[i] && pa[i] === pk[i];
        baris('Jawaban siswa: ' + kataBS(pa[i], true) + '      Kunci: ' + kataBS(pk[i], true) + (cocok ? '      (benar)' : (pa[i] ? '      (salah)' : '      (tidak dijawab)')), { size: 8, ind: 9, style: 'bold', warna: cocok ? C_OK : (pa[i] ? C_BAD : C_NONE) });
      });
    }

    /* ringkas jawaban + pembahasan */
    op(6, function (y) {
      font(doc, 8.5, 'bold'); doc.text('Jawaban siswa: ', M + 4, y + 4.2);
      var w1 = doc.getTextWidth('Jawaban siswa: ');
      font(doc, 8.5, 'bold', st.label === 'Benar' ? C_OK : (st.label === 'Kosong' ? C_NONE : C_BAD)); doc.text(T(teksJawaban(q, ans)), M + 4 + w1, y + 4.2);
      font(doc, 8.5, 'bold'); doc.text('Kunci: ', M + 100, y + 4.2);
      var w2 = doc.getTextWidth('Kunci: ');
      font(doc, 8.5, 'bold', C_OK); doc.text(T(teksKunci(q)), M + 100 + w2, y + 4.2);
    });
    if (q.pembahasan) baris('Pembahasan: ' + q.pembahasan, { size: 8, ind: 4, style: 'italic', warna: MUTED });
    op(4, function (y) { doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.2); doc.line(M, y + 2, M + CW, y + 2); });

    /* tata letak: jaga satu butir tetap utuh bila muat di satu halaman */
    var total = ops.reduce(function (a, o) { return a + o.h; }, 0), usable = L.H - L.TOP - L.BOT;
    if (total <= usable * 0.55) L.pastikan(total);                 // butir pendek: tetap utuh
    else {                                                          // butir panjang: judul + soal + gambar jangan terpisah
      var kepala = 0, n = 0;
      for (var i = 0; i < ops.length && n < 12; i++) { kepala += ops[i].h; n++; if (ops[i].gambar) break; }
      L.pastikan(Math.min(kepala + 12, usable));
    }
    ops.forEach(function (o) { L.pastikan(o.h); o.draw(ctx.y); ctx.y += o.h; });
  }

  /* ============================================================
     PDF 2: analisis butir soal
     ============================================================ */
  function sebaran(b) {
    var s = b.dist.map(function (x) {
      if (b.tipe === 'bs') return 'P' + x.label + ' B' + x.n + (x.kunci === 'B' ? '*' : '') + '/S' + x.n2 + (x.kunci === 'S' ? '*' : '');
      return (b.tipe === 'pg' ? x.label : 'P' + x.label) + '=' + x.n + (x.kunci ? '*' : '');
    }).join('   ');
    return s + (b.kosong ? '   kosong=' + b.kosong : '');
  }
  function analisisPDF(D, opsi) {
    opsi = opsi || {};
    var A = D.analisis;
    if (!A || !A.n) return Promise.reject(new Error('Belum ada siswa yang selesai, analisis belum bisa dibuat.'));
    return siap().then(function () {
      var doc = buatDoc('landscape'), W = 297, H = 210, M = 14, kkm = D.pengaturan.kkm, judul = D.pengaturan.judul || 'Ujian Online';
      band(doc, W, judul, 'Analisis Butir Soal  |  ' + namaPaket(D));
      font(doc, 9.5, 'normal');
      var info = 'Peserta dianalisis: ' + A.n + '     Rata-rata: ' + num(A.rata) + '     Simpangan baku: ' + num(A.simpangan) + '     Tuntas (>= ' + kkm + '): ' + A.tuntas + ' (' + Math.round(A.tuntas / A.n * 100) + '%)     Nilai tertinggi/terendah: ' + num(A.tertinggi) + ' / ' + num(A.terendah) + '     Reliabilitas (alpha): ' + (A.alpha == null ? '-' : num3(A.alpha));
      doc.text(T(info), M, 24);
      font(doc, 8, 'normal', MUTED);
      var catatan = ['Tingkat kesukaran (p): < 30% sukar, 30-70% sedang, > 70% mudah.   Daya pembeda dihitung dari kelompok atas/bawah 27% (baru dihitung bila peserta >= 6).   * = kunci jawaban.   P1, P2, ... = pernyataan/pilihan ke-1, ke-2, ...   B/S = jumlah yang menjawab Benar/Salah.'];
      doc.text(doc.splitTextToSize(T(catatan[0]), W - 2 * M), M, 29);

      var body = A.butir.map(function (b) {
        return [String(b.no), T(b.materi), T(b.kunci), Math.round(b.p * 100) + '%  ' + b.kategori, b.dp == null ? '-' : num3(b.dp) + '  ' + b.kategori_dp, T(sebaran(b)), T(b.rekomendasi)];
      });
      doc.autoTable({
        startY: 35, margin: { left: M, right: M, top: 16, bottom: 16 },
        head: [['No', 'Materi', 'Kunci', 'Tingkat kesukaran', 'Daya pembeda', 'Sebaran jawaban', 'Rekomendasi']], body: body,
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, lineColor: LINE, lineWidth: 0.2, textColor: INK, valign: 'middle' },
        headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 250, 249] },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 44 }, 2: { cellWidth: 16, halign: 'center' }, 3: { cellWidth: 34 }, 4: { cellWidth: 32 }, 5: { cellWidth: 72 }, 6: { cellWidth: 61 } },
        didParseCell: function (d) {
          if (d.section !== 'body') return;
          var b = A.butir[d.row.index]; if (!b) return;
          if (d.column.index === 3) { d.cell.styles.textColor = b.kategori === 'Mudah' ? C_OK : (b.kategori === 'Sedang' ? INK : C_BAD); d.cell.styles.fontStyle = 'bold'; }
          if (d.column.index === 4 && b.dp != null) { d.cell.styles.textColor = b.dp >= 0.3 ? C_OK : (b.dp >= 0.2 ? C_WARN : C_BAD); d.cell.styles.fontStyle = 'bold'; }
          if (d.column.index === 2) { d.cell.styles.textColor = C_OK; d.cell.styles.fontStyle = 'bold'; }
        }
      });

      var y = doc.lastAutoTable.finalY + 8;
      if (y > H - 50) { doc.addPage(); y = 20; }
      font(doc, 11, 'bold'); doc.text('Ketercapaian per materi (terendah dahulu)', M, y);
      doc.autoTable({
        startY: y + 3, margin: { left: M, right: M, top: 16, bottom: 16 },
        head: [['Materi', 'Nomor soal', 'Ketercapaian']], body: A.materi.map(function (m) { return [T(m.materi), m.nomor.join(', '), Math.round(m.p * 100) + '%']; }),
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, lineColor: LINE, lineWidth: 0.2, textColor: INK },
        headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 250, 249] },
        columnStyles: { 0: { cellWidth: 115 }, 1: { cellWidth: 115 }, 2: { cellWidth: 39, halign: 'center' } }
      });

      footer(doc, W, H, judul + '  |  Analisis butir ' + (D.pengaturan.pk || ''));
      var nama = opsi.namaFile || ('analisis-butir-' + (D.pengaturan.pk || 'paket').toLowerCase() + '-' + tgl() + '.pdf');
      doc.save(nama);
      return nama;
    });
  }


  /* ============================================================
     PETA BELAJAR SISWA (insight per anak: materi dikuasai / belum)
     Untuk guru, orang tua, dan siswa. Satu siswa = 1-2 halaman.
     ============================================================ */
  var BATAS_KUASAI = 0.75, BATAS_TUMBUH = 0.5;
  function levelMateri(p) {
    if (p >= BATAS_KUASAI) return { label: 'Dikuasai', warna: C_OK, kode: 'k' };
    if (p >= BATAS_TUMBUH) return { label: 'Berkembang', warna: C_WARN, kode: 'b' };
    return { label: 'Perlu penguatan', warna: C_BAD, kode: 'p' };
  }
  function perMateri(D, rec) {
    var mp = {}, urut = [];
    D.soal.forEach(function (q) {
      var m = q.materi || 'Umum';
      if (!mp[m]) { mp[m] = { materi: m, bobot: 0, skor: 0, nomor: [], dilatih: [], kosong: 0 }; urut.push(m); }
      var o = mp[m], b = Number(q.bobot) || 1, st = statusButir(q, rec);
      o.bobot += b; o.skor += st.skor * b; o.nomor.push(q.no);
      if (st.label !== 'Benar') o.dilatih.push(q.no);
      if (st.label === 'Kosong') o.kosong++;
    });
    return urut.map(function (m) { var o = mp[m]; o.p = o.bobot ? Math.min(1, o.skor / o.bobot) : 0; return o; });
  }
  function rataMateri(D) {
    var jum = {}, n = 0;
    (D.hasil || []).forEach(function (r) { n++; perMateri(D, r).forEach(function (m) { jum[m.materi] = (jum[m.materi] || 0) + m.p; }); });
    var o = {}; Object.keys(jum).forEach(function (k) { o[k] = n ? jum[k] / n : 0; }); return o;
  }
  function daftarTeks(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' dan ' + a[a.length - 1]; }
  function posisi(nilai, kkm) {
    if (nilai >= kkm + 15) return { label: 'SANGAT BAIK', warna: C_OK, kal: 'sudah jauh melampaui batas ketuntasan' };
    if (nilai >= kkm) return { label: 'BAIK (TUNTAS)', warna: C_OK, kal: 'sudah mencapai batas ketuntasan' };
    if (nilai >= kkm - 15) return { label: 'CUKUP - HAMPIR TUNTAS', warna: C_WARN, kal: 'sudah dekat dengan batas ketuntasan, tinggal sedikit penguatan' };
    return { label: 'PERLU PENDAMPINGAN', warna: C_BAD, kal: 'masih membutuhkan pendampingan pada beberapa materi' };
  }

  function petaPDF(D, daftar, opsi) {
    opsi = opsi || {};
    if (!daftar || !daftar.length) return Promise.reject(new Error('Belum ada siswa yang selesai mengerjakan.'));
    return siap().then(function () {
      var doc = buatDoc('portrait'), W = 210, H = 297, M = 14, CW = W - 2 * M, TOP = 16, BOT = 16;
      var kkm = D.pengaturan.kkm, judul = D.pengaturan.judul || 'Ujian Online', mapel = D.pengaturan.mapel || 'mata pelajaran ini';
      var rataKelas = (D.analisis && D.analisis.n) ? D.analisis.rata : null, avg = rataMateri(D);
      var ctx = { y: 0, run: '' };

      function halamanBaru() { doc.addPage(); ctx.y = TOP; font(doc, 7.5, 'normal', MUTED); doc.text(T(ctx.run), M, 9.5); doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(M, 11, W - M, 11); }
      function pastikan(h) { if (ctx.y + h > H - BOT) halamanBaru(); }
      function judulBagian(t) { pastikan(14); ctx.y += 3; font(doc, 11, 'bold', BRAND); doc.text(T(t), M, ctx.y); ctx.y += 2; doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]); doc.setLineWidth(0.4); doc.line(M, ctx.y, M + CW, ctx.y); ctx.y += 5; }
      function teks(t, o) {
        o = o || {}; var sz = o.size || 9.5, lh = sz * 0.46, x = M + (o.indent || 0), w = CW - (o.indent || 0);
        font(doc, sz, o.style || 'normal', o.warna || INK);
        var ln = doc.splitTextToSize(T(t), w);
        ln.forEach(function (l) { pastikan(lh + 0.5); font(doc, sz, o.style || 'normal', o.warna || INK); doc.text(l, x, ctx.y); ctx.y += lh; });
        ctx.y += (o.after == null ? 1.2 : o.after);
      }
      function butir(t, o) { o = o || {}; var y0 = ctx.y; pastikan(6); doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]); doc.circle ? doc.circle(M + 1.6, ctx.y - 1.1, 0.7, 'F') : doc.rect(M + 1, ctx.y - 1.6, 1, 1, 'F'); teks(t, { indent: 5, size: o.size, style: o.style, warna: o.warna, after: 1.4 }); }

      daftar.forEach(function (rec, idx) {
        rec.jawaban = rec.jawaban || {}; rec.skor = rec.skor || {};
        if (idx > 0) doc.addPage();
        ctx.run = 'Peta Belajar - ' + rec.nama + ' · ' + rec.kelas;
        var nilai = Number(rec.nilai) || 0, ps = posisi(nilai, kkm), rs = ringkasan(D, rec);
        var mm = perMateri(D, rec);
        var kuat = mm.filter(function (m) { return m.p >= BATAS_KUASAI; }).sort(function (a, b) { return b.p - a.p; });
        var tumbuh = mm.filter(function (m) { return m.p >= BATAS_TUMBUH && m.p < BATAS_KUASAI; }).sort(function (a, b) { return a.p - b.p; });
        var lemah = mm.filter(function (m) { return m.p < BATAS_TUMBUH; }).sort(function (a, b) { return a.p - b.p; });
        var perlu = lemah.concat(tumbuh);                       // urutan prioritas: terendah dahulu

        /* kepala */
        band(doc, W, judul, 'Peta Belajar Siswa  |  ' + namaPaket(D));
        font(doc, 8, 'normal', MUTED); doc.text('Nama', M, 25); doc.text('Kelas / NISN', M, 31); doc.text('Mata pelajaran', M, 37);
        font(doc, 12, 'bold'); doc.text(T(rec.nama), M + 30, 25);
        font(doc, 9.5, 'normal'); doc.text(T(rec.kelas + '  /  ' + rec.nisn), M + 30, 31); doc.text(T(mapel + (D.pengaturan.paket ? ' - ' + D.pengaturan.paket : '')), M + 30, 37);
        var bx = W - M - 46;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.4); doc.roundedRect(bx, 21, 46, 22, 2, 2, 'S');
        font(doc, 7.5, 'normal', MUTED); doc.text('NILAI TRYOUT', bx + 23, 26, { align: 'center' });
        font(doc, 21, 'bold', ps.warna); doc.text(num(nilai), bx + 23, 36, { align: 'center' });
        font(doc, 7, 'normal', MUTED); doc.text('KKM ' + kkm + (rataKelas != null ? '  |  rata-rata kelas ' + num(rataKelas) : ''), bx + 23, 40.7, { align: 'center' });
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(M, 46, W - M, 46);
        ctx.y = 52;

        /* posisi */
        font(doc, 9.5, 'normal', MUTED); doc.text('Posisi saat ini:', M, ctx.y);
        font(doc, 12, 'bold', ps.warna); doc.text(T(ps.label), M + 28, ctx.y);
        ctx.y += 6;
        var banding = rataKelas == null ? '' : (nilai > rataKelas + 2 ? ' Nilai berada di atas rata-rata kelas.' : nilai < rataKelas - 2 ? ' Nilai berada di bawah rata-rata kelas.' : ' Nilai setara dengan rata-rata kelas.');
        teks('Pada tryout ini Ananda menjawab benar penuh ' + rs.benar + ' dari ' + D.soal.length + ' soal' + (rs.sebagian ? ', benar sebagian ' + rs.sebagian + ' soal' : '') + (rs.kosong ? ', dan ' + rs.kosong + ' soal belum dijawab' : '') + '. Capaian ' + ps.kal + ' (KKM ' + kkm + ').' + banding, { after: 2 });

        /* peta materi */
        judulBagian('Peta penguasaan materi');
        teks('Batang menunjukkan persentase penguasaan Ananda pada tiap materi. Garis hitam di batang = rata-rata kelas. Dikuasai >= 75%, Berkembang 50-74%, Perlu penguatan < 50%.', { size: 7.8, warna: MUTED, after: 3 });
        var BX = M + 74, BW = 48;
        mm.slice().sort(function (a, b) { return a.p - b.p; }).forEach(function (m) {
          var lv = levelMateri(m.p), lab = doc.splitTextToSize(T(m.materi), 70), baris = Math.max(lab.length * 4, 5);
          var det = m.dilatih.length ? 'Soal nomor ' + m.nomor.join(', ') + '. Perlu dilatih ulang: nomor ' + m.dilatih.join(', ') + (m.kosong ? ' (' + m.kosong + ' belum dijawab)' : '') + '.' : 'Soal nomor ' + m.nomor.join(', ') + '. Semua benar.';
          var dl = doc.splitTextToSize(T(det), CW - 4);
          pastikan(baris + dl.length * 3.4 + 4);
          var y = ctx.y;
          font(doc, 9, 'normal'); lab.forEach(function (l, i) { doc.text(l, M, y + i * 4); });
          doc.setFillColor(LINE[0], LINE[1], LINE[2]); doc.rect(BX, y - 3, BW, 3.8, 'F');
          doc.setFillColor(lv.warna[0], lv.warna[1], lv.warna[2]); if (m.p > 0) doc.rect(BX, y - 3, BW * m.p, 3.8, 'F');
          var ka = avg[m.materi]; if (ka != null) { doc.setDrawColor(INK[0], INK[1], INK[2]); doc.setLineWidth(0.5); doc.line(BX + BW * ka, y - 4, BX + BW * ka, y + 1.4); }
          font(doc, 9, 'bold', lv.warna); doc.text(Math.round(m.p * 100) + '%', BX + BW + 3, y);
          font(doc, 8.5, 'bold', lv.warna); doc.text(T(lv.label), BX + BW + 15, y);
          ctx.y = y + baris;
          font(doc, 7.5, 'normal', MUTED); dl.forEach(function (l) { doc.text(l, M + 2, ctx.y); ctx.y += 3.4; });
          doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.2); doc.line(M, ctx.y, M + CW, ctx.y); ctx.y += 4;
        });

        /* ringkas kuat / perlu */
        judulBagian('Ringkasan');
        teks('Sudah dikuasai: ' + (kuat.length ? kuat.map(function (m) { return m.materi + ' (' + Math.round(m.p * 100) + '%)'; }).join('; ') : 'belum ada materi yang mencapai 75%; mulai dari materi yang paling mendekati (lihat urutan di bawah).'), { warna: C_OK, style: 'bold', after: 1.5 });
        teks('Perlu diperkuat (urutan prioritas): ' + (perlu.length ? perlu.map(function (m) { return m.materi + ' (' + Math.round(m.p * 100) + '%)'; }).join('; ') : 'tidak ada, semua materi sudah dikuasai.'), { warna: perlu.length ? C_BAD : C_OK, style: 'bold', after: 2 });

        /* panduan guru */
        judulBagian('Panduan untuk guru');
        if (perlu.length) {
          perlu.slice(0, 4).forEach(function (m) {
            butir(m.materi + ' (' + Math.round(m.p * 100) + '%): ulangi konsep dasar dengan contoh bertahap, lalu beri 3-5 soal latihan setara pada nomor ' + (m.dilatih.join(', ') || '-') + '. Periksa apakah kesalahan berasal dari konsep, ketelitian membaca soal, atau kurang waktu' + (m.kosong ? ' (ada soal yang belum dijawab)' : '') + '.');
          });
          if (perlu.length > 4) teks('Materi lain yang juga perlu perhatian: ' + perlu.slice(4).map(function (m) { return m.materi; }).join('; ') + '.', { indent: 5, size: 8.5, warna: MUTED });
        } else butir('Semua materi sudah dikuasai. Beri soal pengayaan atau tugas tutor sebaya agar Ananda tetap tertantang.');
        if (kuat.length) butir('Kekuatan yang dapat dimanfaatkan: ' + daftarTeks(kuat.slice(0, 3).map(function (m) { return m.materi; })) + '.');
        if (rs.kosong >= 3) butir('Ada ' + rs.kosong + ' soal yang belum dijawab; latih pengelolaan waktu dan strategi mengerjakan soal yang mudah lebih dahulu.');
        if ((rec.keluar || 0) >= 3) butir('Layar ujian tercatat ditinggalkan ' + rec.keluar + ' kali; ingatkan untuk fokus pada layar ujian.');

        /* panduan orang tua */
        judulBagian('Panduan untuk orang tua / wali');
        teks('Gambaran ini diambil dari satu kali tryout, sehingga sifatnya sebagai peta awal untuk menentukan fokus belajar, bukan penilaian akhir.', { size: 8.5, warna: MUTED, after: 2 });
        if (kuat.length) butir('Ananda sudah baik pada ' + daftarTeks(kuat.slice(0, 3).map(function (m) { return m.materi; })) + '. Berikan apresiasi atas usahanya.');
        if (perlu.length) {
          butir('Bantu Ananda berlatih terutama pada ' + daftarTeks(perlu.slice(0, 2).map(function (m) { return m.materi; })) + ', sekitar 15-20 menit per hari, tidak perlu lama tetapi rutin.');
          butir('Ajak Ananda menjelaskan kembali dengan kata-katanya sendiri; bila ia bisa menjelaskan, berarti konsepnya sudah dipahami.');
          butir('Hindari membandingkan dengan teman. Fokus pada kemajuan Ananda dari minggu ke minggu.');
        } else butir('Pertahankan kebiasaan belajar yang sudah baik, dan beri kesempatan Ananda mencoba soal yang lebih menantang.');
        butir('Pastikan tidur cukup dan sarapan sebelum ujian; suasana tenang membantu Ananda berpikir jernih.');

        /* pesan untuk anak */
        judulBagian('Pesan untuk Ananda');
        teks((kuat.length ? 'Hebat! Kamu sudah kuat di ' + daftarTeks(kuat.slice(0, 3).map(function (m) { return m.materi; })) + '. ' : 'Terima kasih sudah berusaha mengerjakan sampai selesai. ') + (perlu.length ? 'Langkah berikutnya: latih sedikit demi sedikit ' + daftarTeks(perlu.slice(0, 2).map(function (m) { return m.materi; })) + '. Setiap hari 15 menit saja, kamu pasti bisa naik!' : 'Pertahankan ya, dan bantu temanmu yang belum paham.'), { after: 1 });
      });

      footer(doc, W, H, judul + '  |  Peta Belajar ' + (D.pengaturan.pk || ''));
      var nama = opsi.namaFile || ('peta-belajar-' + (D.pengaturan.pk || 'paket').toLowerCase() + '-' + (daftar.length === 1 ? slug(daftar[0].nama) : 'semua') + '-' + tgl() + '.pdf');
      doc.save(nama);
      return nama;
    });
  }

  root.UjianPDF = { petaPDF: petaPDF, siap: siap, hasilPDF: hasilPDF, analisisPDF: analisisPDF, _T: T, _teksJawaban: teksJawaban, _statusButir: statusButir };
})(typeof window !== 'undefined' ? window : globalThis);

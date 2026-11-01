/* TRYOUT TKA MI HUSNAYAIN SLEMAN — halaman guru */
(function () {
  'use strict';
  var C = window.UJIAN_CONFIG || {};
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hms(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ' j ' : '') + m + ' mnt'; }
  function num(x) { return String(Math.round(x * 10) / 10).replace('.', ','); }

  var D = null, PIN = '', PK = '', tab = 'paket', auto = 0, urut = { k: 'nilai', d: -1 }, filterKelas = '';
  var modePDF = 'lengkap';

  function api(action, data) {
    if (!C.API_URL) return Promise.reject(new Error('Alamat server belum diatur (js/config.js).'));
    var b = { action: action, pin: PIN }; for (var k in (data || {})) b[k] = data[k];
    return fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) })
      .then(function (r) { return r.json(); }).catch(function () { throw new Error('Tidak bisa terhubung ke server.'); });
  }
  function toast(m) { var t = document.createElement('div'); t.className = 'toast'; t.style.bottom = '30px'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }

  function jalankan(btn, fn) { // jalankan tugas PDF dengan tombol terkunci + pesan
    var t0 = btn.textContent; btn.disabled = true; btn.textContent = 'Menyiapkan…';
    Promise.resolve().then(fn).then(function (nama) { toast('PDF diunduh: ' + nama); })
      .catch(function (e) { toast(e && e.message ? e.message : 'Gagal membuat PDF.'); })
      .then(function () { btn.disabled = false; btn.textContent = t0; });
  }
  function simpanCSV(rows, nama) {
    var csv = '\ufeff' + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  }
  function tglStr() { var d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }

  /* ---------- masuk ---------- */
  $('#g-form').onsubmit = function (e) {
    e.preventDefault(); PIN = $('#pin').value.trim();
    var m = $('#g-msg'); m.hidden = true;
    muat().then(function () { try { sessionStorage.setItem('g_pin', PIN); } catch (x) {} }).catch(function (er) { m.hidden = false; m.textContent = er.message; });
  };
  $('#g-out').onclick = function () { try { sessionStorage.removeItem('g_pin'); } catch (x) {} location.reload(); };
  $('#g-ref').onclick = function () { muat().then(function () { toast('Data diperbarui'); }).catch(function (e) { toast(e.message); }); };
  $$('#g-tabs button').forEach(function (b) { b.onclick = function () { gantiTab(b.dataset.t); }; });
  $('#g-pk').onchange = function () { PK = this.value; muat().catch(function (e) { toast(e.message); }); };

  function muat() {
    return api('guru', { pk: PK }).then(function (r) {
      if (!r.ok) throw new Error(r.error || 'Gagal.');
      D = r; PK = r.pk || ''; $('#g-login').hidden = true; $('#g-app').hidden = false;
      $('#g-judul').textContent = r.pengaturan.judul;
      $('#g-sub').textContent = r.kosong ? 'Belum ada paket' : [r.pengaturan.pk, r.pengaturan.mapel, r.pengaturan.paket, 'KKM ' + r.pengaturan.kkm].filter(Boolean).join(' · ');
      var sp = $('#g-pk'); sp.innerHTML = r.paket_list.map(function (p) { return '<option value="' + esc(p.pk) + '"' + (p.pk === PK ? ' selected' : '') + '>' + esc(p.pk) + (p.status === 'arsip' ? ' (arsip)' : '') + '</option>'; }).join('');
      document.title = 'Guru — ' + r.pengaturan.judul;
      render();
    });
  }
  function gantiTab(t) {
    tab = t; $$('#g-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    ['paket', 'pantau', 'rekap', 'analisis', 'riwayat', 'atur'].forEach(function (x) { $('#t-' + x).hidden = x !== t; });
    clearInterval(auto);
    if (t === 'pantau') auto = setInterval(function () { if (!document.hidden) muat().catch(function () {}); }, 20000);
    render();
  }
  function render() { if (!D) return; ({ paket: rPaket, pantau: rPantau, rekap: rRekap, analisis: rAnalisis, riwayat: rRiwayat, atur: rAtur })[tab](); }

  /* ---------- pemantauan ---------- */
  function rPantau() {
    var s = D.siswa, b = s.filter(function (x) { return x.status === 'belum'; }).length, k = s.filter(function (x) { return x.status === 'berlangsung'; }).length, d = s.filter(function (x) { return x.status === 'selesai'; }).length;
    var h = '<div class="cards"><div class="stat"><b>' + s.length + '</b><span>Peserta</span></div><div class="stat"><b>' + b + '</b><span>Belum mulai</span></div><div class="stat"><b>' + k + '</b><span>Sedang mengerjakan</span></div><div class="stat"><b>' + d + '</b><span>Sudah selesai</span></div></div>';
    h += '<div class="row"><select id="f-kelas">' + kelasOpt() + '</select><span class="small">Diperbarui otomatis tiap 20 detik di tab ini. Paket <b>' + esc(PK) + '</b>: <b>' + (KEADAAN[D.pengaturan.keadaan] || '') + '</b></span></div>';
    h += '<div class="tw"><table class="t"><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Status</th><th class="n">Terisi</th><th class="n">Sisa waktu</th><th class="n">Keluar layar</th><th class="n">Nilai</th><th class="noprint"></th></tr>';
    s.filter(function (x) { return !filterKelas || x.kelas === filterKelas; }).forEach(function (x, i) {
      var tg = x.status === 'selesai' ? '<span class="tag ok">Selesai</span>' : x.status === 'berlangsung' ? '<span class="tag w">Mengerjakan</span>' : '<span class="tag">Belum</span>';
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td>' + tg + '</td><td class="n">' + (x.status === 'belum' ? '' : x.terisi + '/' + D.soal.length) + '</td><td class="n">' + (x.sisa_detik != null ? hms(x.sisa_detik) : '') + '</td><td class="n">' + (x.keluar ? '<span class="tag ' + (x.keluar >= 3 ? 'b' : 'w') + '">' + x.keluar + '×</span>' : '') + '</td><td class="n">' + (x.nilai != null ? '<b>' + num(x.nilai) + '</b>' : '') + '</td><td class="noprint">' + (x.status !== 'belum' ? '<button class="btn sm line" data-reset="' + x.nisn + '">Reset</button>' : '') + '</td></tr>';
    });
    $('#t-pantau').innerHTML = h + '</table></div><p class="small">Reset = hapus hasil <b>paket ini saja</b> dan izinkan siswa mengulang (paket lain tidak terpengaruh; mis. HP rusak sebelum terkirim, atau salah orang).</p>';
    $('#f-kelas').onchange = function () { filterKelas = this.value; rPantau(); };
    $$('[data-reset]', $('#t-pantau')).forEach(function (b) {
      b.onclick = function () {
        var s0 = D.siswa.filter(function (x) { return x.nisn === b.dataset.reset; })[0];
        if (!confirm('Reset ujian ' + s0.nama + '? Jawaban dan nilai siswa ini dihapus, dan ia dapat mengulang dari awal.')) return;
        api('guru_reset', { nisn: s0.nisn, pk: PK }).then(function (r) { if (!r.ok) throw new Error(r.error); return muat(); }).then(function () { toast('Direset: ' + s0.nama); }).catch(function (e) { toast(e.message); });
      };
    });
  }
  function kelasOpt() {
    var ks = []; D.siswa.forEach(function (x) { if (ks.indexOf(x.kelas) < 0) ks.push(x.kelas); }); ks.sort();
    return '<option value="">Semua kelas</option>' + ks.map(function (k) { return '<option' + (k === filterKelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
  }

  /* ---------- rekap ---------- */
  function rRekap() {
    var kkm = D.pengaturan.kkm, rows = D.siswa.filter(function (x) { return !filterKelas || x.kelas === filterKelas; });
    var hm = {}; D.hasil.forEach(function (x) { hm[x.nisn] = x; });
    var done = rows.filter(function (x) { return x.nilai != null; }), nil = done.map(function (x) { return x.nilai; });
    var avg = nil.length ? nil.reduce(function (a, b) { return a + b; }, 0) / nil.length : 0;
    var h = '<div class="cards"><div class="stat"><b>' + done.length + '/' + rows.length + '</b><span>Sudah selesai</span></div><div class="stat"><b>' + (nil.length ? num(avg) : '-') + '</b><span>Rata-rata</span></div><div class="stat"><b>' + (nil.length ? num(Math.max.apply(null, nil)) : '-') + '</b><span>Tertinggi</span></div><div class="stat"><b>' + (nil.length ? num(Math.min.apply(null, nil)) : '-') + '</b><span>Terendah</span></div><div class="stat"><b>' + nil.filter(function (v) { return v >= kkm; }).length + '</b><span>Tuntas (≥ ' + kkm + ')</span></div></div>';
    h += '<div class="row"><select id="f-kelas">' + kelasOpt() + '</select><button class="btn sm" id="b-csv">Unduh CSV (Excel)</button><button class="btn sm sec" id="b-print">Cetak</button><button class="btn sm line" id="b-sheet">Perbarui sheet paket ini</button></div>';
    h += '<div class="row noprint"><b style="font-size:14px">PDF jawaban siswa:</b><select id="f-mode"><option value="lengkap"' + (modePDF === 'lengkap' ? ' selected' : '') + '>Lengkap (soal + gambar + pembahasan)</option><option value="ringkas"' + (modePDF === 'ringkas' ? ' selected' : '') + '>Ringkas (tabel jawaban &amp; kunci)</option></select><button class="btn sm" id="b-pdfall">Unduh PDF semua siswa' + (filterKelas ? ' kelas ' + esc(filterKelas) : '') + '</button></div><p class="small noprint" style="margin-top:-4px">Berisi jawaban yang dipilih siswa, kunci yang benar, dan skor tiap soal. Untuk satu siswa, pakai tombol PDF di barisnya. Mode Lengkap + semua siswa menghasilkan file besar; pilih Ringkas bila ingin cepat.</p>';
    var arr = rows.map(function (x) { var r = hm[x.nisn]; return { x: x, r: r, nilai: x.nilai == null ? -1 : x.nilai }; });
    arr.sort(function (a, b) { var k = urut.k; var va = k === 'nama' ? a.x.nama : k === 'kelas' ? a.x.kelas + a.x.nama : a.nilai, vb = k === 'nama' ? b.x.nama : k === 'kelas' ? b.x.kelas + b.x.nama : b.nilai; return (va > vb ? 1 : va < vb ? -1 : 0) * urut.d; });
    h += '<div class="tw"><table class="t"><tr><th>No</th><th class="s" data-s="nama">Nama</th><th class="s" data-s="kelas">Kelas</th><th>NISN</th><th class="s n" data-s="nilai">Nilai ▾</th><th class="n">Durasi</th><th class="n">Keluar</th><th>Kode</th><th>Ket.</th><th class="noprint"></th></tr>';
    arr.forEach(function (o, i) {
      var x = o.x, r = o.r, ket = x.nilai == null ? '<span class="tag">' + (x.status === 'berlangsung' ? 'Mengerjakan' : 'Belum') + '</span>' : (x.nilai >= kkm ? '<span class="tag ok">Tuntas</span>' : '<span class="tag b">Belum tuntas</span>') + (r && r.terlambat ? ' <span class="tag w">Terlambat</span>' : '');
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td>' + esc(x.nisn) + '</td><td class="n"><b>' + (x.nilai != null ? num(x.nilai) : '') + '</b></td><td class="n">' + (r ? num(r.durasi_menit) + ' mnt' : '') + '</td><td class="n">' + (r ? r.keluar : '') + '</td><td>' + (r ? esc(r.kode) : '') + '</td><td>' + ket + '</td><td class="noprint">' + (r ? '<button class="btn sm line" data-pdf="' + esc(x.nisn) + '">PDF</button>' : '') + '</td></tr>';
    });
    $('#t-rekap').innerHTML = h + '</table></div>';
    $('#f-kelas').onchange = function () { filterKelas = this.value; rRekap(); };
    $$('th.s', $('#t-rekap')).forEach(function (th) { th.onclick = function () { urut = { k: th.dataset.s, d: urut.k === th.dataset.s ? -urut.d : (th.dataset.s === 'nilai' ? -1 : 1) }; rRekap(); }; });
    $('#b-print').onclick = function () { window.print(); };
    $('#f-mode').onchange = function () { modePDF = this.value; };
    $$('[data-pdf]', $('#t-rekap')).forEach(function (b) {
      b.onclick = function () {
        var rec = hm[b.dataset.pdf]; if (!rec) return;
        jalankan(b, function () { return window.UjianPDF.hasilPDF(D, [rec], { mode: modePDF, gambarDir: C.GAMBAR_DIR }); });
      };
    });
    $('#b-pdfall').onclick = function () {
      var daftar = arr.map(function (o) { return o.r; }).filter(Boolean);
      var nm = 'hasil-' + PK.toLowerCase() + '-' + (filterKelas ? filterKelas.toLowerCase() : 'semua') + '-' + modePDF + '-' + tglStr() + '.pdf';
      jalankan(this, function () { return window.UjianPDF.hasilPDF(D, daftar, { mode: modePDF, gambarDir: C.GAMBAR_DIR, namaFile: nm }); });
    };
    $('#b-csv').onclick = function () { unduhCSV(arr); };
    $('#b-sheet').onclick = function () { api('guru_tulis_sheet', { pk: PK }).then(function (r) { toast(r.ok ? 'Sheet "Rekap ' + PK + '" & "Analisis ' + PK + '" diperbarui' : r.error); }).catch(function (e) { toast(e.message); }); };
  }
  function unduhCSV(arr) {
    var head = ['No', 'Nama', 'Kelas', 'NISN', 'Status', 'Nilai', 'Durasi_menit', 'Keluar_layar', 'Kode'].concat(D.soal.map(function (q) { return 'S' + q.no; }));
    var L = [head];
    arr.forEach(function (o, i) { var x = o.x, r = o.r; L.push([i + 1, x.nama, x.kelas, "'" + x.nisn, x.status, x.nilai == null ? '' : x.nilai, r ? r.durasi_menit : '', r ? r.keluar : '', r ? r.kode : ''].concat(D.soal.map(function (q) { return r ? (r.skor[q.no] != null ? r.skor[q.no] : 0) : ''; }))); });
    var csv = '﻿' + L.map(function (r) { return r.map(function (v) { v = String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var d = new Date(); a.download = 'rekap-' + PK.toLowerCase() + '-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- analisis butir ---------- */
  function rAnalisis() {
    var A = D.analisis, kkm = D.pengaturan.kkm, h = '';
    if (!A.n) { $('#t-analisis').innerHTML = '<div class="msg info">Belum ada siswa yang menyelesaikan ujian. Analisis muncul setelah ada hasil masuk.</div>'; return; }
    h += '<div class="cards"><div class="stat"><b>' + A.n + '</b><span>Peserta dianalisis</span></div><div class="stat"><b>' + num(A.rata) + '</b><span>Rata-rata</span></div><div class="stat"><b>' + num(A.simpangan) + '</b><span>Simpangan baku</span></div><div class="stat"><b>' + A.tuntas + ' (' + Math.round(A.tuntas / A.n * 100) + '%)</b><span>Tuntas ≥ ' + kkm + '</span></div><div class="stat"><b>' + (A.alpha == null ? '-' : String(A.alpha).replace('.', ',')) + '</b><span>Reliabilitas (α)</span></div></div>';
    h += '<div class="row noprint"><button class="btn sm" id="b-apdf">Unduh PDF analisis butir</button><button class="btn sm sec" id="b-acsv">Unduh CSV (Excel)</button><button class="btn sm line" id="b-aprint">Cetak</button></div>';
    if (A.n < 6) h += '<div class="msg info">Peserta masih sedikit (< 6): daya pembeda belum dihitung.</div>';
    h += '<div class="tw"><table class="t"><tr><th>No</th><th>Materi</th><th>Kunci</th><th>Tingkat kesukaran</th><th>Daya pembeda</th><th>Sebaran jawaban</th><th>Rekomendasi</th></tr>';
    A.butir.forEach(function (b) {
      var cp = b.kategori === 'Mudah' ? 'ok' : b.kategori === 'Sedang' ? '' : 'b';
      var cd = b.dp == null ? '' : (b.dp >= 0.3 ? 'ok' : b.dp >= 0.2 ? 'w' : 'b');
      var dist = b.dist.map(function (x) { return b.tipe === 'bs' ? '<span class="' + (x.kunci === 'B' ? '' : '') + '">P' + x.label + ': B<b class="' + (x.kunci === 'B' ? 'kk' : '') + '">' + x.n + '</b>/S<b class="' + (x.kunci === 'S' ? 'kk' : '') + '">' + x.n2 + '</b></span>' : '<span class="' + (x.kunci ? 'kk' : '') + '">' + (b.tipe === 'pg' ? x.label : 'P' + x.label) + '=' + x.n + (x.kunci ? '✓' : '') + '</span>'; }).join('') + (b.kosong ? '<span>kosong=' + b.kosong + '</span>' : '');
      h += '<tr data-no="' + b.no + '" style="cursor:pointer"><td><b>' + b.no + '</b></td><td>' + esc(b.materi) + '</td><td>' + esc(b.kunci) + '</td><td><div class="pbar"><i style="width:' + Math.round(b.p * 100) + '%"></i></div>' + Math.round(b.p * 100) + '% <span class="tag ' + cp + '">' + b.kategori + '</span></td><td>' + (b.dp == null ? '-' : String(b.dp).replace('.', ',') + ' <span class="tag ' + cd + '">' + b.kategori_dp + '</span>') + '</td><td class="dist">' + dist + '</td><td>' + esc(b.rekomendasi) + '</td></tr>';
    });
    h += '</table></div><p class="small">Ketuk satu baris untuk melihat soal, kunci, dan pembahasan. Tingkat kesukaran: &lt;30% sukar, 30–70% sedang, &gt;70% mudah. Daya pembeda dihitung dari kelompok atas/bawah 27%. ✓ = kunci. Pada soal Benar/Salah: B = jumlah yang menjawab Benar, S = Salah (tebal hijau = kunci).</p>';
    h += '<h2 class="g">Ketercapaian per materi (terendah dahulu)</h2><div class="tw"><table class="t"><tr><th>Materi</th><th>Soal</th><th>Ketercapaian</th></tr>' + A.materi.map(function (m) { return '<tr><td>' + esc(m.materi) + '</td><td>' + m.nomor.join(', ') + '</td><td style="min-width:160px"><div class="pbar"><i style="width:' + Math.round(m.p * 100) + '%"></i></div>' + Math.round(m.p * 100) + '%</td></tr>'; }).join('') + '</table></div>';
    $('#t-analisis').innerHTML = h;
    $$('tr[data-no]', $('#t-analisis')).forEach(function (tr) { tr.onclick = function () { detail(tr); }; });
    $('#b-apdf').onclick = function () { jalankan(this, function () { return window.UjianPDF.analisisPDF(D, {}); }); };
    $('#b-acsv').onclick = function () { unduhAnalisisCSV(); };
    $('#b-aprint').onclick = function () { window.print(); };
  }
  function unduhAnalisisCSV() {
    var A = D.analisis, L = [['No', 'Tipe', 'Materi', 'Kunci', 'Tingkat_kesukaran_p', 'Kategori_kesukaran', 'Daya_pembeda', 'Kategori_daya_pembeda', 'Sebaran_jawaban', 'Jawaban_kosong', 'Rekomendasi']];
    A.butir.forEach(function (b) {
      var sb = b.dist.map(function (x) { return b.tipe === 'bs' ? 'P' + x.label + ' B' + x.n + (x.kunci === 'B' ? '*' : '') + '/S' + x.n2 + (x.kunci === 'S' ? '*' : '') : (b.tipe === 'pg' ? x.label : 'P' + x.label) + '=' + x.n + (x.kunci ? '*' : ''); }).join('  ');
      L.push([b.no, b.tipe, b.materi, b.kunci, b.p, b.kategori, b.dp == null ? '' : b.dp, b.kategori_dp || '', sb, b.kosong || 0, b.rekomendasi]);
    });
    L.push([], ['Ringkasan paket ' + PK], ['Peserta', A.n], ['Rata-rata', A.rata], ['Simpangan baku', A.simpangan], ['Tertinggi', A.tertinggi], ['Terendah', A.terendah], ['Tuntas (KKM ' + D.pengaturan.kkm + ')', A.tuntas], ['Reliabilitas (alpha)', A.alpha == null ? '' : A.alpha]);
    L.push([], ['Ketercapaian per materi'], ['Materi', 'Nomor soal', 'Ketercapaian']);
    A.materi.forEach(function (m) { L.push([m.materi, m.nomor.join(' '), m.p]); });
    simpanCSV(L, 'analisis-butir-' + PK.toLowerCase() + '-' + tglStr() + '.csv');
  }
  function detail(tr) {
    var nx = tr.nextSibling; if (nx && nx.className === 'dt') { nx.remove(); return; }
    var no = +tr.dataset.no, q = D.soal.filter(function (x) { return x.no === no; })[0], b = D.analisis.butir.filter(function (x) { return x.no === no; })[0];
    var imgs = (q.gambar || '').split(';').filter(Boolean).map(function (g) { return '<img src="' + C.GAMBAR_DIR + esc(g.trim()) + '" alt="">'; }).join('');
    var kk = q.kunci.toUpperCase();
    var ops = q.opsi.map(function (o, i) { var L = q.tipe === 'pg' ? 'ABCDE'.charAt(i) : String(i + 1); var ok = q.tipe === 'pg' ? kk === L : q.tipe === 'pgk' ? kk.split(/[,;\s]+/).indexOf(L) >= 0 : kk.split('-')[i] === 'B'; var lab = q.tipe === 'bs' ? kk.split('-')[i] === 'B' ? 'Benar' : 'Salah' : ''; return '<div>' + (ok && q.tipe !== 'bs' ? '<span class="k">✓ ' : '<span>') + L + '.</span> ' + fmt(o) + (lab ? ' <span class="tag ' + (lab === 'Benar' ? 'ok' : 'b') + '">' + lab + '</span>' : '') + '</div>'; }).join('');
    var r = document.createElement('tr'); r.className = 'dt';
    r.innerHTML = '<td colspan="7"><div style="font-size:15px;line-height:1.6">' + fmt(q.soal) + '</div>' + imgs + '<div style="margin:8px 0">' + ops + '</div><div class="msg info"><b>Kunci: ' + esc(q.kunci) + '.</b> ' + esc(q.pembahasan) + '</div></td>';
    tr.parentNode.insertBefore(r, tr.nextSibling);
  }

  /* ---------- pengaturan ---------- */
  function rAtur() {
    var h = '<div class="stat" style="margin-bottom:12px"><b>Paket ' + esc(PK) + '</b><span>Membuka, menutup, jadwal, dan mengubah paket ada di tab <b>Paket</b>.</span></div>';
    h += '<div class="stat" style="margin-bottom:12px"><b>Hitung ulang nilai paket ' + esc(PK) + '</b><span>Pakai bila kunci jawaban paket ini di sheet "Soal" diperbaiki setelah ada siswa yang selesai. Hanya paket ini yang dihitung ulang.</span><div style="height:10px"></div><button class="btn sm sec" id="a-hitung">Hitung ulang nilai paket ini</button></div>';
    h += '<div class="stat"><b>Soal, siswa, PIN, KKM umum</b><span>Diatur di Google Sheet: sheet <b>Soal</b> (kolom <code>paket</code> = kode paket), <b>Siswa</b>, <b>Pengaturan</b>. Gambar soal diunggah ke folder <code>gambar/</code> di GitHub. Lihat README.</span></div>';
    $('#t-atur').innerHTML = h;
    $('#a-hitung').onclick = function () { if (!confirm('Hitung ulang nilai semua siswa pada paket ' + PK + ' dengan kunci saat ini?')) return; api('guru_hitung_ulang', { pk: PK }).then(function (r) { if (!r.ok) throw new Error(r.error); return muat().then(function () { toast(r.jumlah + ' hasil dihitung ulang'); }); }).catch(function (e) { toast(e.message); }); };
  }

  /* ---------- paket ---------- */
  var KEADAAN = { buka: 'DIBUKA', terjadwal: 'TERJADWAL', tutup: 'DITUTUP', draf: 'DRAF', arsip: 'ARSIP' };
  var MAPEL = [['MTK', 'Matematika'], ['BIN', 'Bahasa Indonesia'], ['IPAS', 'IPAS']];
  function tagKeadaan(k) { return '<span class="tag ' + (k === 'buka' ? 'ok' : k === 'terjadwal' ? 'w' : k === 'tutup' ? 'b' : '') + '">' + (KEADAAN[k] || k) + '</span>'; }
  function dtl(v) { return String(v || '').replace(' ', 'T'); }

  function rPaket() {
    var L = D.paket_list, h = '<div class="row"><button class="btn sm" id="p-baru">+ Paket baru</button><span class="small">Soal diisi di Google Sheet "Soal" (kolom <code>paket</code> = kode). Siswa langsung masuk ke paket yang dibuka untuk kelasnya.</span></div><div id="p-form"></div>';
    if (!L.length) h += '<div class="msg info">Belum ada paket. Ketuk "+ Paket baru".</div>';
    else {
      h += '<div class="tw"><table class="t"><tr><th>Kode</th><th>Paket</th><th>Status</th><th>Jadwal</th><th>Kelas</th><th class="n">Soal</th><th class="n">Selesai</th><th class="n">Rata²</th><th class="noprint"></th></tr>';
      L.forEach(function (p) {
        var jad = p.jadwal_buka || p.jadwal_tutup ? esc(p.jadwal_buka || '…') + '<br>s.d. ' + esc(p.jadwal_tutup || '…') + (p.kontrol === 'jadwal' ? '' : '<br><span class="small">(manual)</span>') : '<span class="small">—</span>';
        var warn = p.n_soal ? (p.masalah.length ? '<br><span class="tag b" title="' + esc(p.masalah.join(' ')) + '">' + p.masalah.length + ' masalah soal</span>' : '') : '<br><span class="tag w">belum ada soal</span>';
        h += '<tr' + (p.pk === PK ? ' style="background:var(--brand-l)"' : '') + '><td><b>' + esc(p.pk) + '</b></td><td>' + esc(p.mapel) + '<br><span class="small">' + esc(p.nama) + ' · ' + p.durasi_menit + ' mnt</span></td><td>' + tagKeadaan(p.keadaan) + (p.n_jalan ? '<br><span class="small">' + p.n_jalan + ' mengerjakan</span>' : '') + '</td><td class="small">' + jad + '</td><td>' + (esc(p.kelas) || 'Semua') + '</td><td class="n">' + p.n_soal + warn + '</td><td class="n">' + p.n_selesai + '/' + p.n_peserta + '</td><td class="n">' + (p.rata == null ? '' : num(p.rata)) + '</td><td class="noprint" style="white-space:nowrap">' +
          '<button class="btn sm line" data-lihat="' + esc(p.pk) + '">Lihat</button> ' +
          (p.keadaan === 'buka' ? '<button class="btn sm warn" data-cmd="tutup" data-pk="' + esc(p.pk) + '">Tutup</button> ' : '<button class="btn sm" data-cmd="buka" data-pk="' + esc(p.pk) + '">Buka sekarang</button> ') +
          ((p.jadwal_buka || p.jadwal_tutup) && !(p.status === 'aktif' && p.kontrol === 'jadwal') ? '<button class="btn sm sec" data-cmd="jadwal" data-pk="' + esc(p.pk) + '">Ikuti jadwal</button> ' : '') +
          '<button class="btn sm line" data-edit="' + esc(p.pk) + '">Ubah</button> ' +
          (p.status === 'arsip' ? '<button class="btn sm line" data-cmd="draf" data-pk="' + esc(p.pk) + '">Keluarkan dari arsip</button>' : '<button class="btn sm line" data-cmd="arsip" data-pk="' + esc(p.pk) + '">Arsipkan</button>') + '</td></tr>';
      });
      h += '</table></div><p class="small">Buka sekarang = terbuka sampai kamu tutup. Ikuti jadwal = otomatis terbuka dan tertutup sesuai jam yang diisi. Siswa yang sedang mengerjakan tetap bisa melanjutkan setelah paket ditutup. Draf dan arsip tidak tampil bagi siswa; nilainya tetap tersimpan.</p>';
    }
    var el = $('#t-paket'); el.innerHTML = h;
    $('#p-baru').onclick = function () { formPaket(null); };
    $$('[data-lihat]', el).forEach(function (b) { b.onclick = function () { PK = b.dataset.lihat; muat().then(function () { gantiTab('pantau'); }).catch(function (e) { toast(e.message); }); }; });
    $$('[data-edit]', el).forEach(function (b) { b.onclick = function () { formPaket(L.filter(function (p) { return p.pk === b.dataset.edit; })[0]); }; });
    $$('[data-cmd]', el).forEach(function (b) {
      b.onclick = function () {
        var c = b.dataset.cmd, pk = b.dataset.pk;
        if ((c === 'tutup' || c === 'arsip') && !confirm((c === 'tutup' ? 'Tutup paket ' : 'Arsipkan paket ') + pk + '? Siswa yang sedang mengerjakan tetap bisa melanjutkan.')) return;
        api('guru_paket_cmd', { pk: pk, perintah: c }).then(function (r) { if (!r.ok) throw new Error(r.error); return muat(); }).then(function () { toast('Paket ' + pk + ' diperbarui'); }).catch(function (e) { toast(e.message); });
      };
    });
  }

  function formPaket(p) {
    var baru = !p, sel = MAPEL.map(function (m) { return '<option value="' + m[0] + '|' + m[1] + '"' + (p && p.mapel === m[1] ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('');
    var h = '<div class="stat" style="margin:10px 0 14px"><b>' + (baru ? 'Paket baru' : 'Ubah ' + esc(p.pk)) + '</b><div class="fg">' +
      (baru ? '<label>Mata pelajaran<select id="pf-mapel">' + sel + '</select></label><label>Nomor paket<input id="pf-no" type="number" min="1" value="1"></label><label>Kode paket<input id="pf-kode" maxlength="20"></label>'
            : '<label>Mata pelajaran<input id="pf-mapel-t" value="' + esc(p.mapel) + '"></label>') +
      '<label>Nama paket<input id="pf-nama" value="' + esc(p ? p.nama : '') + '"></label>' +
      '<label>Durasi (menit)<input id="pf-dur" type="number" min="5" value="' + (p ? p.durasi_menit : 90) + '"></label>' +
      '<label>Jadwal buka (WIB)<input id="pf-buka" type="datetime-local" value="' + dtl(p && p.jadwal_buka) + '"></label>' +
      '<label>Jadwal tutup (WIB)<input id="pf-tutup" type="datetime-local" value="' + dtl(p && p.jadwal_tutup) + '"></label>' +
      '<label>Kelas peserta (kosong = semua)<input id="pf-kelas" placeholder="6A, 6B" value="' + esc(p ? p.kelas : '') + '"></label>' +
      '<label>KKM paket (kosong = umum)<input id="pf-kkm" type="number" value="' + (p ? p.kkm_paket : '') + '"></label></div>' +
      '<div style="height:10px"></div><button class="btn sm" id="pf-simpan">Simpan</button> <button class="btn sm line" id="pf-batal">Batal</button></div>';
    var f = $('#p-form'); f.innerHTML = h;
    function kodeOtomatis() { if (!baru) return; var m = $('#pf-mapel').value.split('|'), n = Math.max(1, +$('#pf-no').value || 1); $('#pf-kode').value = m[0] + '-P' + (n < 10 ? '0' : '') + n; $('#pf-nama').placeholder = 'Tryout TKA ' + m[1] + ' Paket ' + n; }
    if (baru) { $('#pf-mapel').onchange = kodeOtomatis; $('#pf-no').oninput = kodeOtomatis; kodeOtomatis(); }
    $('#pf-batal').onclick = function () { f.innerHTML = ''; };
    $('#pf-simpan').onclick = function () {
      var mapel = baru ? $('#pf-mapel').value.split('|')[1] : $('#pf-mapel-t').value.trim(), kode = baru ? $('#pf-kode').value.trim() : p.pk;
      var d = { kode: kode, mapel: mapel, nama: $('#pf-nama').value.trim() || $('#pf-nama').placeholder || kode, durasi_menit: +$('#pf-dur').value || 90, jadwal_buka: $('#pf-buka').value.replace('T', ' '), jadwal_tutup: $('#pf-tutup').value.replace('T', ' '), kelas: $('#pf-kelas').value.trim(), kkm: $('#pf-kkm').value };
      api('guru_paket_simpan', { baru: baru, data: d }).then(function (r) { if (!r.ok) throw new Error(r.error); PK = r.pk; return muat(); }).then(function () { toast('Paket disimpan'); }).catch(function (e) { toast(e.message); });
    };
  }

  /* ---------- riwayat siswa (semua paket) ---------- */
  function rRiwayat() {
    var R = D.riwayat, rows = R.siswa.filter(function (x) { return !filterKelas || x.kelas === filterKelas; });
    var h = '<div class="row"><select id="f-kelas">' + kelasOpt() + '</select><button class="btn sm" id="b-csv-r">Unduh CSV (Excel)</button><span class="small">Nilai tiap siswa di semua paket yang bukan draf. Nilai paket lama tetap tersimpan.</span></div>';
    if (!R.paket.length) { $('#t-riwayat').innerHTML = h + '<div class="msg info">Belum ada paket yang aktif.</div>'; return; }
    h += '<div class="tw"><table class="t"><tr><th>No</th><th>Nama</th><th>Kelas</th>' + R.paket.map(function (k) { return '<th class="n">' + esc(k) + '</th>'; }).join('') + '<th class="n">Rata²</th></tr>';
    rows.forEach(function (x, i) {
      var v = R.paket.map(function (k) { return x.nilai[k]; }).filter(function (n) { return n != null; });
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td>' + R.paket.map(function (k) { var n = x.nilai[k]; return '<td class="n">' + (n == null ? '<span class="small">—</span>' : '<b>' + num(n) + '</b>') + '</td>'; }).join('') + '<td class="n">' + (v.length ? num(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : '') + '</td></tr>';
    });
    $('#t-riwayat').innerHTML = h + '</table></div>';
    $('#f-kelas').onchange = function () { filterKelas = this.value; rRiwayat(); };
    $('#b-csv-r').onclick = function () {
      var L = [['No', 'Nama', 'Kelas', 'NISN'].concat(R.paket)];
      rows.forEach(function (x, i) { L.push([i + 1, x.nama, x.kelas, "'" + x.nisn].concat(R.paket.map(function (k) { return x.nilai[k] == null ? '' : x.nilai[k]; }))); });
      var csv = '\ufeff' + L.map(function (r) { return r.map(function (v) { v = String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'riwayat-nilai.csv'; document.body.appendChild(a); a.click(); a.remove();
    };
  }

  /* ---------- awal ---------- */
  try { var p = sessionStorage.getItem('g_pin'); if (p) { PIN = p; muat().then(function () { gantiTab('paket'); }).catch(function () { PIN = ''; }); } } catch (e) {}
  var prevMuat = muat; // setelah login pertama aktifkan auto-refresh
  $('#g-form').addEventListener('submit', function () { setTimeout(function () { if (D) gantiTab(tab); }, 1200); });
})();

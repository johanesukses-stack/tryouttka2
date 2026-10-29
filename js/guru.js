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

  var D = null, PIN = '', tab = 'pantau', auto = 0, urut = { k: 'nilai', d: -1 }, filterKelas = '';

  function api(action, data) {
    if (!C.API_URL) return Promise.reject(new Error('Alamat server belum diatur (js/config.js).'));
    var b = { action: action, pin: PIN }; for (var k in (data || {})) b[k] = data[k];
    return fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) })
      .then(function (r) { return r.json(); }).catch(function () { throw new Error('Tidak bisa terhubung ke server.'); });
  }
  function toast(m) { var t = document.createElement('div'); t.className = 'toast'; t.style.bottom = '30px'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }

  /* ---------- masuk ---------- */
  $('#g-form').onsubmit = function (e) {
    e.preventDefault(); PIN = $('#pin').value.trim();
    var m = $('#g-msg'); m.hidden = true;
    muat().then(function () { try { sessionStorage.setItem('g_pin', PIN); } catch (x) {} }).catch(function (er) { m.hidden = false; m.textContent = er.message; });
  };
  $('#g-out').onclick = function () { try { sessionStorage.removeItem('g_pin'); } catch (x) {} location.reload(); };
  $('#g-ref').onclick = function () { muat().then(function () { toast('Data diperbarui'); }).catch(function (e) { toast(e.message); }); };
  $$('#g-tabs button').forEach(function (b) { b.onclick = function () { gantiTab(b.dataset.t); }; });

  function muat() {
    return api('guru').then(function (r) {
      if (!r.ok) throw new Error(r.error || 'Gagal.');
      D = r; $('#g-login').hidden = true; $('#g-app').hidden = false;
      $('#g-judul').textContent = r.pengaturan.judul;
      $('#g-sub').textContent = [r.pengaturan.mapel, r.pengaturan.paket, 'KKM ' + r.pengaturan.kkm].filter(Boolean).join(' · ');
      document.title = 'Guru — ' + r.pengaturan.judul;
      render();
    });
  }
  function gantiTab(t) {
    tab = t; $$('#g-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    ['pantau', 'rekap', 'analisis', 'atur'].forEach(function (x) { $('#t-' + x).hidden = x !== t; });
    clearInterval(auto);
    if (t === 'pantau') auto = setInterval(function () { if (!document.hidden) muat().catch(function () {}); }, 20000);
    render();
  }
  function render() { if (!D) return; ({ pantau: rPantau, rekap: rRekap, analisis: rAnalisis, atur: rAtur })[tab](); }

  /* ---------- pemantauan ---------- */
  function rPantau() {
    var s = D.siswa, b = s.filter(function (x) { return x.status === 'belum'; }).length, k = s.filter(function (x) { return x.status === 'berlangsung'; }).length, d = s.filter(function (x) { return x.status === 'selesai'; }).length;
    var h = '<div class="cards"><div class="stat"><b>' + s.length + '</b><span>Peserta</span></div><div class="stat"><b>' + b + '</b><span>Belum mulai</span></div><div class="stat"><b>' + k + '</b><span>Sedang mengerjakan</span></div><div class="stat"><b>' + d + '</b><span>Sudah selesai</span></div></div>';
    h += '<div class="row"><select id="f-kelas">' + kelasOpt() + '</select><span class="small">Diperbarui otomatis tiap 20 detik di tab ini. Status ujian: <b>' + (D.pengaturan.status_ujian === 'buka' ? 'DIBUKA' : 'DITUTUP') + '</b></span></div>';
    h += '<div class="tw"><table class="t"><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Status</th><th class="n">Terisi</th><th class="n">Sisa waktu</th><th class="n">Keluar layar</th><th class="n">Nilai</th><th class="noprint"></th></tr>';
    s.filter(function (x) { return !filterKelas || x.kelas === filterKelas; }).forEach(function (x, i) {
      var tg = x.status === 'selesai' ? '<span class="tag ok">Selesai</span>' : x.status === 'berlangsung' ? '<span class="tag w">Mengerjakan</span>' : '<span class="tag">Belum</span>';
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td>' + tg + '</td><td class="n">' + (x.status === 'belum' ? '' : x.terisi + '/' + D.soal.length) + '</td><td class="n">' + (x.sisa_detik != null ? hms(x.sisa_detik) : '') + '</td><td class="n">' + (x.keluar ? '<span class="tag ' + (x.keluar >= 3 ? 'b' : 'w') + '">' + x.keluar + '×</span>' : '') + '</td><td class="n">' + (x.nilai != null ? '<b>' + num(x.nilai) + '</b>' : '') + '</td><td class="noprint">' + (x.status !== 'belum' ? '<button class="btn sm line" data-reset="' + x.nisn + '">Reset</button>' : '') + '</td></tr>';
    });
    $('#t-pantau').innerHTML = h + '</table></div><p class="small">Reset = hapus hasil dan izinkan siswa mengulang (mis. HP rusak sebelum terkirim, atau salah orang).</p>';
    $('#f-kelas').onchange = function () { filterKelas = this.value; rPantau(); };
    $$('[data-reset]', $('#t-pantau')).forEach(function (b) {
      b.onclick = function () {
        var s0 = D.siswa.filter(function (x) { return x.nisn === b.dataset.reset; })[0];
        if (!confirm('Reset ujian ' + s0.nama + '? Jawaban dan nilai siswa ini dihapus, dan ia dapat mengulang dari awal.')) return;
        api('guru_reset', { nisn: s0.nisn }).then(function (r) { if (!r.ok) throw new Error(r.error); return muat(); }).then(function () { toast('Direset: ' + s0.nama); }).catch(function (e) { toast(e.message); });
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
    h += '<div class="row"><select id="f-kelas">' + kelasOpt() + '</select><button class="btn sm" id="b-csv">Unduh CSV (Excel)</button><button class="btn sm sec" id="b-print">Cetak</button><button class="btn sm line" id="b-sheet">Perbarui sheet di Google Sheet</button></div>';
    var arr = rows.map(function (x) { var r = hm[x.nisn]; return { x: x, r: r, nilai: x.nilai == null ? -1 : x.nilai }; });
    arr.sort(function (a, b) { var k = urut.k; var va = k === 'nama' ? a.x.nama : k === 'kelas' ? a.x.kelas + a.x.nama : a.nilai, vb = k === 'nama' ? b.x.nama : k === 'kelas' ? b.x.kelas + b.x.nama : b.nilai; return (va > vb ? 1 : va < vb ? -1 : 0) * urut.d; });
    h += '<div class="tw"><table class="t"><tr><th>No</th><th class="s" data-s="nama">Nama</th><th class="s" data-s="kelas">Kelas</th><th>NISN</th><th class="s n" data-s="nilai">Nilai ▾</th><th class="n">Durasi</th><th class="n">Keluar</th><th>Kode</th><th>Ket.</th></tr>';
    arr.forEach(function (o, i) {
      var x = o.x, r = o.r, ket = x.nilai == null ? '<span class="tag">' + (x.status === 'berlangsung' ? 'Mengerjakan' : 'Belum') + '</span>' : (x.nilai >= kkm ? '<span class="tag ok">Tuntas</span>' : '<span class="tag b">Belum tuntas</span>') + (r && r.terlambat ? ' <span class="tag w">Terlambat</span>' : '');
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td>' + esc(x.nisn) + '</td><td class="n"><b>' + (x.nilai != null ? num(x.nilai) : '') + '</b></td><td class="n">' + (r ? num(r.durasi_menit) + ' mnt' : '') + '</td><td class="n">' + (r ? r.keluar : '') + '</td><td>' + (r ? esc(r.kode) : '') + '</td><td>' + ket + '</td></tr>';
    });
    $('#t-rekap').innerHTML = h + '</table></div>';
    $('#f-kelas').onchange = function () { filterKelas = this.value; rRekap(); };
    $$('th.s', $('#t-rekap')).forEach(function (th) { th.onclick = function () { urut = { k: th.dataset.s, d: urut.k === th.dataset.s ? -urut.d : (th.dataset.s === 'nilai' ? -1 : 1) }; rRekap(); }; });
    $('#b-print').onclick = function () { window.print(); };
    $('#b-csv').onclick = function () { unduhCSV(arr); };
    $('#b-sheet').onclick = function () { api('guru_tulis_sheet').then(function (r) { toast(r.ok ? 'Sheet "Rekap Nilai" & "Analisis Butir" diperbarui' : r.error); }).catch(function (e) { toast(e.message); }); };
  }
  function unduhCSV(arr) {
    var head = ['No', 'Nama', 'Kelas', 'NISN', 'Status', 'Nilai', 'Durasi_menit', 'Keluar_layar', 'Kode'].concat(D.soal.map(function (q) { return 'S' + q.no; }));
    var L = [head];
    arr.forEach(function (o, i) { var x = o.x, r = o.r; L.push([i + 1, x.nama, x.kelas, "'" + x.nisn, x.status, x.nilai == null ? '' : x.nilai, r ? r.durasi_menit : '', r ? r.keluar : '', r ? r.kode : ''].concat(D.soal.map(function (q) { return r ? (r.skor[q.no] != null ? r.skor[q.no] : 0) : ''; }))); });
    var csv = '﻿' + L.map(function (r) { return r.map(function (v) { v = String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var d = new Date(); a.download = 'rekap-nilai-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- analisis butir ---------- */
  function rAnalisis() {
    var A = D.analisis, kkm = D.pengaturan.kkm, h = '';
    if (!A.n) { $('#t-analisis').innerHTML = '<div class="msg info">Belum ada siswa yang menyelesaikan ujian. Analisis muncul setelah ada hasil masuk.</div>'; return; }
    h += '<div class="cards"><div class="stat"><b>' + A.n + '</b><span>Peserta dianalisis</span></div><div class="stat"><b>' + num(A.rata) + '</b><span>Rata-rata</span></div><div class="stat"><b>' + num(A.simpangan) + '</b><span>Simpangan baku</span></div><div class="stat"><b>' + A.tuntas + ' (' + Math.round(A.tuntas / A.n * 100) + '%)</b><span>Tuntas ≥ ' + kkm + '</span></div><div class="stat"><b>' + (A.alpha == null ? '-' : String(A.alpha).replace('.', ',')) + '</b><span>Reliabilitas (α)</span></div></div>';
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
    var buka = D.pengaturan.status_ujian === 'buka';
    var h = '<div class="stat" style="margin-bottom:12px"><b>' + (buka ? 'Ujian DIBUKA' : 'Ujian DITUTUP') + '</b><span>' + (buka ? 'Siswa dapat masuk dan memulai.' : 'Siswa baru tidak bisa mulai. Yang sedang mengerjakan tetap bisa melanjutkan.') + '</span><div style="height:10px"></div><button class="btn sm ' + (buka ? 'warn' : '') + '" id="a-toggle">' + (buka ? 'Tutup ujian' : 'Buka ujian') + '</button></div>';
    h += '<div class="stat" style="margin-bottom:12px"><b>Hitung ulang nilai</b><span>Pakai bila kunci jawaban di sheet "Soal" diperbaiki setelah ada siswa yang selesai. Nilai semua siswa dihitung ulang dari jawaban tersimpan.</span><div style="height:10px"></div><button class="btn sm sec" id="a-hitung">Hitung ulang semua nilai</button></div>';
    h += '<div class="stat"><b>Mengubah soal, siswa, durasi, PIN</b><span>Semua diatur di Google Sheet: sheet <b>Pengaturan</b>, <b>Siswa</b>, <b>Soal</b>. Gambar soal diunggah ke folder <code>gambar/</code> di GitHub. Lihat README.</span></div>';
    $('#t-atur').innerHTML = h;
    $('#a-toggle').onclick = function () { api('guru_status', { status: buka ? 'tutup' : 'buka' }).then(function (r) { if (!r.ok) throw new Error(r.error); return muat(); }).then(function () { toast('Status ujian diubah'); }).catch(function (e) { toast(e.message); }); };
    $('#a-hitung').onclick = function () { if (!confirm('Hitung ulang nilai semua siswa dengan kunci saat ini?')) return; api('guru_hitung_ulang').then(function (r) { if (!r.ok) throw new Error(r.error); return muat().then(function () { toast(r.jumlah + ' hasil dihitung ulang'); }); }).catch(function (e) { toast(e.message); }); };
  }

  /* ---------- awal ---------- */
  try { var p = sessionStorage.getItem('g_pin'); if (p) { PIN = p; muat().then(function () { gantiTab('pantau'); }).catch(function () { PIN = ''; }); } } catch (e) {}
  var prevMuat = muat; // setelah login pertama aktifkan auto-refresh
  $('#g-form').addEventListener('submit', function () { setTimeout(function () { if (D) gantiTab(tab); }, 1200); });
})();

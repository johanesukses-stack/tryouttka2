/* TRYOUT TKA MI HUSNAYAIN SLEMAN — aplikasi siswa */
(function () {
  'use strict';
  var C = window.UJIAN_CONFIG || {};
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- util ---------- */
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hms(sec) { var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function seeded(seed) { var h = 1779033703 ^ seed.length; for (var i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
  function show(id) { ['s-login', 's-pilih', 's-brief', 's-sudah', 's-done'].forEach(function (x) { $('#' + x).hidden = (x !== id); }); $('#exam').hidden = true; window.scrollTo(0, 0); }
  function toast(msg, ms) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, ms || 2600); }
  function waNomor(n) { n = String(n || '').replace(/\D/g, ''); return n.charAt(0) === '0' ? '62' + n.slice(1) : n; }

  function api(action, data, timeout) {
    if (!C.API_URL) return Promise.reject(new Error('Alamat server belum diatur (js/config.js).'));
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, timeout || 25000);
    var body = {}; for (var k in (data || {})) body[k] = data[k]; body.action = action;
    return fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, redirect: 'follow' })
      .then(function (r) { clearTimeout(tm); return r.json(); })
      .catch(function (e) { clearTimeout(tm); throw new Error('Tidak bisa terhubung ke server. Periksa sinyal/Wi-Fi lalu coba lagi.'); });
  }

  /* ---------- state ---------- */
  var S = { info: {}, pk: '', tiket: '', paketList: [], nisn: '', nama: '', kelas: '', token: '', soal: [], order: [], idx: 0, jawaban: {}, ragu: {}, keluar: 0, endAt: 0,
    dirty: false, aktif: false, batas: 3, wa: '', acak: true, submitting: false, hiddenAt: 0, warned: {}, fsPernah: false, sengaja: false };

  /* ---------- identitas ---------- */
  function applyInfo(i) {
    S.info = i || S.info;
    var j = S.info.judul || 'TRYOUT TKA MI HUSNAYAIN SLEMAN';
    document.title = j;
    $$('[data-judul]').forEach(function (e) { e.textContent = j; });
    var sub = [S.info.mapel, S.info.paket].filter(Boolean).join(' · ');
    $$('[data-sub]').forEach(function (e) { e.textContent = sub || 'Ujian online'; });
    var d = (S.info.durasi_menit || 90) + ' menit';
    $$('[data-durasi]').forEach(function (e) { e.textContent = d; });
    $$('[data-durasi-txt]').forEach(function (e) { e.textContent = d; });
  }

  function kunciLokal() { return 'ujian_jwb_' + S.nisn + '_' + S.pk; }

  function msg(el, text, kind) { el.hidden = !text; el.className = 'msg ' + (kind || 'err'); el.textContent = text || ''; }

  /* ---------- masuk ---------- */
  function initLogin() {
    show('s-login');
    $('#pw-t').onclick = function () { var p = $('#pw'); var h = p.type === 'password'; p.type = h ? 'text' : 'password'; this.textContent = h ? 'Sembunyi' : 'Lihat'; };
    $('#f-login').onsubmit = function (ev) {
      ev.preventDefault();
      var b = $('#b-login'), m = $('#m-login');
      var nisn = $('#nisn').value.replace(/\D/g, ''), pw = $('#pw').value.trim();
      if (nisn.length < 8) return msg(m, 'NISN harus 10 angka.');
      msg(m, '');
      b.disabled = true; b.innerHTML = '<span class="spin"></span> Memeriksa…';
      api('login', { nisn: nisn, password: pw, perangkat: navigator.userAgent }).then(function (r) {
        b.disabled = false; b.textContent = 'Masuk';
        if (!r.ok) return msg(m, r.error || 'Gagal masuk.');
        S.nisn = r.nisn; S.nama = r.nama; S.kelas = r.kelas; S.tiket = r.tiket; S.paketList = r.paket || []; S.token = '';
        applyInfo({ judul: r.judul });
        $('#pw').value = '';
        var jln = S.paketList.filter(function (p) { return p.state === 'berlangsung'; });
        if (S.paketList.length === 1 && S.paketList[0].state !== 'terjadwal') return pilihPaket(S.paketList[0]);
        if (jln.length === 1) return pilihPaket(jln[0]);
        tampilPilih();
      }).catch(function (e) { b.disabled = false; b.textContent = 'Masuk'; msg(m, e.message); });
    };
    // lanjutkan otomatis bila halaman terhenti saat ujian (muat ulang / HP restart)
    var sesi = store('ujian_sesi');
    if (sesi && sesi.nisn) $('#nisn').value = sesi.nisn;
  }

  /* ---------- pilih paket ---------- */
  function labelState(p) { return p.state === 'berlangsung' ? 'Sedang berjalan · lanjutkan' : p.state === 'selesai' ? 'Sudah dikerjakan' : p.state === 'terjadwal' ? 'Dibuka ' + (p.buka || 'nanti') : 'Belum dikerjakan'; }

  function tampilPilih() {
    $('#pl-nama').textContent = S.nama; $('#pl-kelas').textContent = 'Kelas ' + S.kelas + ' · NISN ' + S.nisn;
    var box = $('#pl-list'); box.innerHTML = '';
    S.paketList.forEach(function (p) {
      var b = document.createElement('button'); b.className = 'opt'; b.disabled = p.state === 'terjadwal';
      b.innerHTML = '<span class="m">' + esc((p.mapel || p.pk).slice(0, 3).toUpperCase()) + '</span><span class="tx"><b>' + esc(p.nama) + '</b><br><span style="color:var(--muted);font-size:13px">' + esc(p.mapel) + ' · ' + p.durasi_menit + ' menit · ' + esc(labelState(p)) + '</span></span>';
      b.onclick = function () { pilihPaket(p); };
      box.appendChild(b);
    });
    msg($('#m-pilih'), '');
    $('#b-pl-batal').onclick = function () { S.token = ''; S.tiket = ''; show('s-login'); };
    show('s-pilih');
  }

  function pilihPaket(p) {
    S.pk = p.pk;
    applyInfo({ judul: S.info.judul, mapel: p.mapel, paket: p.nama, durasi_menit: p.durasi_menit });
    if (p.state === 'selesai') return tampilSudah(p.selesai);
    var m = $('#s-pilih').hidden ? $('#m-login') : $('#m-pilih');
    api('masuk', { nisn: S.nisn, tiket: S.tiket, pk: p.pk, perangkat: navigator.userAgent }).then(function (r) {
      if (!r.ok) { if (r.ulang) { S.tiket = ''; show('s-login'); m = $('#m-login'); } return msg(m, r.error || 'Gagal masuk.'); }
      S.token = r.token || '';
      applyInfo({ judul: r.judul, mapel: r.mapel, paket: r.paket, durasi_menit: r.durasi_menit });
      if (r.state === 'selesai') return tampilSudah(r.selesai);
      initBrief(r);
    }).catch(function (e) { msg(m, e.message); });
  }

  function tampilSudah(waktu) {
    $('#sd-nama').textContent = S.nama; $('#sd-kelas').textContent = 'Kelas ' + S.kelas;
    $('#sd-info').textContent = [S.info.mapel, S.info.paket].filter(Boolean).join(' · ') + (waktu ? ' — dikumpulkan pada ' + waktu + '.' : '.');
    show('s-sudah');
  }

  function initBrief(r) {
    $('#br-nama').textContent = S.nama; $('#br-kelas').textContent = 'Kelas ' + S.kelas + ' · NISN ' + S.nisn;
    var res = $('#br-resume');
    if (r.state === 'berlangsung') {
      res.hidden = false; res.textContent = 'Ujianmu sedang berjalan. Sisa waktu sekitar ' + hms(r.sisa_detik || 0) + '. Ketuk Lanjutkan untuk kembali mengerjakan.';
      $('#b-mulai').textContent = 'Lanjutkan Ujian';
    } else { res.hidden = true; $('#b-mulai').textContent = 'Mulai Ujian'; }
    msg($('#m-brief'), '');
    $('#b-batal').onclick = function () { S.token = ''; if (S.paketList.length > 1) tampilPilih(); else { S.tiket = ''; show('s-login'); } };
    $('#b-mulai').onclick = function () { mulai(); };
    show('s-brief');
  }

  /* ---------- mulai ---------- */
  function mintaFullscreen() {
    var el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen;
    if (f) { try { var p = f.call(el); if (p && p.catch) p.catch(function () {}); S.fsPernah = true; } catch (e) {} }
  }
  function adaFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function dukungFullscreen() { var el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen); }

  function mulai() {
    var b = $('#b-mulai'), m = $('#m-brief');
    b.disabled = true; var lbl = b.textContent; b.innerHTML = '<span class="spin"></span> Menyiapkan soal…';
    mintaFullscreen();
    api('mulai', { nisn: S.nisn, token: S.token, pk: S.pk }, 40000).then(function (r) {
      b.disabled = false; b.textContent = lbl;
      if (!r.ok) {
        if (adaFullscreen()) try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
        if (r.selesai) return tampilSudah('');
        return msg(m, r.error || 'Gagal memulai.');
      }
      S.soal = r.soal; S.batas = r.batas_keluar || 3; S.wa = r.wa_guru || ''; S.acak = !!r.acak;
      S.endAt = Date.now() + r.sisa_detik * 1000;
      var lokal = store(kunciLokal()) || {};
      S.jawaban = {}; S.ragu = lokal.ragu || {};
      // gabungkan: server dan cadangan HP (ambil yang lebih lengkap)
      var srv = r.jawaban || {}, lk = lokal.jawaban || {};
      S.soal.forEach(function (q) { var a = srv[q.no] != null && srv[q.no] !== '' ? srv[q.no] : lk[q.no]; if (a != null && a !== '') S.jawaban[q.no] = a; });
      S.keluar = Math.max(r.keluar || 0, lokal.keluar || 0);
      S.order = S.soal.map(function (_, i) { return i; });
      if (S.acak) { var rnd = seeded(S.nisn + ':' + S.pk), a = S.order; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } }
      S.idx = Math.min(lokal.idx || 0, S.soal.length - 1);
      store('ujian_sesi', { nisn: S.nisn });
      mulaiUjian();
      prapemuat();
    }).catch(function (e) { b.disabled = false; b.textContent = lbl; msg(m, e.message); });
  }

  function prapemuat() {
    var urls = []; S.soal.forEach(function (q) { (q.gambar || '').split(';').forEach(function (g) { g = g.trim(); if (g) urls.push(C.GAMBAR_DIR + g); }); });
    var i = 0; (function next() { if (i >= urls.length) return; var im = new Image(); im.onload = im.onerror = next; im.src = urls[i++]; })();
  }

  /* ---------- tampilan ujian ---------- */
  var timerId = 0, saveId = 0, wakeLock = null;

  function mulaiUjian() {
    S.aktif = true; S.submitting = false; S.warned = {}; S.sengaja = false; S.hiddenAt = 0;
    $$('main').forEach(function (m) { m.hidden = true; });
    $('#exam').hidden = false;
    history.pushState({ ujian: 1 }, '');
    $('#x-prev').onclick = function () { pindah(-1); };
    $('#x-next').onclick = function () { if (S.idx >= S.soal.length - 1) panelDaftar(); else pindah(1); };
    $('#x-ragu').onclick = function () { var no = nomorSekarang(); if (S.ragu[no]) delete S.ragu[no]; else S.ragu[no] = 1; cadangkan(); S.dirty = true; renderBar(); };
    $('#x-list').onclick = panelDaftar;
    $('#x-help').onclick = panelBantuan;
    renderSoal(); tick();
    clearInterval(timerId); timerId = setInterval(tick, 500);
    clearInterval(saveId); saveId = setInterval(function () { if (S.dirty) simpan(); }, (C.SIMPAN_TIAP_DETIK || 20) * 1000);
    mintaWake(); cekFs();
  }

  function mintaWake() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () {}); } catch (e) {} }
  function nomorSekarang() { return S.soal[S.order[S.idx]].no; }
  function soalSekarang() { return S.soal[S.order[S.idx]]; }

  function status(q) {
    var v = S.jawaban[q.no];
    if (v == null || v === '') return 'none';
    if (q.tipe === 'bs') { var p = String(v).split('-'); var n = 0; for (var i = 0; i < q.opsi.length; i++) if (p[i] === 'B' || p[i] === 'S') n++; return n === 0 ? 'none' : (n === q.opsi.length ? 'done' : 'part'); }
    return 'done';
  }
  function hitung() { var d = 0, p = 0, r = 0; S.soal.forEach(function (q) { var s = status(q); if (s === 'done') d++; else if (s === 'part') p++; if (S.ragu[q.no]) r++; }); return { done: d, part: p, ragu: r, none: S.soal.length - d - p }; }

  function renderBar() {
    var n = S.soal.length, c = hitung();
    $('#x-no').textContent = 'Soal ' + (S.idx + 1) + '/' + n;
    $('#x-prog').style.width = ((c.done + c.part * 0.5) / n * 100) + '%';
    $('#x-count').textContent = c.done + ' dari ' + n + ' terjawab';
    $('#x-prev').disabled = S.idx === 0;
    $('#x-next').textContent = S.idx >= n - 1 ? 'Daftar ▶' : 'Lanjut ▶';
    var rg = $('#x-ragu'), on = !!S.ragu[nomorSekarang()];
    rg.classList.toggle('on', on); rg.textContent = on ? '✓ Ragu-ragu' : 'Ragu-ragu';
  }

  function renderSoal() {
    var q = soalSekarang(), main = $('#x-main'), html = '';
    var tipeTxt = q.tipe === 'pg' ? 'Pilih satu jawaban' : q.tipe === 'pgk' ? 'Pilih semua yang benar' : 'Tentukan Benar atau Salah';
    html += '<article class="qcard"><div class="qhead"><span class="qno">Soal ' + (S.idx + 1) + '</span><span class="badge' + (q.tipe === 'pgk' ? ' k' : '') + '">' + tipeTxt + '</span></div>';
    var gs = (q.gambar || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean);
    html += '<p class="qtext">' + fmt(q.soal) + '</p>';
    if (gs.length) {
      html += '<div class="qimgs">' + gs.map(function (g) { return '<img data-g="' + esc(g) + '" src="' + C.GAMBAR_DIR + esc(g) + '" alt="Gambar soal ' + (S.idx + 1) + '">'; }).join('') + '</div><p class="zoomhint">Ketuk gambar untuk memperbesar.</p>';
    }
    var v = S.jawaban[q.no] || '';
    if (q.tipe === 'pg') {
      html += q.opsi.map(function (o, i) { var L = 'ABCDE'.charAt(i); return '<button class="opt' + (v === L ? ' on' : '') + '" data-v="' + L + '"><span class="m">' + L + '</span><span class="tx">' + fmt(o) + '</span></button>'; }).join('');
    } else if (q.tipe === 'pgk') {
      var sel = v ? v.split(',') : [];
      html += q.opsi.map(function (o, i) { var k = String(i + 1); return '<button class="opt sq' + (sel.indexOf(k) >= 0 ? ' on' : '') + '" data-v="' + k + '"><span class="m">' + (sel.indexOf(k) >= 0 ? '✓' : k) + '</span><span class="tx">' + fmt(o) + '</span></button>'; }).join('');
    } else {
      var parts = v ? v.split('-') : [];
      html += q.opsi.map(function (o, i) {
        var a = parts[i];
        return '<div class="bsrow"><p>' + (i + 1) + '. ' + fmt(o) + '</p><div class="tg" data-i="' + i + '"><button class="b' + (a === 'B' ? ' on' : '') + '" data-v="B">Benar</button><button class="s' + (a === 'S' ? ' on' : '') + '" data-v="S">Salah</button></div></div>';
      }).join('');
    }
    html += '</article>';
    main.innerHTML = html; main.scrollTop = 0;
    $$('.qimgs img', main).forEach(function (im) {
      im.onclick = function () { zoom(im.src); };
      im.onerror = function () { var g = im.dataset.g; var b = document.createElement('button'); b.className = 'btn sec'; b.textContent = 'Gambar gagal dimuat. Ketuk untuk memuat ulang.'; b.onclick = function () { im.src = C.GAMBAR_DIR + g + '?r=' + Date.now(); b.replaceWith(im); }; im.replaceWith(b); };
    });
    $$('.opt', main).forEach(function (b) { b.onclick = function () { jawab(q, b.dataset.v); }; });
    $$('.tg button', main).forEach(function (b) { b.onclick = function () { jawabBS(q, +b.parentNode.dataset.i, b.dataset.v); }; });
    renderBar();
  }

  function setJawab(q, val) {
    if (val === '' || val == null) delete S.jawaban[q.no]; else S.jawaban[q.no] = val;
    S.dirty = true; cadangkan(); setSave('p');
  }
  function jawab(q, v) {
    if (q.tipe === 'pg') setJawab(q, S.jawaban[q.no] === v ? '' : v);
    else { var sel = S.jawaban[q.no] ? S.jawaban[q.no].split(',') : []; var i = sel.indexOf(v); if (i >= 0) sel.splice(i, 1); else sel.push(v); sel.sort(function (a, b) { return a - b; }); setJawab(q, sel.join(',')); }
    var y = $('#x-main').scrollTop; renderSoal(); $('#x-main').scrollTop = y;
  }
  function jawabBS(q, i, v) {
    var p = (S.jawaban[q.no] || '').split('-'); while (p.length < q.opsi.length) p.push('_');
    p = p.map(function (x) { return x === 'B' || x === 'S' ? x : '_'; });
    p[i] = p[i] === v ? '_' : v;
    setJawab(q, p.every(function (x) { return x === '_'; }) ? '' : p.join('-'));
    var y = $('#x-main').scrollTop; renderSoal(); $('#x-main').scrollTop = y;
  }
  function pindah(d) { var n = S.idx + d; if (n < 0 || n >= S.soal.length) return; S.idx = n; cadangkan(); renderSoal(); }

  /* ---------- simpan ---------- */
  function cadangkan() { store(kunciLokal(), { jawaban: S.jawaban, ragu: S.ragu, keluar: S.keluar, idx: S.idx }); }
  function setSave(k) {
    var d = $('#x-dot'), t = $('#x-save'); if (!d) return;
    d.className = 'dot' + (k === 'p' ? ' p' : k === 'x' ? ' x' : '');
    t.textContent = k === 'p' ? 'Menyimpan…' : k === 'x' ? 'Offline — aman di HP' : 'Tersimpan';
  }
  function simpan() {
    if (!S.aktif || S.submitting) return Promise.resolve();
    S.dirty = false; setSave('p');
    return api('simpan', { nisn: S.nisn, token: S.token, pk: S.pk, jawaban: S.jawaban, keluar: S.keluar }, 20000).then(function (r) {
      if (r.sesiLain) return kunciSesi(r.error);
      if (r.selesai) { S.aktif = false; return location.reload(); }
      if (!r.ok) { S.dirty = true; return setSave('x'); }
      if (typeof r.sisa_detik === 'number') { var e = Date.now() + r.sisa_detik * 1000; if (Math.abs(e - S.endAt) > 3000) S.endAt = e; }
      setSave('ok');
    }).catch(function () { S.dirty = true; setSave('x'); });
  }

  /* ---------- timer ---------- */
  function tick() {
    if (!S.aktif) return;
    var sisa = Math.max(0, Math.ceil((S.endAt - Date.now()) / 1000)), t = $('#x-timer');
    t.textContent = hms(sisa);
    t.className = 'timer' + (sisa <= 120 ? ' crit' : sisa <= 600 ? ' low' : '');
    [[600, '10 menit lagi'], [300, '5 menit lagi'], [60, '1 menit lagi']].forEach(function (w) { if (sisa <= w[0] && sisa > w[0] - 3 && !S.warned[w[0]]) { S.warned[w[0]] = 1; toast('⏰ Sisa waktu ' + w[1], 4000); } });
    if (sisa <= 0 && !S.submitting) { kumpulkan(true); }
  }

  /* ---------- panel ---------- */
  function layer(html, opts) {
    var L = $('#layer'); L.innerHTML = '<div class="ov' + (opts && opts.center ? ' c' : '') + '"><div class="pn">' + html + '</div></div>';
    var ov = L.firstChild; if (!(opts && opts.sticky)) ov.addEventListener('click', function (e) { if (e.target === ov) tutupLayer(); });
    return L;
  }
  function tutupLayer() { $('#layer').innerHTML = ''; }

  function panelDaftar() {
    var c = hitung(), cur = S.idx;
    var g = S.order.map(function (qi, pos) { var q = S.soal[qi], s = status(q); return '<button data-p="' + pos + '" class="' + (S.ragu[q.no] ? 'r' : s === 'done' ? 'a' : s === 'part' ? 'p' : '') + (pos === cur ? ' cur' : '') + '">' + (pos + 1) + '</button>'; }).join('');
    var L = layer('<h3>Daftar Soal</h3><div class="legend"><span class="a"><i></i>Terjawab</span><span class="p"><i></i>Sebagian</span><span class="r"><i></i>Ragu-ragu</span><span><i></i>Belum</span></div><div class="grid">' + g + '</div>' +
      '<p class="sub" style="margin:0 0 12px;color:var(--muted);font-size:14px">Terjawab ' + c.done + ' · Sebagian ' + c.part + ' · Ragu-ragu ' + c.ragu + ' · Belum ' + c.none + '</p>' +
      '<button class="btn" id="p-kumpul">Kumpulkan Jawaban</button><div style="height:8px"></div><button class="btn line" id="p-tutup">Kembali ke soal</button>');
    $$('.grid button', L).forEach(function (b) { b.onclick = function () { S.idx = +b.dataset.p; tutupLayer(); renderSoal(); }; });
    $('#p-tutup').onclick = tutupLayer;
    $('#p-kumpul').onclick = konfirmasiKumpul;
  }

  function konfirmasiKumpul() {
    var c = hitung(), adaMasalah = c.none + c.part + c.ragu > 0;
    var info = adaMasalah ? '<div class="msg" style="background:var(--warn-l);color:var(--warn)">' + (c.none ? c.none + ' soal belum dijawab. ' : '') + (c.part ? c.part + ' soal baru terjawab sebagian. ' : '') + (c.ragu ? c.ragu + ' soal masih ragu-ragu.' : '') + '</div>' : '<div class="msg ok">Semua soal sudah terjawab.</div>';
    layer('<h3>Kumpulkan jawaban?</h3>' + info + '<p style="font-size:14.5px;color:var(--muted)">Setelah dikumpulkan, jawaban <b>tidak bisa diubah</b> dan ujian tidak bisa diulang.</p><button class="btn" id="p-ya">Ya, kumpulkan</button><div style="height:8px"></div><button class="btn line" id="p-no">Periksa lagi</button>', { center: true });
    $('#p-no').onclick = tutupLayer;
    $('#p-ya').onclick = function () { kumpulkan(false); };
  }

  function panelBantuan() {
    var fs = dukungFullscreen();
    var L = layer('<h3>Petunjuk & cara keluar</h3>' +
      '<div class="box"><h3>Cara menjawab</h3><ul><li><b>Pilih satu:</b> ketuk satu jawaban. Ketuk lagi untuk membatalkan.</li><li><b>Centang:</b> ketuk semua pernyataan yang benar.</li><li><b>Benar/Salah:</b> pilih Benar atau Salah di setiap pernyataan.</li><li><b>Ragu-ragu:</b> tandai soal agar mudah dicari di Daftar.</li></ul></div><div style="height:10px"></div>' +
      '<div class="box"><h3>Cara keluar dari tampilan ujian</h3><ul>' +
      '<li><b>Sudah selesai:</b> ketuk <b>Daftar → Kumpulkan Jawaban</b>. Setelah terkirim, kamu bebas keluar.</li>' +
      '<li><b>Perlu keluar sebentar</b> (HP bermasalah, urusan mendadak): ketuk <b>Keluar sementara</b> di bawah, atau tombol Home. Jawaban tersimpan, tetapi <b>waktu tetap berjalan</b> dan keluarmu dicatat guru. Untuk kembali, masuk lagi dengan NISN dan password.</li>' +
      (fs ? '<li><b>Layar penuh:</b> usap dari tepi atas layar, atau ketuk <b>Matikan layar penuh</b> di bawah.</li>' : '') +
      '<li>Tombol <b>kembali</b> pada HP dimatikan agar tidak keluar tak sengaja.</li></ul></div>' +
      '<div class="msg info" style="margin-top:10px">Keluar layar ujian: <b>' + S.keluar + ' kali</b> (dilihat guru).</div><div style="height:12px"></div>' +
      (fs && adaFullscreen() ? '<button class="btn sec" id="p-fs">Matikan layar penuh</button><div style="height:8px"></div>' : '') +
      '<button class="btn warn" id="p-keluar">Keluar sementara</button><div style="height:8px"></div><button class="btn line" id="p-tutup">Kembali ke soal</button>');
    $('#p-tutup').onclick = tutupLayer;
    var fb = $('#p-fs'); if (fb) fb.onclick = function () { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} tutupLayer(); };
    $('#p-keluar').onclick = function () {
      S.sengaja = true; S.keluar++; cadangkan();
      var b = $('#p-keluar'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Menyimpan…';
      simpan().then(function () { berhentiUjian(); tutupLayer(); S.token = ''; show('s-login'); toast('Kamu keluar sementara. Waktu tetap berjalan — masuk lagi untuk melanjutkan.', 6000); });
    };
  }

  function zoom(src) {
    var z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = '<button class="x">Tutup ✕</button><img alt="Gambar diperbesar" src="' + src + '">';
    document.body.appendChild(z); $('.x', z).onclick = function () { z.remove(); };
  }

  /* ---------- pengamanan ringan (mirip CBT, tidak ketat) ---------- */
  function cekFs() {
    var b = $('#x-fs'); if (!b) return;
    if (S.aktif && dukungFullscreen() && !adaFullscreen()) { b.innerHTML = '<button class="fsb" id="b-fs">Layar penuh</button>'; $('#b-fs').onclick = function () { mintaFullscreen(); }; }
    else b.innerHTML = '';
  }
  document.addEventListener('fullscreenchange', cekFs);
  document.addEventListener('webkitfullscreenchange', cekFs);

  function layarKunci(n) {
    if ($('.lock')) return;
    var keras = n >= S.batas;
    var d = document.createElement('div'); d.className = 'lock';
    d.innerHTML = '<h2>⚠ Kamu keluar dari layar ujian</h2><p>Ini sudah <b>' + n + ' kali</b>. ' + (keras ? 'Guru akan melihat catatan ini. Tetaplah di layar ujian sampai selesai.' : 'Jangan membuka aplikasi atau tab lain. Kejadian ini dicatat.') + '</p><p>Waktu ujian tetap berjalan.</p><button class="btn">Kembali ke ujian</button>';
    document.body.appendChild(d);
    $('.btn', d).onclick = function () { d.remove(); if (dukungFullscreen() && !adaFullscreen()) mintaFullscreen(); mintaWake(); };
  }
  function kunciSesi(pesan) {
    berhentiUjian();
    var d = document.createElement('div'); d.className = 'lock';
    d.innerHTML = '<h2>Sesi berhenti</h2><p>' + esc(pesan || 'Sesi ini dipakai di perangkat lain.') + '</p><button class="btn">Ke halaman masuk</button>';
    document.body.appendChild(d); $('.btn', d).onclick = function () { location.reload(); };
  }

  document.addEventListener('visibilitychange', function () {
    if (!S.aktif || S.submitting) return;
    if (document.hidden) { S.hiddenAt = Date.now(); if (S.dirty) simpan(); }
    else if (S.hiddenAt && !S.sengaja) {
      var lama = Date.now() - S.hiddenAt; S.hiddenAt = 0;
      if (lama > 1200) { S.keluar++; S.dirty = true; cadangkan(); layarKunci(S.keluar); simpan(); }
      mintaWake(); tick();
    }
  });
  window.addEventListener('popstate', function () { if (S.aktif) { history.pushState({ ujian: 1 }, ''); toast('Tombol kembali dimatikan. Ketuk ❓ untuk cara keluar.', 3200); } });
  window.addEventListener('beforeunload', function (e) { if (S.aktif && !S.submitting) { e.preventDefault(); e.returnValue = ''; } });
  ['contextmenu', 'copy', 'cut', 'selectstart', 'dragstart'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (S.aktif) e.preventDefault(); }); });
  document.addEventListener('keydown', function (e) { if (S.aktif && (e.ctrlKey || e.metaKey) && 'cpsuaxp'.indexOf(e.key.toLowerCase()) >= 0) e.preventDefault(); });

  function berhentiUjian() {
    S.aktif = false; clearInterval(timerId); clearInterval(saveId);
    try { if (wakeLock) wakeLock.release(); } catch (e) {}
    try { if (adaFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
    $('#exam').hidden = true; $$('main').forEach(function (m) { m.hidden = true; });
  }

  /* ---------- kumpulkan ---------- */
  function ringkasWA() { return S.soal.map(function (q) { return q.no + ':' + (S.jawaban[q.no] || '-'); }).join('; '); }

  function kumpulkan(otomatis) {
    if (S.submitting) return; S.submitting = true;
    layer('<div class="center"><h3>' + (otomatis ? 'Waktu habis' : 'Mengirim jawaban') + '</h3><p class="sub" style="color:var(--muted)">Mohon tunggu, jangan tutup halaman ini…</p><div class="spin" style="margin:6px auto;border-color:var(--line);border-top-color:var(--brand)"></div></div>', { center: true, sticky: true });
    kirimCoba(0);
  }
  function kirimCoba(n) {
    api('kirim', { nisn: S.nisn, token: S.token, pk: S.pk, jawaban: S.jawaban, keluar: S.keluar }, 30000).then(function (r) {
      if (r.ok) return selesai(r);
      if (r.sesiLain) { tutupLayer(); return kunciSesi(r.error); }
      gagalKirim(r.error || 'Server menolak pengiriman.');
    }).catch(function (e) { if (n < 2) setTimeout(function () { kirimCoba(n + 1); }, 2500 * (n + 1)); else gagalKirim(e.message); });
  }
  function gagalKirim(err) {
    var wa = S.wa ? 'https://wa.me/' + waNomor(S.wa) + '?text=' + encodeURIComponent('Jawaban ' + S.nama + ' (' + S.kelas + ', NISN ' + S.nisn + '): ' + ringkasWA()) : '';
    layer('<h3>Jawaban belum terkirim</h3><div class="msg err">' + esc(err) + '</div><p style="font-size:14.5px;color:var(--muted)">Jawabanmu aman tersimpan di HP ini. Pastikan sinyal baik lalu ketuk <b>Coba kirim lagi</b>. Jangan tutup halaman.</p><button class="btn" id="p-ulang">Coba kirim lagi</button>' + (wa ? '<div style="height:8px"></div><a class="btn sec" target="_blank" rel="noopener" href="' + wa + '">Kirim jawaban lewat WhatsApp guru</a>' : ''), { center: true, sticky: true });
    $('#p-ulang').onclick = function () { layer('<div class="center"><p>Mengirim…</p></div>', { center: true, sticky: true }); kirimCoba(0); };
  }

  function selesai(r) {
    tutupLayer(); berhentiUjian();
    store(kunciLokal(), null); store('ujian_sesi', null);
    S.token = '';
    $('#dn-nama').textContent = r.nama; $('#dn-kelas').textContent = 'Kelas ' + r.kelas;
    var nb = $('#dn-nilai-box');
    if (typeof r.nilai === 'number') { nb.hidden = false; $('#dn-nilai').textContent = (Math.round(r.nilai * 10) / 10).toString().replace('.', ','); } else nb.hidden = true;
    var kv = [['Soal dijawab', r.dijawab + ' dari ' + S.soal.length]];
    if (r.durasi_menit) kv.push(['Waktu', Math.round(r.durasi_menit) + ' menit']);
    kv.push(['Dikirim', r.waktu || '-'], ['Kode bukti', r.kode]);
    $('#dn-kv').innerHTML = kv.map(function (x) { return '<b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span>'; }).join('');
    var a = $('#dn-wa');
    if (r.wa_guru) {
      var t = 'Assalamualaikum, saya ' + r.nama + ' (kelas ' + r.kelas + ') sudah menyelesaikan ' + (r.judul || 'ujian') + (r.paket ? ' – ' + r.paket : (r.mapel ? ' ' + r.mapel : '')) + '.' + (typeof r.nilai === 'number' ? ' Nilai: ' + r.nilai + '.' : '') + ' Kode bukti: ' + r.kode + '.';
      a.href = 'https://wa.me/' + waNomor(r.wa_guru) + '?text=' + encodeURIComponent(t); a.hidden = false;
    } else a.hidden = true;
    $('#b-dn').onclick = function () { location.reload(); };
    show('s-done');
  }

  /* ---------- awal ---------- */
  $('#b-sd').onclick = function () { if (S.paketList.length > 1 && S.tiket) { S.paketList.forEach(function (p) { if (p.pk === S.pk && p.state !== 'selesai') p.state = 'selesai'; }); tampilPilih(); } else { show('s-login'); } };
  initLogin();
  function infoAwal(i) {
    var d = i.paket || [], sub, dur = 90;
    if (d.length === 1) { sub = [d[0].mapel, d[0].nama].filter(Boolean).join(' · '); dur = d[0].durasi_menit; }
    else if (d.length > 1) sub = d.length + ' ujian dibuka: ' + d.map(function (p) { return p.mapel || p.pk; }).join(', ');
    else sub = 'Ujian online';
    applyInfo({ judul: i.judul, mapel: '', paket: '', durasi_menit: dur });
    $$('[data-sub]').forEach(function (e) { e.textContent = sub; });
    if (!d.length) msg($('#m-login'), 'Belum ada ujian yang dibuka. Hubungi guru.', 'info');
    else if (d.every(function (p) { return p.keadaan === 'terjadwal'; })) msg($('#m-login'), 'Ujian belum dimulai sesuai jadwal.', 'info');
  }
  api('info', {}, 15000).then(function (i) { if (i.ok) infoAwal(i); else applyInfo({}); })
    .catch(function (e) { applyInfo({}); msg($('#m-login'), e.message, 'err'); });
})();


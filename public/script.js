/*
  Анимация точек «от хаоса к системе» + схема fig. 1 на первом экране.

  Сценарий по разделам (привязан к id секций, а не к проценту прокрутки):
    0 первый экран      -> хаос (бледный фон, точки проявляются при загрузке)
    1 #situations       -> четыре линии
    2 #how              -> четыре кучки (будущие лепестки)
    3 #formats          -> один круг
    4 #about            -> два круга, по ходу раздела расходятся в четыре сближающихся круга
    5 #contact          -> четыре лепестка с общим ядром (финал, проявляются контуры кругов)

  49 точек: 4 лепестка x 11 точек (у каждого свой оттенок синего), 4 оранжевых акцента, 1 оранжевое ядро.
  Точки лежат ПОД контентом (z-index 1, контент .lay z-index 2), поэтому видны только на светлом фоне.
*/
(function () {
  'use strict';

  var C = { ink: '#1B2036', indigo: '#49516D', orange: '#FD652D', cloud: '#F0EEE9' };
  var PETAL_COLORS = ['#1B2036', '#49516D', '#6A7396', '#8A92B0'];
  var N = 49;
  var SECTION_IDS = ['situations', 'how', 'formats', 'about', 'contact'];
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function rng(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  function ss(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function grp(i) { return i < 44 ? Math.floor(i / 11) : i < 48 ? i - 44 : -1; }
  function role(i) { return i < 44 ? 'dot' : i < 48 ? 'accent' : 'core'; }

  // Четыре пересекающихся круга вокруг центра (px, py): радиус pr, смещение центров pd
  function petalLayout(px, py, pr, pd, rot, per) {
    per = per || 11;
    var out = [], cs = [];
    for (var g = 0; g < 4; g++) {
      var a = -Math.PI / 2 + g * Math.PI / 2 + rot;
      cs.push({ x: px + Math.cos(a) * pd, y: py + Math.sin(a) * pd });
    }
    for (g = 0; g < 4; g++) {
      for (var k = 0; k < per; k++) {
        var b = (k / per) * Math.PI * 2 + g * 0.3;
        out.push({ x: cs[g].x + Math.cos(b) * pr, y: cs[g].y + Math.sin(b) * pr });
      }
    }
    for (g = 0; g < 4; g++) out.push({ x: px + (cs[g].x - px) * 2.15, y: py + (cs[g].y - py) * 2.15 });
    out.push({ x: px, y: py });
    return { pts: out, centers: cs };
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ---------- fig. 1: хаос слева, лепестки справа (статично) ---------- */
  function drawFigure() {
    var chaos = document.getElementById('fig-chaos');
    var petal = document.getElementById('fig-petal');
    if (!chaos || !petal) return;
    var figPc = ['#F0EEE9', '#D6D9E6', '#BCC2D8', '#A9B0CA'];
    var FP = 18;
    var fig = petalLayout(150, 150, 66, 45, 0, FP);
    fig.centers.forEach(function (c, g) {
      petal.appendChild(svgEl('circle', { cx: c.x, cy: c.y, r: 66, fill: 'none', stroke: figPc[g], 'stroke-width': 1.2, 'stroke-opacity': 0.55 }));
    });
    var fr = rng(3);
    fig.pts.forEach(function (pt, i) {
      var isDot = i < 4 * FP, isAcc = !isDot && i < 4 * FP + 4;
      var r = isDot ? 2.6 : isAcc ? 5 : 9;
      var c = isDot ? figPc[Math.floor(i / FP)] : C.orange;
      petal.appendChild(svgEl('circle', { cx: pt.x, cy: pt.y, r: r, fill: c }));
      // те же точки, просто рассыпанные: «до» той же системы
      chaos.appendChild(svgEl('circle', { cx: Math.round(18 + fr() * 264), cy: Math.round(18 + fr() * 264), r: r, fill: c }));
    });
  }

  /* ---------- бегущие точки ---------- */
  var layer, net, dotEls = [], ringEls = [];
  var st = { y: 0, max: 1, vh: 800, vw: 1440, stops: [0, 0.17, 0.36, 0.55, 0.74, 0.93], ready: false };
  var raf = null;

  function setupDots() {
    layer = document.querySelector('.dot-layer');
    if (!layer) return false;
    net = layer.querySelector('.net');
    for (var g = 0; g < 4; g++) {
      // центр задаём через transform, а не cx/cy: так круги едут с тем же переходом, что и точки, и не отрываются от них
      var ring = svgEl('circle', { cx: 0, cy: 0, fill: 'none', stroke: PETAL_COLORS[g], 'stroke-width': 1.4, 'stroke-opacity': 0 });
      net.appendChild(ring);
      ringEls.push(ring);
    }
    for (var i = 0; i < N; i++) {
      var s = document.createElement('span');
      s.className = 'dot';
      layer.appendChild(s);
      dotEls.push(s);
    }
    return true;
  }

  function measure() {
    var de = document.documentElement;
    var vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
    st.y = window.scrollY || 0;
    // На телефоне Safari прячет и показывает панель с адресом, высота экрана скачет.
    // Для раскладки точек держим высоту постоянной, пока не поменялась ширина, иначе узор дрожит
    if (vw < 960 && vw === st.vw && st.vh) vh = st.vh;
    st.vw = vw;
    st.vh = vh;
    st.max = Math.max(1, de.scrollHeight - (window.innerHeight || vh));
    var stops = [0], tops = [];
    for (var i = 0; i < SECTION_IDS.length; i++) {
      var el = document.getElementById(SECTION_IDS[i]);
      if (!el) return;
      var top = el.getBoundingClientRect().top + st.y;
      tops.push(top);
      var prev = stops[stops.length - 1];
      stops.push(Math.min(1, Math.max(prev + 0.01, (top - st.vh * 0.35) / st.max)));
    }
    st.stops = stops;
    st.tops = tops;
    // Центр места под символ (#symbol-slot) в координатах страницы
    var slot = document.getElementById('symbol-slot');
    if (slot) {
      var r = slot.getBoundingClientRect();
      st.slotDoc = r.top + st.y + r.height / 2;
    }
    var about = document.getElementById('about');
    if (about) {
      var ar = about.getBoundingClientRect();
      st.aboutDoc = ar.top + st.y;
      st.aboutH = ar.height;
    }
  }

  function render() {
    var w = st.vw, h = st.vh, y = st.y;
    var p = Math.min(1, Math.max(0, y / st.max));

    // Мобильная версия (< 960px): точки мельче и тише, лепестки собираются по центру в месте под кнопками контактов
    var isM = w < 960;
    var pr = isM ? Math.max(52, Math.min(86, w * 0.2)) : Math.max(64, Math.min(124, Math.min(w, h) * 0.15));
    var pd = pr * 0.675;
    var cx = isM ? w / 2 : Math.min(w - pr * 2.4 - 16, w * 0.75);
    var reach = pr + pd;
    // Телефон, финал. Узор собирается в нижней части экрана (landY), пока место под кнопками (#symbol-slot) подъезжает снизу.
    // Когда место доезжает до landY, узор «садится» в него и дальше едет вместе со страницей.
    // pin: прогресс сборки, 0 = место ещё далеко внизу, 1 = место доехало
    var slotV = st.slotDoc ? st.slotDoc - y : h * 3;
    var landY = h - reach - 24, startY = h + reach * 2.5;
    var pin = isM ? Math.min(1, Math.max(0, (startY - slotV) / (startY - landY))) : 0;
    // мягкая посадка: за D пикселей до места узор постепенно начинает ехать вместе со страницей, без толчка
    var dock = slotV - landY, D = reach * 1.5;
    var cy = !isM ? h * 0.5 : dock <= 0 ? slotV : landY + dock * (1 - ss(0, D, dock));
    var fin = petalLayout(cx, cy, pr, pd, 0);
    // на телефоне «четыре круга сближаются» стоят там же, где потом соберётся символ: лепестки собираются на месте, без движения вниз-вверх
    var near = isM ? petalLayout(w / 2, landY, pr * 0.85, pd * 1.9, 0.5)
                   : petalLayout((w * 0.5 + cx) / 2, cy, pr * 0.85, pd * 2.6, 0.5);

    // Сюжет от простого к сложному: один круг (форматы) -> два круга -> четыре сближающихся круга -> символ
    var one = { x: w * 0.5, y: h * 0.5, r: isM ? Math.min(w * 0.38, h * 0.28) : Math.min(w, h) * 0.3 };
    var two = isM ? { x: w / 2, y: landY, r: reach * 0.75 } : { x: (w * 0.5 + cx) / 2, y: h * 0.5, r: pr * 1.25 };
    two.off = two.r * 0.7;
    var r0 = rng(11), r2 = rng(23);
    var F = [[], [], [], [], [], fin.pts];
    var clusterC = [[0.2, 0.3], [0.8, 0.28], [0.24, 0.74], [0.76, 0.72]];
    for (var i = 0; i < N; i++) {
      var g = grp(i), r = role(i), k = i % 11;
      F[0].push({ x: w * (0.05 + r0() * 0.9), y: h * (0.08 + r0() * 0.84) });
      if (r === 'dot') {
        var fx = 0.1 + 0.8 * (k / 10);
        var tilt = (fx - 0.5) * h * 0.1 * (g % 2 ? 1 : -1);
        F[1].push({ x: w * fx, y: h * (0.22 + 0.18 * g) + tilt });
        // на компьютере кучки крупнее, чтобы читались как кучки, а не как случайный разброс
        var a = r2() * Math.PI * 2, d = isM ? 18 + r2() * 72 : 30 + r2() * 100;
        F[2].push({ x: w * clusterC[g][0] + Math.cos(a) * d, y: h * clusterC[g][1] + Math.sin(a) * d });
        var a1 = (i / 44) * Math.PI * 2 - Math.PI / 2;
        F[3].push({ x: one.x + Math.cos(a1) * one.r, y: one.y + Math.sin(a1) * one.r });
        // группы 0 и 1 на левом круге, 2 и 3 на правом
        var side = g < 2 ? -1 : 1, a2 = ((i % 22) / 22) * Math.PI * 2 - Math.PI / 2;
        F[4].push({ x: two.x + side * two.off + Math.cos(a2) * two.r, y: two.y + Math.sin(a2) * two.r });
      } else if (r === 'accent') {
        F[1].push({ x: w * 0.94, y: h * (0.22 + 0.18 * g) + h * 0.05 * (g % 2 ? 1 : -1) });
        F[2].push({ x: w * clusterC[g][0], y: h * clusterC[g][1] });
        var a3 = -Math.PI / 2 + g * Math.PI / 2;
        F[3].push({ x: one.x + Math.cos(a3) * one.r * 0.6, y: one.y + Math.sin(a3) * one.r * 0.6 });
        F[4].push({ x: two.x + (g < 2 ? -1 : 1) * two.off, y: two.y + (g % 2 ? 1 : -1) * two.r * 0.5 });
      } else {
        F[1].push({ x: w * 0.5, y: h * 0.5 });
        F[2].push({ x: w * 0.5, y: h * 0.5 });
        F[3].push({ x: one.x, y: one.y });
        F[4].push({ x: two.x, y: two.y });
      }
    }

    var stops = st.stops, seg = 0;
    while (seg < stops.length - 2 && p > stops[seg + 1]) seg++;
    var u = p >= stops[stops.length - 1] ? 1 : ss(0.3, 0.95, (p - stops[seg]) / (stops[seg + 1] - stops[seg]));
    var A = F[seg], B = F[seg + 1];
    var tF = ss(stops[4], stops[5], p);
    if (seg >= 4 && isM) {
      // Телефон: по ходу «Обо мне» два круга расходятся в четыре сближающихся круга (q),
      // а у кнопок контактов четыре круга собираются в символ (pin)
      var qs = (st.aboutDoc || 0) - h * 0.35, qe = (st.slotDoc || 0) - startY;
      var q = qe > qs ? Math.min(1, Math.max(0, (y - qs) / (qe - qs))) : 1;
      if (pin > 0) { A = near.pts; B = F[5]; u = ss(0, 1, pin); }
      else { A = F[4]; B = near.pts; u = ss(0.15, 0.75, q); }
      tF = pin;
    }
    if (!isM && st.tops && st.tops.length === 5) {
      // Компьютер: свой сюжет, короче мобильного: хаос -> линии -> кучки (как я работаю и кейсы) ->
      // четыре отдельных круга (форматы) -> круги сближаются (обо мне) -> символ (контакты).
      // Смена фигуры идёт по фиксированному окну прокрутки (0.45 экрана) и заканчивается, когда раздел
      // поднимается к верхней трети экрана; пока раздел на экране, фигура стоит.
      var far = petalLayout(w * 0.5, h * 0.5, pr * 0.8, Math.min(pr * 2.6, h * 0.34), Math.PI / 4);
      // оранжевые акценты в центрах отдельных кругов, иначе при широкой расстановке они уходят за экран
      far.centers.forEach(function (c, g) { far.pts[44 + g] = { x: c.x, y: c.y }; });
      var S = [F[0], F[1], F[2], far.pts, near.pts, F[5]];
      var T = st.tops, k35 = h * 0.35;
      var keys = [0, T[0] - k35, T[1] - k35, T[2] - k35, T[3] - k35, T[4] - k35];
      var L = h * 0.45, j = 1;
      while (j < keys.length - 1 && y > keys[j]) j++;
      if (y > keys[keys.length - 1]) { A = S[S.length - 1]; B = A; u = 1; tF = 1; }
      else {
        var from = Math.max(keys[j] - L, keys[j - 1] + (keys[j] - keys[j - 1]) * 0.1);
        A = S[j - 1]; B = S[j]; u = ss(from, keys[j], y);
        tF = j === keys.length - 1 ? u : 0;
      }
    }
    // в финале на телефоне точки и круги без задержки привязаны к прокрутке: движение и так плавное, а с задержкой узор плыл и распадался
    layer.classList.toggle('pin', isM && pin > 0);
    var calm = ss(0, stops[1] * 0.9, p);

    var rp = rng(5);
    for (i = 0; i < N; i++) {
      var ph = rp() * Math.PI;
      var sway = Math.sin((y / (320 + i * 13)) * Math.PI + ph) * 6 * (1 - tF);
      var x = A[i].x + (B[i].x - A[i].x) * u;
      var yy = A[i].y + (B[i].y - A[i].y) * u - sway;
      var rl = role(i);
      var color = rl === 'dot' ? PETAL_COLORS[grp(i)] : C.orange;
      var size = isM ? (rl === 'dot' ? 5 : rl === 'accent' ? 6 : 7) : (rl === 'dot' ? 7 : rl === 'accent' ? 8 : 9);
      if (isM) {
        // на телефоне точки растут постепенно, без скачка в середине сборки
        var big = rl === 'dot' ? 7 : rl === 'accent' ? 10 : 16;
        size = Math.round(size + (big - size) * ss(0.4, 1, tF));
      } else if (tF > 0.5) size = rl === 'dot' ? 9 : rl === 'accent' ? 13 : 22;
      var journeyMax = isM ? 0.45 : 1;
      var op = isM ? (0.2 + (journeyMax - 0.2) * calm) + (1 - journeyMax) * tF : 0.3 + 0.7 * calm;
      var el = dotEls[i];
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.background = color;
      el.style.opacity = st.ready ? op.toFixed(2) : 0;
      el.style.transform = 'translate(' + Math.round(x - size / 2) + 'px,' + Math.round(yy - size / 2) + 'px)';
    }
    var lineOp = (ss(0.6, 1, tF) * 0.5).toFixed(2);
    fin.centers.forEach(function (c, g) {
      ringEls[g].style.transform = 'translate(' + Math.round(c.x) + 'px,' + Math.round(c.y) + 'px)';
      ringEls[g].setAttribute('r', Math.round(pr));
      ringEls[g].setAttribute('stroke-opacity', lineOp);
    });
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = null; measure(); render(); });
  }

  function init() {
    drawFigure();
    if (!setupDots()) return;
    measure();
    render(); // точки сразу на местах, без анимации и невидимы
    // затем включаем плавные переходы и проявляем точки
    setTimeout(function () {
      st.ready = true;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) { dotEls.forEach(function (d) { d.classList.add('live'); }); net.classList.add('live'); }
      render();
    }, 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', onScroll); // шрифты и фото меняют высоту разделов
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
  Панели форматов. Ссылка #format-<id> открывает панель #format-<id>-panel,
  такую ссылку можно отправить заказчику, и программа откроется сразу.
  Закрытие: кнопка, клик по затемнению, Esc, кнопка «назад» в браузере или телефоне.
*/
(function () {
  'use strict';

  var page, scrim, current = null, opener = null, pushed = false, closeTimer = null;

  function panelFor(hash) {
    var m = /^#format-([\w-]+)$/.exec(hash || '');
    return m ? document.getElementById('format-' + m[1] + '-panel') : null;
  }

  function open(panel) {
    if (current === panel) return;
    if (current) hide(current, true);
    clearTimeout(closeTimer);
    current = panel;
    opener = document.activeElement;
    scrim.hidden = false;
    panel.hidden = false;
    panel.scrollTop = 0;
    document.documentElement.classList.add('fp-lock');
    if (page) page.inert = true;
    void panel.offsetWidth; // зафиксировать начальное положение, чтобы сработал переход
    document.body.classList.add('fp-open');
    panel.classList.add('is-open');
    panel.focus({ preventScroll: true });
  }

  function hide(panel, instant) {
    panel.classList.remove('is-open');
    document.body.classList.remove('fp-open');
    document.documentElement.classList.remove('fp-lock');
    if (page) page.inert = false;
    var done = function () { panel.hidden = true; scrim.hidden = true; };
    if (instant) done(); else closeTimer = setTimeout(done, 450);
    current = null;
    if (opener && opener.focus) opener.focus({ preventScroll: true });
    opener = null;
  }

  function close() {
    if (!current) return;
    if (pushed) { pushed = false; history.back(); return; } // hashchange закроет панель
    history.replaceState(null, '', location.pathname + location.search);
    hide(current);
  }

  function sync() {
    var p = panelFor(location.hash);
    if (p) open(p);
    else if (current) { pushed = false; hide(current); }
  }

  function init() {
    page = document.getElementById('page');
    scrim = document.querySelector('.fp-scrim');
    if (!scrim) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#format-"]');
      if (a && panelFor(a.getAttribute('href'))) {
        e.preventDefault();
        history.pushState(null, '', a.getAttribute('href'));
        pushed = true;
        sync();
        return;
      }
      if (e.target.closest && e.target.closest('[data-close]')) close();
    });
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    sync(); // открыть сразу, если пришли по ссылке на программу
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Кнопка «Наверх»: видна, когда первый экран ушёл вверх */
(function () {
  'use strict';
  function init() {
    var btn = document.querySelector('.to-top');
    if (!btn) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var footer = document.querySelector('footer');
    var base = parseFloat(getComputedStyle(btn).bottom) || 16;
    function sync() {
      btn.classList.toggle('show', (window.scrollY || 0) > window.innerHeight * 0.8);
      // над подвалом кнопка приподнимается, чтобы не закрывать ссылки
      var lift = footer ? window.innerHeight - footer.getBoundingClientRect().top : 0;
      btn.style.bottom = lift > 0 ? (lift + base) + 'px' : '';
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    });
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

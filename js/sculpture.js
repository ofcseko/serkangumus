/* CODE → FORM sculpture
   A half-twisted ribbon rendered on a plain 2D canvas (no WebGL, no libraries).
   One half is drawn as wireframe ("code"), the other as a shaded metal surface ("form").
   Scrolling through the hero turns more of the code into form. */
(function () {
  "use strict";

  var canvas = document.querySelector("[data-sculpture]");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  var SEG = coarse ? 72 : 110;   // segments around the loop
  var ROWS = coarse ? 7 : 10;    // rows across the ribbon
  var TAU = Math.PI * 2;

  // Base geometry (object space), computed once.
  function point(u, v) {
    var twist = u * 0.5 + 0.38;
    var radial = v * Math.cos(twist);
    return [
      (0.96 + radial) * Math.cos(u),
      (1.38 + radial) * Math.sin(u),
      0.27 * Math.sin(u * 2) + v * Math.sin(twist) + 0.12 * Math.cos((v / 0.34) * Math.PI / 2)
    ];
  }
  var cols = SEG + 1, rows = ROWS + 1;
  var base = new Float32Array(cols * rows * 3);
  var uOf = new Float32Array(cols);
  for (var i = 0; i < cols; i++) {
    var u = -Math.PI / 2 + (i / SEG) * TAU;
    uOf[i] = u;
    for (var j = 0; j < rows; j++) {
      var p = point(u, -0.34 + (j / ROWS) * 0.68);
      var k = (i * rows + j) * 3;
      base[k] = p[0]; base[k + 1] = p[1]; base[k + 2] = p[2];
    }
  }
  var cam = new Float32Array(base.length);     // rotated (camera space)
  var scr = new Float32Array(cols * rows * 2); // projected
  var quadCount = SEG * ROWS;
  var order = new Uint32Array(quadCount);
  var depth = new Float32Array(quadCount);
  for (var q = 0; q < quadCount; q++) order[q] = q;

  var W = 0, H = 0, dpr = 1, scale = 1;
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(W, H) * 0.5 * 0.98;
    draw(lastT);
  }

  // Light (camera space, y up)
  var L = norm([-0.45, 0.65, 0.75]);
  var Hv = norm([L[0], L[1], L[2] + 1]);
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  var pointerX = 0, pointerY = 0, aimX = 0, aimY = 0, progress = 0, aimProgress = 0;
  var lastT = 0;
  var F = 1 / Math.tan((38 / 2) * Math.PI / 180);
  var CZ = 5.6;

  function smooth(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  function draw(t) {
    if (!W) return;
    var spin = reduce ? 0 : t * 0.00011;
    var rx = -0.18 + aimY * 0.22 + aimProgress * 0.35;
    var ry = -0.35 + spin + aimX * 0.35 + aimProgress * 1.2;
    var rz = -0.23;
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    var ox = W / 2, oy = H / 2;
    var n = cols * rows, a, b, c, x, y, z, x1, y1, z1, s;

    for (var v = 0; v < n; v++) {
      a = v * 3; x = base[a]; y = base[a + 1]; z = base[a + 2];
      // rotate Z
      x1 = x * cz - y * sz; y1 = x * sz + y * cz; x = x1; y = y1;
      // rotate X
      y1 = y * cx - z * sx; z1 = y * sx + z * cx; y = y1; z = z1;
      // rotate Y
      x1 = x * cy + z * sy; z1 = -x * sy + z * cy; x = x1; z = z1;
      cam[a] = x; cam[a + 1] = y; cam[a + 2] = z;
      s = (F / (CZ - z)) * scale * 1.08;
      scr[v * 2] = ox + x * s;
      scr[v * 2 + 1] = oy - y * s;
    }

    for (var q = 0; q < quadCount; q++) {
      var qi = (q / ROWS) | 0, qj = q % ROWS;
      var p0 = qi * rows + qj;
      depth[q] = cam[p0 * 3 + 2] + cam[(p0 + rows + 1) * 3 + 2];
    }
    // sort back-to-front (insertion sort on nearly-sorted data is fast frame to frame)
    for (var m = 1; m < quadCount; m++) {
      var key = order[m], d = depth[key], o = m - 1;
      while (o >= 0 && depth[order[o]] > d) { order[o + 1] = order[o]; o--; }
      order[o + 1] = key;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round";
    // boundary between "form" and "code" moves as the visitor scrolls
    var edge = Math.PI * (0.5 + aimProgress * 0.42);

    for (var w = 0; w < quadCount; w++) {
      q = order[w];
      var i0 = (q / ROWS) | 0, j0 = q % ROWS;
      var A = i0 * rows + j0, B = A + rows, C = B + 1, D = A + 1;
      var um = (uOf[i0] + uOf[i0 + 1]) / 2 + Math.PI / 2; // 0..2π, form centred at π/2
      var dd = ((um - Math.PI / 2) % TAU + TAU) % TAU;
      var dc = dd > Math.PI ? TAU - dd : dd; // angular distance from the centre of the "form" half
      var formness = 1 - smooth(edge - 0.18, edge + 0.18, dc);
      var zf = (cam[A * 3 + 2] + 1.6) / 3.2; // 0 back → 1 front

      if (formness > 0.01) {
        // normal from the quad diagonals
        var ax = cam[C * 3] - cam[A * 3], ay = cam[C * 3 + 1] - cam[A * 3 + 1], az = cam[C * 3 + 2] - cam[A * 3 + 2];
        var bx = cam[D * 3] - cam[B * 3], by = cam[D * 3 + 1] - cam[B * 3 + 1], bz = cam[D * 3 + 2] - cam[B * 3 + 2];
        var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        var diff = Math.abs(nx * L[0] + ny * L[1] + nz * L[2]);
        var spec = Math.pow(Math.abs(nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), 38);
        var fres = 1 - Math.abs(nz);
        var sh = diff * diff;
        var r = 38 + 150 * sh + 255 * spec * 0.9 + 30 * fres;
        var g = 44 + 158 * sh + 255 * spec * 0.9 + 55 * fres;
        var bl = 42 + 150 * sh + 255 * spec * 0.85 + 85 * fres;
        var col = "rgba(" + (r > 255 ? 255 : r | 0) + "," + (g > 255 ? 255 : g | 0) + "," + (bl > 255 ? 255 : bl | 0) + "," + formness.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(scr[A * 2], scr[A * 2 + 1]);
        ctx.lineTo(scr[B * 2], scr[B * 2 + 1]);
        ctx.lineTo(scr[C * 2], scr[C * 2 + 1]);
        ctx.lineTo(scr[D * 2], scr[D * 2 + 1]);
        ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.25; ctx.stroke();
      }

      var wire = 1 - formness;
      if (wire > 0.01) {
        var alpha = wire * (0.28 + 0.62 * zf);
        ctx.strokeStyle = "rgba(227,255,92," + alpha.toFixed(3) + ")";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(scr[A * 2], scr[A * 2 + 1]); ctx.lineTo(scr[B * 2], scr[B * 2 + 1]);
        if (j0 === ROWS - 1) { ctx.moveTo(scr[D * 2], scr[D * 2 + 1]); ctx.lineTo(scr[C * 2], scr[C * 2 + 1]); }
        if (i0 % 6 === 0) { ctx.moveTo(scr[A * 2], scr[A * 2 + 1]); ctx.lineTo(scr[D * 2], scr[D * 2 + 1]); }
        ctx.stroke();
        if (i0 % 6 === 0 && (j0 % 2 === 0)) {
          ctx.fillStyle = "rgba(227,255,92," + (alpha * 1.2).toFixed(3) + ")";
          ctx.fillRect(scr[A * 2] - 1.1, scr[A * 2 + 1] - 1.1, 2.2, 2.2);
        }
      }
    }
  }

  // ---- loop control ----
  var running = false, visible = true, raf = 0, lastFrame = 0;
  var minFrame = coarse ? 1000 / 30 : 0;
  function frame(t) {
    raf = 0;
    if (!running) return;
    if (t - lastFrame >= minFrame) {
      lastFrame = t; lastT = t;
      aimX += (pointerX - aimX) * 0.06;
      aimY += (pointerY - aimY) * 0.06;
      aimProgress += (progress - aimProgress) * 0.12;
      draw(t);
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (reduce || running || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  if (!reduce) {
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    window.addEventListener("scroll", function () {
      progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
    }, { passive: true });
  }

  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();
  start();
})();

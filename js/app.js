(function () {
  "use strict";
  const { PROJ, GROUPS, PINS, NC, MONTHS, ROLES } = window.SS;
  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrowMQ = window.matchMedia("(max-width: 640px)");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // API Gateway HTTP API from backend/ (Lambda + SES for orders, Lambda + DynamoDB for probe counts).
  // Leave empty to fall back to mailto and hide the field log.
  const API_BASE = "https://s11g4nh0l3.execute-api.us-east-1.amazonaws.com";

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(tag, attrs, str, parent) { const e = el(tag, attrs, parent); e.textContent = str; return e; }
  const heat = p => p.type === "P" ? 4 : p.type === "G" ? 0 : Math.min(p.proj.length, 4);

  /* ---------- pinout layouts ---------- */
  function qfn() {
    const W = 900, H = 640, bx = 180, by = 150, S = 340, L = 16;
    const off = i => 35 + 30 * i;
    return {
      W, H, kind: "qfn", bx, by, S, L, conX: 684,
      pinGeom(p) {
        const i = (p.no - 1) % 10, side = p.group.key;
        if (side === "L") return { side, x: bx - L, y: by + off(i) - 5, w: L, h: 10, tip: [bx - L, by + off(i)], lx: bx - L - 6, ly: by + off(i), rot: 0, anchor: "end" };
        if (side === "B") return { side, x: bx + off(i) - 5, y: by + S, w: 10, h: L, tip: [bx + off(i), by + S + L], lx: bx + off(i), ly: by + S + L + 6, rot: -90, anchor: "end" };
        if (side === "R") return { side, x: bx + S, y: by + S - off(i) - 5, w: L, h: 10, tip: [bx + S + L, by + S - off(i)], lx: bx + S + L + 6, ly: by + S - off(i), rot: 0, anchor: "start" };
        return { side, x: bx + S - off(i) - 5, y: by - L, w: 10, h: L, tip: [bx + S - off(i), by - L], lx: bx + S - off(i), ly: by - L - 6, rot: -90, anchor: "start" };
      },
      trunk(g, len) {
        const top = 40, bot = 600, left = 70, bus = 660;
        if (g.side === "L") return [[g.lx - len - 4, g.ly], [left, g.ly], [left, top], [bus, top]];
        if (g.side === "T") return [[g.lx, g.ly - len - 4], [g.lx, top], [bus, top]];
        if (g.side === "B") return [[g.lx, g.ly + len + 4], [g.lx, bot], [bus, bot]];
        return [[g.lx + len + 4, g.ly], [bus, g.ly]];
      },
      jY: k => 78 + 27 * k, jX: 704, jW: 170,
      legend: { x: 704, y: 16 },
      callout: { tx: 12, ty: 612, lines: ["Probe any pin", "hover or tap a skill"], path: "M70 586 C 110 560, 130 520, 156 482", head: [156, 482] }
    };
  }
  function dip() {
    const W = 380, bx = 135, by = 46, BW = 110, L = 14, pitch = 27, first = 22;
    const BH = first * 2 + pitch * 19;
    const jTop = by + BH + 74;
    const H = jTop + 30 * 10 + 10;
    return {
      W, H, kind: "dip", bx, by, BW, BH, L, conX: 44,
      pinGeom(p) {
        const n = p.no;
        if (n <= 20) { const y = by + first + pitch * (n - 1); return { side: "L", x: bx - L, y: y - 5, w: L, h: 10, tip: [bx - L, y], lx: bx - L - 5, ly: y, rot: 0, anchor: "end" }; }
        const y = by + first + pitch * (40 - n);
        return { side: "R", x: bx + BW, y: y - 5, w: L, h: 10, tip: [bx + BW + L, y], lx: bx + BW + L + 5, ly: y, rot: 0, anchor: "start" };
      },
      trunk(g, len) {
        const bus = 22, right = 362, ch = by + BH + 40;
        if (g.side === "L") return [[g.lx - len - 4, g.ly], [bus, g.ly]];
        return [[g.lx + len + 4, g.ly], [right, g.ly], [right, ch], [bus, ch]];
      },
      jY: k => jTop + 30 * k, jX: 64, jW: 220,
      legend: { x: 92, y: 10 },
      callout: null
    };
  }

  /* ---------- pinout ---------- */
  const svg = $("#chip");
  let layout = null, pinEls = {}, jEls = {}, traceLayer = null;
  let locked = PINS[0], current = null;

  function build() {
    const mobile = narrowMQ.matches;
    layout = mobile ? dip() : qfn();
    $("#pkgname").textContent = mobile ? "PDIP-40 · tap any pin" : "RQFN-40 · 4 groups";
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${layout.W} ${layout.H}`);
    pinEls = {}; jEls = {};
    const Lg = layout;

    if (Lg.kind === "qfn") {
      const { bx, by, S } = Lg;
      el("rect", { x: bx, y: by, width: S, height: S, class: "body", rx: 3 }, svg);
      el("circle", { cx: bx + 18, cy: by + 18, r: 5, fill: "#e9e5dc" }, svg);
      el("rect", { x: bx + 95, y: by + 95, width: 150, height: 150, fill: "none", stroke: "#5a564d", "stroke-dasharray": "4 3" }, svg);
      txt("text", { x: bx + S / 2, y: by + S / 2 - 14, "text-anchor": "middle", class: "bodytxt", "font-size": "22", "font-weight": "600" }, "ANISH-K2026", svg);
      txt("text", { x: bx + S / 2, y: by + S / 2 + 10, "text-anchor": "middle", class: "bodydim", "font-size": "11" }, "FULL STACK & SYSTEMS", svg);
      txt("text", { x: bx + S / 2, y: by + S / 2 + 28, "text-anchor": "middle", class: "bodydim", "font-size": "11" }, "SS · REV 2026 · IN", svg);
      txt("text", { x: bx + S / 2, y: by + S / 2 + 62, "text-anchor": "middle", class: "bodydim", "font-size": "9" }, "THERMAL PAD (41)", svg);
      const gl = (x, y, rot, s) => txt("text", { x, y, "text-anchor": "middle", class: "bodydim", "font-size": "9.5", "letter-spacing": "1", transform: rot ? `rotate(${rot} ${x} ${y})` : "" }, s, svg);
      gl(bx + 44, by + S / 2, -90, "LANGUAGES & RUNTIMES");
      gl(bx + S / 2, by + S - 40, 0, "DEVOPS & OBSERVABILITY");
      gl(bx + S - 44, by + S / 2, 90, "DATA & AI");
      gl(bx + S / 2, by + 46, 0, "PROTOCOLS & FRONTEND");
    } else {
      const { bx, by, BW, BH } = Lg;
      el("rect", { x: bx, y: by, width: BW, height: BH, class: "body", rx: 3 }, svg);
      el("path", { d: `M${bx + BW / 2 - 14} ${by} a14 14 0 0 0 28 0`, fill: "#55524c" }, svg);
      el("circle", { cx: bx + 14, cy: by + 14, r: 4, fill: "#e9e5dc" }, svg);
      el("line", { x1: bx + 8, x2: bx + BW - 8, y1: by + BH / 2, y2: by + BH / 2, stroke: "#5a564d", "stroke-dasharray": "4 3" }, svg);
      const cx = bx + BW / 2;
      txt("text", { x: cx, y: by + BH / 2, "text-anchor": "middle", class: "bodytxt", "font-size": "17", "font-weight": "600", transform: `rotate(-90 ${cx} ${by + BH / 2})`, dy: "-4" }, "ANISH-K2026", svg);
      const gl = (x, y, rot, s) => txt("text", { x, y, "text-anchor": "middle", class: "bodydim", "font-size": "9", "letter-spacing": "1", transform: `rotate(${rot} ${x} ${y})` }, s, svg);
      gl(bx + 26, by + BH / 4, -90, "LANG & RUNTIMES");
      gl(bx + 26, by + BH * 3 / 4, -90, "DEVOPS & OBS");
      gl(bx + BW - 26, by + BH / 4, 90, "PROTOCOLS & UI");
      gl(bx + BW - 26, by + BH * 3 / 4, 90, "DATA & AI");
      txt("text", { x: cx + 16, y: by + BH / 2, "text-anchor": "middle", class: "bodydim", "font-size": "9", transform: `rotate(-90 ${cx + 16} ${by + BH / 2})`, dy: "4" }, "FULL STACK & SYSTEMS", svg);
    }

    traceLayer = el("g", {}, svg);

    PINS.forEach(p => {
      const g = Lg.pinGeom(p);
      const grp = el("g", { class: "pin" + (p.type ? " pwr" : ""), "data-heat": heat(p), tabindex: "0", role: "button", "aria-label": `Pin ${p.no}, ${p.name}: ${p.desc}. Used in ${p.proj.length} projects.` }, svg);
      const lead = el("rect", { x: g.x, y: g.y, width: g.w, height: g.h, class: "lead" }, grp);
      const t = txt("text", { x: g.lx, y: g.ly, "text-anchor": g.anchor, "dominant-baseline": "central", class: "lbl", transform: g.rot ? `rotate(${g.rot} ${g.lx} ${g.ly})` : "" }, p.name, grp);
      let nx, ny, nanchor = "middle";
      if (g.side === "L") { nx = g.x + g.w + 5; ny = g.tip[1]; nanchor = "start"; }
      else if (g.side === "R") { nx = g.x - 5; ny = g.tip[1]; nanchor = "end"; }
      else if (g.side === "B") { nx = g.tip[0]; ny = g.y - 7; }
      else { nx = g.tip[0]; ny = g.y + g.h + 12; }
      txt("text", { x: nx, y: ny, "text-anchor": nanchor, "dominant-baseline": "central", class: "bodydim", "font-size": "8", style: "pointer-events:none" }, String(p.no), svg);
      const len = t.getComputedTextLength() || p.name.length * 7.2;
      let hx, hy, hw, hh;
      const hs = Lg.kind === "dip" ? 13 : 11;
      if (g.side === "L") { hx = g.lx - len - 6; hy = g.ly - hs; hw = len + 6 + g.w + 6; hh = hs * 2; }
      else if (g.side === "R") { hx = g.x; hy = g.ly - hs; hw = g.w + 6 + len + 6; hh = hs * 2; }
      else if (g.side === "T") { hx = g.lx - 12; hy = g.ly - len - 6; hw = 24; hh = len + 6 + g.h + 6; }
      else { hx = g.lx - 12; hy = g.y; hw = 24; hh = g.h + 6 + len + 6; }
      grp.insertBefore(el("rect", { x: hx, y: hy, width: hw, height: hh, class: "hit" }), lead);
      p._g = g; p._len = len;
      pinEls[p.no] = grp;
      grp.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") probe(p); });
      grp.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") probe(locked, false, true); });
      grp.addEventListener("click", () => { locked = p; probe(p); });
      grp.addEventListener("focus", () => probe(p));
      grp.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); locked = p; probe(p); } });
    });

    // J1 connector: the projects
    const jx = Lg.jX, jw = Lg.jW;
    txt("text", { x: jx, y: Lg.jY(0) - 24, "font-size": "11", "font-weight": "600", fill: "#1c1b18", "letter-spacing": "1" }, "J1 · PROJECTS", svg);
    PROJ.forEach((pr, k) => {
      const y = Lg.jY(k);
      const a = el("a", { href: pr.href, class: "jrow", "aria-label": `${pr.title}, jump to project` }, svg);
      el("line", { x1: Lg.conX, x2: jx, y1: y, y2: y, class: "jlead" }, a);
      el("rect", { x: jx, y: y - 12, width: jw, height: 24, class: "cell" }, a);
      txt("text", { x: jx + 10, y, "dominant-baseline": "central", "font-size": "10", opacity: ".7" }, String(k + 1).padStart(2, "0"), a);
      txt("text", { x: jx + 34, y, "dominant-baseline": "central" }, pr.name, a);
      jEls[pr.id] = a;
      a.addEventListener("pointerenter", () => feeds(pr.id));
      a.addEventListener("pointerleave", () => feeds(null));
    });

    // thermal legend, shown only in thermal view
    const lg = el("g", { class: "heatmap", "aria-hidden": "true" }, svg);
    txt("text", { x: Lg.legend.x, y: Lg.legend.y + 7, "font-size": "10", "dominant-baseline": "central", fill: "#1c1b18" }, "FAN-OUT", lg);
    ["#d9d3c6", "#efc3a8", "#e3895a", "#c9531c", "#8f2a03"].forEach((c, i) => {
      const x = Lg.legend.x + 56 + i * 26;
      el("rect", { x, y: Lg.legend.y, width: 14, height: 14, fill: c, stroke: "#1c1b18" }, lg);
      txt("text", { x: x + 16, y: Lg.legend.y + 7, "font-size": "9", "dominant-baseline": "central", fill: "#4a473f" }, i === 4 ? "4+" : String(i), lg);
    });

    // visible hint
    const cg = el("g", { class: "callout", "aria-hidden": "true" }, svg);
    if (Lg.callout) {
      const c = Lg.callout;
      txt("text", { x: c.tx, y: c.ty - 18, "letter-spacing": "1.2" }, c.lines[0].toUpperCase(), cg);
      txt("text", { x: c.tx, y: c.ty, style: "font-weight:400;font-size:12px" }, c.lines[1], cg);
      el("path", { d: c.path }, cg);
      el("path", { class: "head", d: `M${c.head[0]} ${c.head[1]} l-9 3 l5 5 z` }, cg);
    } else {
      txt("text", { x: Lg.W / 2, y: Lg.by + Lg.BH + 20, "text-anchor": "middle", "letter-spacing": "1" }, "▲ TAP ANY PIN TO PROBE IT", cg);
    }

    svg.classList.toggle("thermal", thermalOn);
    current = null;
    probe(locked, true);
  }

  function feeds(pid) {
    PINS.forEach(p => pinEls[p.no].classList.toggle("feeds", !!pid && p.proj.includes(pid) && p.type === ""));
  }

  function probe(p, instant, quiet) {
    if (!p || (current === p && !instant)) return;
    current = p;
    if (!instant && !quiet) field.touch(p);
    PINS.forEach(q => pinEls[q.no].classList.toggle("on", q === p));
    PROJ.forEach(pr => jEls[pr.id].classList.toggle("on", p.proj.includes(pr.id)));
    traceLayer.innerHTML = "";
    if (p.proj.length) {
      const pts = layout.trunk(p._g, p._len);
      let d = "M" + pts.map(q => q.join(" ")).join(" L");
      const entry = pts[pts.length - 1];
      const ys = p.proj.map(id => layout.jY(PROJ.findIndex(x => x.id === id)));
      ys.forEach(y => { d += ` M${entry[0]} ${entry[1]} L${entry[0]} ${y} L${layout.conX} ${y}`; });
      const path = el("path", { d, class: "trace", pathLength: "1" }, traceLayer);
      ys.forEach(y => el("circle", { cx: entry[0], cy: y, r: 3, class: "via" }, traceLayer));
      if (reduce || instant) path.classList.add("drawn");
      else { path.getBoundingClientRect(); requestAnimationFrame(() => path.classList.add("drawn")); }
    }
    el("circle", { cx: p._g.tip[0], cy: p._g.tip[1], r: 9, class: "probe-tip" }, traceLayer);
    $$(".pintbl tr[data-no]").forEach(tr => tr.classList.toggle("on", +tr.dataset.no === p.no));
    scope.set(p);
  }

  /* ---------- oscilloscope ---------- */
  const scope = (function () {
    const cv = $("#scopecv"), ctx = cv.getContext("2d"), out = $("#readout");
    let pin = null, phase = 0, last = 0, raf = 0, visible = true;
    function size() {
      const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      cv.width = Math.max(10, Math.round(r.width * d)); cv.height = Math.max(10, Math.round(r.height * d));
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function bits(name) {
      const b = [];
      for (const ch of name) { const c = ch.charCodeAt(0); b.push(0); for (let i = 0; i < 8; i++) b.push((c >> i) & 1); b.push(1); }
      return b;
    }
    // x runs 0..1 across the screen; returns -1..1
    function wave(x) {
      const n = pin.proj.length, key = pin.group.key;
      const t = x * (1.5 + n * 0.9) + phase;
      if (pin.type === "P") return 0.7 + 0.04 * Math.sin(x * 60 + phase * 8);
      if (pin.type === "G") return (Math.random() - .5) * 0.08;
      if (key === "L") return (t % 1) < 0.5 ? 1 : -1;
      if (key === "B") return 2 * (t % 1) - 1;
      if (key === "R") return Math.sin(t * Math.PI * 2);
      const bs = bits(pin.name);
      return bs[Math.floor(((x * bs.length * 0.5) + phase * 4) % bs.length)] ? 1 : -1;
    }
    function draw() {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      ctx.fillStyle = "#171612"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#3a3830"; ctx.lineWidth = 1; ctx.setLineDash([1, 3]);
      for (let i = 1; i < 10; i++) { const x = Math.round(i * w / 10) + .5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let j = 1; j < 8; j++) { const y = Math.round(j * h / 8) + .5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.setLineDash([]); ctx.strokeStyle = "#55524a";
      ctx.beginPath(); ctx.moveTo(0, h / 2 + .5); ctx.lineTo(w, h / 2 + .5); ctx.moveTo(w / 2 + .5, 0); ctx.lineTo(w / 2 + .5, h); ctx.stroke();
      if (!pin) return;
      const amp = pin.type ? h * 0.38 : h * (0.12 + 0.035 * Math.min(pin.proj.length, 7));
      ctx.strokeStyle = "#ff7a2e"; ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.beginPath();
      let prev = null;
      for (let px = 0; px <= w; px++) {
        const y = h / 2 - wave(px / w) * amp;
        if (px === 0) ctx.moveTo(px, y);
        else { if (prev !== null && Math.abs(prev - y) > 2 && pin.group.key !== "R" && !pin.type) ctx.lineTo(px, prev); ctx.lineTo(px, y); }
        prev = y;
      }
      ctx.stroke();
      ctx.fillStyle = "#b9b3a6"; ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText(`PIN ${String(pin.no).padStart(2, "0")} ${pin.name}`, 6, 12);
    }
    function loop(ts) {
      if (!visible) { raf = 0; return; }
      const dt = last ? Math.min(50, ts - last) : 16; last = ts; phase += dt / 1600; draw();
      raf = requestAnimationFrame(loop);
    }
    function start() { if (reduce) { draw(); return; } if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(cv);
    window.addEventListener("resize", () => { size(); draw(); });
    return {
      set(p) {
        pin = p; size(); draw(); start();
        const list = p.proj.map(id => PROJ.find(x => x.id === id));
        out.innerHTML =
          `<div><span class="k">CH1</span> <span class="pinname">PIN ${p.no} · ${p.name}</span></div>` +
          `<div><span class="k">FN </span> ${p.desc}</div>` +
          (p.type ? `<div class="note">${p.type === "P" ? "Fan-out: all 10 projects." : "No loads. This pin is a joke."}</div>` : "") +
          (list.length && p.type !== "P" ? `<div><span class="k">FAN-OUT</span> ${list.length} project${list.length > 1 ? "s" : ""}</div><ul class="loads">${list.map(x => `<li><a href="${x.href}">${x.title}</a></li>`).join("")}</ul>` : "") +
          field.line(p);
      }
    };
  })();

  /* ---------- field log: live probe counts from every visitor ---------- */
  // A pin counts once per page load, and only after it stays probed for 700 ms.
  const field = (function () {
    const counts = {}, sent = new Set();
    let total = 0, ready = false, timer = 0;
    const take = d => { if (d) { Object.assign(counts, d.pins); total = d.total; ready = true; } };
    if (API_BASE) {
      fetch(API_BASE + "/probes").then(r => r.ok ? r.json() : null).then(d => { take(d); if (ready && current) scope.set(current); }).catch(() => {});
    }
    return {
      line(p) {
        if (!ready) return "";
        const n = counts[p.name] || 0;
        return `<div class="field"><span class="k">FIELD</span> probed ${n} time${n === 1 ? "" : "s"} by visitors · ${total} total</div>`;
      },
      touch(p) {
        clearTimeout(timer);
        if (!API_BASE || sent.has(p.name)) return;
        timer = setTimeout(() => {
          sent.add(p.name);
          fetch(API_BASE + "/probes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: p.name }) })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (!d) return; counts[d.pin] = d.count; total = d.total; ready = true; if (current === p) scope.set(p); })
            .catch(() => {});
        }, 700);
      }
    };
  })();

  /* ---------- thermal view ---------- */
  let thermalOn = false;
  $("#thermal").addEventListener("click", e => {
    thermalOn = !thermalOn;
    e.currentTarget.setAttribute("aria-pressed", String(thermalOn));
    svg.classList.toggle("thermal", thermalOn);
  });

  /* ---------- pin tables + NC list ---------- */
  (function () {
    const row = p => {
      const used = p.type === "P" ? "All projects" : p.type === "G" ? "—" : p.proj.map(id => { const x = PROJ.find(q => q.id === id); return `<a href="${x.href}">${x.title}</a>`; }).join(", ");
      return `<tr data-no="${p.no}"><td class="num">${p.no}</td><td><button class="pbtn" type="button" data-no="${p.no}" aria-label="Probe pin ${p.no}, ${p.name}"><i class="ph ph-crosshair-simple" aria-hidden="true"></i>${p.name}</button><span class="pdesc">${p.desc}${p.type ? ` (${p.type})` : ""}</span></td><td>${used}</td></tr>`;
    };
    const fill = (tb, groups) => {
      tb.innerHTML = groups.map(g => {
        const gi = GROUPS.indexOf(g);
        return `<tr class="g"><td colspan="3" class="grp">${g.name} · ${g.side.toLowerCase()} side, pins ${gi * 10 + 1}–${gi * 10 + 10}</td></tr>` +
          PINS.filter(p => p.group === g).map(row).join("");
      }).join("");
    };
    fill($("#pintable-a tbody"), GROUPS.slice(0, 2));
    fill($("#pintable-b tbody"), GROUPS.slice(2));
    $$(".pintbl tbody").forEach(tb => tb.addEventListener("click", e => {
      const b = e.target.closest(".pbtn");
      if (!b) return;
      const p = PINS[+b.dataset.no - 1];
      locked = p; probe(p);
      $("#pinout").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }));
    $("#nclist").innerHTML = NC.map(s => `<span>${s}</span>`).join(" ");
  })();

  /* ---------- block diagrams: send a request through ---------- */
  $$(".bd[data-run]").forEach(bd => {
    const fig = bd.closest("figure");
    const btn = $(".runbtn", fig), log = $(".runlog", fig);
    const seq = $$(".blk, .ar", bd);
    let busy = false, timer = 0;
    async function run() {
      if (busy) return;
      busy = true; clearTimeout(timer);
      seq.forEach(x => x.classList.remove("hot"));
      log.textContent = "Tracing…";
      if (reduce) seq.forEach(x => x.classList.add("hot"));
      else for (const x of seq) { x.classList.add("hot"); await wait(x.classList.contains("ar") ? 90 : 160); }
      log.textContent = bd.dataset.run;
      busy = false;
      timer = setTimeout(() => seq.forEach(x => x.classList.remove("hot")), 2600);
    }
    btn.addEventListener("click", run);
    if (!reduce) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(run, 400); } }, { threshold: .6 });
      io.observe(bd);
    }
  });

  /* ---------- radish chart ---------- */
  (function () {
    const g = $("#radchart"), read = $("#radread"), fig = $("#radfig");
    const data = [["PING", 151], ["SET", 144], ["GET", 175], ["HSET", 164], ["LPUSH", 159]];
    const x0 = 64, x1 = 500, y0 = 14, rowH = 36, max = 200;
    const defText = read.textContent;
    for (let v = 0; v <= max; v += 50) {
      const x = x0 + (x1 - x0) * v / max;
      el("line", { x1: x, x2: x, y1: y0 - 4, y2: y0 + rowH * data.length, stroke: v ? "#cbc4b5" : "#1c1b18", "stroke-width": v ? "1" : "1.2" }, g);
      txt("text", { x, y: y0 + rowH * data.length + 16, "text-anchor": "middle" }, v + "K", g);
    }
    const cross = el("line", { class: "cross", x1: x0, x2: x0, y1: y0 - 4, y2: y0 + rowH * data.length }, g);
    const bars = [], nums = [];
    data.forEach((d, i) => {
      const y = y0 + i * rowH + 8, w = (x1 - x0) * d[1] / max;
      txt("text", { x: x0 - 8, y: y + 10, "text-anchor": "end", "dominant-baseline": "central" }, d[0], g);
      const b = el("rect", { x: x0, y, width: w, height: 20, class: "bar", fill: d[0] === "GET" ? "#bf3d0a" : "#1c1b18" }, g);
      nums.push(txt("text", { x: x0 + w + 6, y: y + 10, "dominant-baseline": "central" }, "~" + d[1] + "K", g));
      bars.push(b);
      const show = () => {
        fig.classList.add("reading");
        cross.setAttribute("x1", x0 + w); cross.setAttribute("x2", x0 + w);
        read.innerHTML = `<b>${d[0]}</b>: about ${d[1]},000 requests per second (50 clients, AOF on).`;
      };
      b.addEventListener("pointerenter", show);
      b.addEventListener("pointerdown", show);
      b.addEventListener("pointerleave", () => { fig.classList.remove("reading"); read.textContent = defText; });
    });
    function rerun() {
      if (reduce) return;
      bars.forEach(b => { b.style.transition = "none"; b.style.transform = "scaleX(0)"; });
      nums.forEach(n => n.textContent = "~0K");
      g.getBoundingClientRect();
      bars.forEach((b, i) => { b.style.transition = ""; b.style.transitionDelay = i * 70 + "ms"; b.style.transform = "scaleX(1)"; });
      const t0 = performance.now();
      (function tick(t) {
        const k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
        nums.forEach((n, i) => n.textContent = "~" + Math.round(data[i][1] * e) + "K");
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }
    $("#rerun").addEventListener("click", rerun);
    if (!reduce) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); rerun(); } }, { threshold: .5 });
      io.observe(fig);
    }
  })();

  /* ---------- timing diagram (experience) ---------- */
  const timing = (function () {
    const tsvg = $("#timing"), read = $("#timeread");
    let G = null, at = 10;
    const lanes = [{ id: "clk", lane: "CLK (month)" }, ...ROLES];
    function geom() {
      if (narrowMQ.matches) return { W: 380, x0: 12, x1: 368, top: 30, laneH: 54, lblAbove: true };
      return { W: 900, x0: 180, x1: 884, top: 34, laneH: 46, lblAbove: false };
    }
    function draw() {
      G = geom();
      const n = MONTHS.length, mw = (G.x1 - G.x0) / n, X = i => G.x0 + i * mw;
      const H = G.top + lanes.length * G.laneH + 8;
      tsvg.setAttribute("viewBox", `0 0 ${G.W} ${H}`);
      tsvg.innerHTML = "";
      const defs = el("defs", {}, tsvg);
      const pat = el("pattern", { id: "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
      el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "#bf3d0a", "stroke-width": 1.4 }, pat);
      MONTHS.forEach((m, i) => {
        el("line", { class: "tick", x1: X(i), x2: X(i), y1: G.top - 6, y2: H - 6 }, tsvg);
        const show = !G.lblAbove || i === 0 || i === 4 || i === 9 || i === 13;
        if (show) {
          const lbl = G.lblAbove ? `${m.m} ${String(m.y).slice(2)}` : m.m;
          txt("text", { x: X(i) + mw / 2, y: G.top - 20, "text-anchor": "middle" }, lbl, tsvg);
          if (!G.lblAbove && (i === 0 || i === 4)) txt("text", { x: X(i) + mw / 2, y: G.top - 6, "text-anchor": "middle", fill: "#4a473f", "font-size": "10" }, m.y, tsvg);
        }
      });
      lanes.forEach((ln, k) => {
        const ty = G.top + k * G.laneH + (G.lblAbove ? 16 : 6);
        const hi = ty + 6, lo = ty + (G.lblAbove ? 30 : 32);
        const lx = G.lblAbove ? G.x0 : 8, ly = G.lblAbove ? ty - 4 : (hi + lo) / 2;
        txt("text", { x: lx, y: ly, class: "lane-lbl", "dominant-baseline": "central" }, ln.lane, tsvg);
        let d;
        if (ln.id === "clk") {
          d = `M${X(0)} ${lo}`;
          for (let i = 0; i < n; i++) d += ` L${X(i)} ${hi} L${X(i) + mw / 2} ${hi} L${X(i) + mw / 2} ${lo} L${X(i + 1)} ${lo}`;
          el("path", { d, class: "wave" }, tsvg);
          return;
        }
        const a = X(ln.from), b = X(ln.to), s = 4;
        if (ln.fuzzy) {
          el("rect", { x: a, y: hi, width: b - a, height: lo - hi, fill: "url(#hatch)", opacity: .55 }, tsvg);
          el("path", { d: `M${X(0)} ${lo} L${b} ${lo} M${a} ${hi} L${b} ${hi}`, class: "wave hi", "stroke-dasharray": "5 4" }, tsvg);
        } else {
          d = ln.from === 0 ? `M${a} ${hi}` : `M${X(0)} ${lo} L${a - s} ${lo} L${a + s} ${hi}`;
          d += ln.to >= n ? ` L${b} ${hi}` : ` L${b - s} ${hi} L${b + s} ${lo} L${X(n)} ${lo}`;
          el("path", { d, class: "wave hi" }, tsvg);
        }
        if (!G.lblAbove || ln.fuzzy === undefined) {
          const label = G.lblAbove ? ln.label.replace(" (months not fixed)", "") : ln.label;
          const mid = (a + b) / 2;
          const fits = label.length * 7.3 < b - a - 8;
          txt("text", { x: fits ? mid : b + 6, y: (hi + lo) / 2 + 1, "text-anchor": fits ? "middle" : "start", "dominant-baseline": "central", "font-size": "11", fill: "#4a473f" }, fits ? label : "", tsvg);
        }
      });
      const cur = el("line", { class: "cursor", x1: 0, x2: 0, y1: G.top - 8, y2: H - 4 }, tsvg);
      G.cur = cur; G.mw = mw; G.X = X;
      set(at);
    }
    function set(i) {
      at = Math.max(0, Math.min(MONTHS.length - 1, i));
      const x = G.X(at) + G.mw / 2;
      G.cur.setAttribute("x1", x); G.cur.setAttribute("x2", x);
      const act = ROLES.filter(r => at >= r.from && at < r.to);
      const m = MONTHS[at];
      read.innerHTML = `<b>${m.m} ${m.y}</b> · high: ${act.map(r => r.lane + (r.fuzzy ? " (some month in 2026)" : "")).join(", ") || "none"}`;
      $$(".rev[data-role]").forEach(r => r.classList.toggle("lit", act.some(a => a.id === r.dataset.role && !a.fuzzy)));
    }
    function fromEvent(e) {
      const pt = tsvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(tsvg.getScreenCTM().inverse());
      set(Math.floor((p.x - G.x0) / G.mw));
    }
    tsvg.addEventListener("pointermove", fromEvent);
    tsvg.addEventListener("pointerdown", fromEvent);
    tsvg.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); set(at + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); set(at - 1); }
    });
    return { draw };
  })();

  /* ---------- printed figures: tap to power on ---------- */
  $$(".print").forEach(f => f.addEventListener("click", e => { if (!e.target.closest("a")) f.classList.toggle("color"); }));

  /* ---------- heading anchors ---------- */
  $$(".sec[id], .app[id], section[id]").forEach(s => {
    const h = $("h2, h3", s);
    if (!h || $(".anchor", h)) return;
    const a = document.createElement("a");
    a.className = "anchor"; a.href = "#" + s.id; a.textContent = "#";
    a.setAttribute("aria-label", "Link to this section");
    h.appendChild(a);
  });

  /* ---------- request samples (contact) ---------- */
  (function () {
    const form = $("#orderform"), status = $("#orderstatus");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const part = fd.get("part"), name = fd.get("name").trim(), from = fd.get("email").trim(), msg = fd.get("message").trim();
      if (!name || !msg) { status.textContent = "Fill in your name and a message first."; return; }
      if (!API_BASE) {
        const body = `${msg}\n\n— ${name}${from ? " (" + from + ")" : ""}`;
        status.textContent = "Opening your mail app…";
        location.href = `mailto:anishisbusy@gmail.com?subject=${encodeURIComponent("Sample request: " + part)}&body=${encodeURIComponent(body)}`;
        return;
      }
      status.textContent = "Sending…";
      try {
        const r = await fetch(API_BASE + "/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ part, name, email: from, message: msg, website: fd.get("website") }) });
        if (!r.ok) throw new Error(r.status);
        status.textContent = "Order received. Lead time is usually a day.";
        form.reset();
      } catch (err) {
        status.textContent = "Could not send. Email anishisbusy@gmail.com instead.";
      }
    });
  })();

  /* ---------- viewer: page counter, progress, current section ---------- */
  (function () {
    const pages = $$(".page");
    $("#pgall").textContent = pages.length;
    const now = $("#pgnow");
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) now.textContent = e.target.dataset.page; }), { rootMargin: "-45% 0px -50% 0px" });
    pages.forEach(p => io.observe(p));
    const jumps = $$(".jumps a");
    const sio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) jumps.forEach(a => a.classList.toggle("cur", a.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-40% 0px -55% 0px" });
    jumps.forEach(a => { const t = $(a.getAttribute("href")); if (t) sio.observe(t); });
    const bar = $(".progress");
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    $$("#bm .panel a").forEach(a => a.addEventListener("click", () => { $("#bm").open = false; }));
  })();

  /* ---------- entrance ---------- */
  (function () {
    if (reduce || !("IntersectionObserver" in window)) return;
    const items = $$(".sec > :not(.app):not(.two):not(.app-grid), .app > h3, .app-grid > *, .two > *");
    items.forEach(x => x.classList.add("rise"));
    const io = new IntersectionObserver(es => {
      es.filter(e => e.isIntersecting).forEach((e, i) => {
        e.target.style.transitionDelay = (i % 5) * 70 + "ms";
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(x => io.observe(x));
  })();

  /* ---------- boot ---------- */
  build();
  timing.draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { build(); timing.draw(); });
  narrowMQ.addEventListener("change", () => { build(); timing.draw(); });
})();

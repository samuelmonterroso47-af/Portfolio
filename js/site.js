// Esvin Samuel CM — portafolio. Vanilla JS, sin dependencias del editor de Claude Design.
(function () {
  "use strict";

  var root = document.getElementById("app-root");
  if (!root) return;

  var state = { light: false, scroll: 0 };

  // ---------- Tema claro/oscuro (idéntico al del prototipo) ----------
  function themeMap() {
    return {
      "6,7,9": [255, 255, 255],
      "255,255,255": [0, 0, 0],
      "245,245,247": [29, 29, 31],
      "201,201,206": [58, 58, 60],
      "161,161,166": [110, 110, 115],
      "110,110,115": [134, 134, 139],
      "74,74,79": [161, 161, 166],
      "41,151,255": [0, 113, 227],
      "90,174,255": [0, 119, 237],
      "242,168,59": [184, 121, 26]
    };
  }

  function toLight(css, map) {
    return css.replace(/rgba?\(([^)]+)\)|#([0-9a-fA-F]{3,8})\b/g, function (full, inner, hex) {
      var r, g, b, a = null;
      if (inner) {
        var parts = inner.split(/[\s,\/]+/).filter(Boolean).map(Number);
        if (parts.length < 3 || parts.some(isNaN)) return full;
        r = parts[0]; g = parts[1]; b = parts[2];
        if (parts.length > 3) a = parts[3];
      } else {
        var h = hex;
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length !== 6) return full;
        r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
      }
      var to = map[r + "," + g + "," + b];
      if (!to) return full;
      return a === null ? "rgb(" + to.join(", ") + ")" : "rgba(" + to.join(", ") + ", " + a + ")";
    });
  }

  var origStyles = new WeakMap();
  var lightApplied = false;
  var sceneThemeFn = null;

  function applyTheme() {
    var light = state.light;
    var map = themeMap();
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll("[style]")));
    els.forEach(function (el) {
      var base = origStyles.get(el);
      var cur = el.getAttribute("style") || "";
      if (base === undefined || (!lightApplied && cur !== base)) { base = cur; origStyles.set(el, base); }
      el.setAttribute("style", light ? toLight(base, map) : base);
    });
    lightApplied = light;

    var tag = document.getElementById("escm-theme-override");
    if (!tag) { tag = document.createElement("style"); tag.id = "escm-theme-override"; document.head.appendChild(tag); }
    tag.textContent = light
      ? "html,body{background:#fff !important;color:#1d1d1f !important}a{color:#0071e3}a:hover{color:#0077ed}::selection{background:#0071e3;color:#fff}"
      : "";

    try { localStorage.setItem("escm-theme", light ? "light" : "dark"); } catch (e) {}
    var label = document.getElementById("theme-label");
    if (label) label.textContent = light ? "Oscuro" : "Claro";
    if (sceneThemeFn) sceneThemeFn(light);
  }

  var themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) themeToggle.addEventListener("click", function () {
    state.light = !state.light;
    applyTheme();
  });

  try { if (localStorage.getItem("escm-theme") === "light") state.light = true; } catch (e) {}
  applyTheme();

  // ---------- Menú móvil ----------
  var menuToggle = document.getElementById("menu-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  function setMenu(open) {
    if (!menuToggle || !mobileNav) return;
    mobileNav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () { setMenu(!mobileNav.classList.contains("open")); });
    mobileNav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // ---------- style-hover: hover puntual sobre propiedades declaradas ----------
  function parseDecls(str) {
    var out = {};
    str.split(";").forEach(function (rule) {
      var idx = rule.indexOf(":");
      if (idx === -1) return;
      var prop = rule.slice(0, idx).trim();
      var val = rule.slice(idx + 1).trim();
      if (prop) out[prop] = val;
    });
    return out;
  }

  root.querySelectorAll("[style-hover]").forEach(function (el) {
    var decls = parseDecls(el.getAttribute("style-hover"));
    el.addEventListener("pointerenter", function () {
      var base = {};
      Object.keys(decls).forEach(function (p) { base[p] = el.style.getPropertyValue(p); });
      el._hoverBase = base;
      Object.keys(decls).forEach(function (p) { el.style.setProperty(p, decls[p]); });
    });
    el.addEventListener("pointerleave", function () {
      var base = el._hoverBase || {};
      Object.keys(decls).forEach(function (p) {
        if (base[p]) el.style.setProperty(p, base[p]); else el.style.removeProperty(p);
      });
    });
  });

  // ---------- Reveal on scroll + contadores + barra de progreso + tilt ----------
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "-8% 0px -6% 0px" });
  root.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });

  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var target = parseFloat(e.target.dataset.count) || 0;
      var t0 = performance.now(), dur = 1100;
      (function step() {
        var p = Math.min(1, (performance.now() - t0) / dur);
        e.target.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US");
        if (p < 1) requestAnimationFrame(step);
      })();
    });
  }, { threshold: 0.6 });
  root.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });

  var bar = document.getElementById("progress-bar");
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    state.scroll = p;
    if (bar) bar.style.width = (p * 100).toFixed(2) + "%";
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (window.matchMedia("(hover: hover)").matches) {
    root.querySelectorAll("[data-tilt]").forEach(function (el) {
      el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1),border-color .4s,background .4s";
      el.style.willChange = "transform";
      el.addEventListener("pointerenter", function () { el.style.borderColor = "rgba(41,151,255,0.4)"; });
      el.addEventListener("pointermove", function (e) {
        var b = el.getBoundingClientRect();
        var rx = ((e.clientY - b.top) / b.height - 0.5) * -6;
        var ry = ((e.clientX - b.left) / b.width - 0.5) * 6;
        el.style.transition = "transform .12s linear,border-color .4s,background .4s";
        el.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-4px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transition = "transform .6s cubic-bezier(.16,1,.3,1),border-color .4s,background .4s";
        el.style.transform = "none";
        el.style.borderColor = "";
      });
    });
  }

  // ---------- Escena 3D (panal -> barras -> nube -> hélice -> anillos) ----------
  (function initScene() {
    var host = document.getElementById("stage");
    if (!host) return;
    function start() {
      if (!window.THREE) return void setTimeout(start, 120);
      if (!host.isConnected) return void setTimeout(start, 200);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var T = window.THREE;
      var scene = new T.Scene();
      scene.fog = new T.FogExp2(0x060709, 0.022);
      var camera = new T.PerspectiveCamera(38, 1, 0.1, 300);
      var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      scene.add(new T.HemisphereLight(0x3a4a66, 0x0a0b0f, 0.55));
      var blue = new T.PointLight(0x2997ff, 2.2, 120);
      blue.position.set(-16, 14, 18);
      scene.add(blue);
      var honey = new T.PointLight(0xf2a83b, 1.7, 120);
      honey.position.set(18, 10, -12);
      scene.add(honey);
      var rim = new T.DirectionalLight(0xffffff, 0.35);
      rim.position.set(4, 20, -18);
      scene.add(rim);

      var N = 560;
      var geo = new T.CylinderGeometry(0.5, 0.5, 1, 6);
      geo.translate(0, 0.5, 0);
      var mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.55, envMapIntensity: 1 });
      var mesh = new T.InstancedMesh(geo, mat, N);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      scene.add(mesh);

      function paint(light) {
        var cBase = new T.Color(light ? 0x9aa3b2 : 0xcfd6e2);
        var cBlue = new T.Color(light ? 0x0071e3 : 0x2997ff);
        var cHoney = new T.Color(light ? 0xd08a1e : 0xf2a83b);
        for (var i = 0; i < N; i++) {
          var r = (i * 37 % 101) / 101;
          var c = cBase.clone();
          if (r > 0.94) c.lerp(cHoney, 0.85);
          else if (r > 0.78) c.lerp(cBlue, 0.7);
          else c.multiplyScalar(light ? 0.9 + r * 0.25 : 0.55 + r * 0.4);
          mesh.setColorAt(i, c);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        scene.fog.color.set(light ? 0xffffff : 0x060709);
        mat.roughness = light ? 0.5 : 0.34;
        mat.metalness = light ? 0.25 : 0.55;
        blue.intensity = light ? 1.1 : 2.2;
        honey.intensity = light ? 0.9 : 1.7;
        rim.intensity = light ? 0.9 : 0.35;
      }
      paint(!!state.light);
      sceneThemeFn = paint;

      function V(x, y, z) { return new T.Vector3(x, y, z); }
      function rnd(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

      var forms = [[], [], [], [], []];
      var scales = [[], [], [], [], []];
      var COLS = 28;
      for (var i = 0; i < N; i++) {
        var col = i % COLS, row = Math.floor(i / COLS);
        var rows = Math.ceil(N / COLS);
        var hx = (col - (COLS - 1) / 2) * 1.16 + (row % 2 ? 0.58 : 0);
        var hz = (row - (rows - 1) / 2) * 1.0;
        forms[0].push(V(hx, 0, hz));
        scales[0].push(V(1, 0.5 + rnd(i) * 1.6, 1));
        var bx = (col - (COLS - 1) / 2) * 1.1;
        var bz = (row - (rows - 1) / 2) * 2.0;
        forms[1].push(V(bx, 0, bz));
        scales[1].push(V(0.62, 1 + rnd(i + 9) * 7 * (1 - row / rows * 0.5), 0.62));
        var t = i / N, phi = Math.acos(1 - 2 * t), th = Math.PI * (1 + Math.sqrt(5)) * i;
        var R = 11 + rnd(i + 3) * 2.4;
        forms[2].push(V(R * Math.sin(phi) * Math.cos(th), R * Math.cos(phi) * 0.7, R * Math.sin(phi) * Math.sin(th)));
        scales[2].push(V(0.5, 0.5 + rnd(i + 5) * 0.8, 0.5));
        var a2 = i * 0.16, hR = 7.5 + Math.sin(i * 0.05) * 1.6;
        forms[3].push(V(Math.cos(a2) * hR, (i / N) * 26 - 13, Math.sin(a2) * hR));
        scales[3].push(V(0.55, 0.9 + rnd(i + 11) * 1.4, 0.55));
        var ring = i % 5, idx = Math.floor(i / 5), per = Math.ceil(N / 5);
        var ra = (idx / per) * Math.PI * 2, rr = 4.5 + ring * 2.6;
        forms[4].push(V(Math.cos(ra) * rr, Math.sin(idx * 0.3 + ring) * 0.9, Math.sin(ra) * rr));
        scales[4].push(V(0.5, 0.7 + rnd(i + 17) * 1.1, 0.5));
      }

      var cams = [
        { p: V(0, 15, 26), l: V(0, 0, 0) },
        { p: V(-2, 11, 30), l: V(0, 3, 0) },
        { p: V(0, 4, 30), l: V(0, 0, 0) },
        { p: V(0, 2, 26), l: V(0, 0, 0) },
        { p: V(0, 18, 22), l: V(0, 0, 0) }
      ];

      function ease(t) { return t * t * (3 - 2 * t); }
      var m4 = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), scl = new T.Vector3();
      var a = new T.Vector3(), b = new T.Vector3(), sa = new T.Vector3(), sb = new T.Vector3();
      var camP = cams[0].p.clone(), camL = cams[0].l.clone();
      var ptr = { x: 0, y: 0, tx: 0, ty: 0 };
      window.addEventListener("pointermove", function (e) {
        ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });

      function resize() {
        var w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.fov = w < 760 ? 52 : 38;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener("resize", resize);

      var t0 = performance.now();
      function tick() {
        requestAnimationFrame(tick);
        var time = (performance.now() - t0) / 1000;
        var p = Math.min(0.9999, Math.max(0, state.scroll || 0));
        var seg = p * (forms.length - 1);
        var i0 = Math.floor(seg), i1 = Math.min(forms.length - 1, i0 + 1);
        var k = ease(seg - i0);

        for (var i = 0; i < N; i++) {
          a.copy(forms[i0][i]); b.copy(forms[i1][i]);
          pos.lerpVectors(a, b, k);
          sa.copy(scales[i0][i]); sb.copy(scales[i1][i]);
          scl.lerpVectors(sa, sb, k);
          var w = Math.sin(time * 0.9 + i * 0.21) * 0.5 + 0.5;
          scl.y *= 0.72 + w * 0.5;
          pos.y += Math.sin(time * 0.6 + i * 0.13) * 0.35 * (0.3 + k);
          m4.compose(pos, q, scl);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.rotation.y = time * 0.035 + p * 1.6;

        ptr.x += (ptr.tx - ptr.x) * 0.05;
        ptr.y += (ptr.ty - ptr.y) * 0.05;
        var cA = cams[i0], cB = cams[i1];
        camP.lerpVectors(cA.p, cB.p, k);
        camL.lerpVectors(cA.l, cB.l, k);
        camera.position.set(camP.x + ptr.x * 3.5, camP.y - ptr.y * 2.2, camP.z);
        camera.lookAt(camL);
        blue.position.set(Math.cos(time * 0.25) * 20, 14, Math.sin(time * 0.25) * 20);
        honey.position.set(Math.cos(time * 0.25 + Math.PI) * 20, 8, Math.sin(time * 0.25 + Math.PI) * 20);
        renderer.render(scene, camera);
      }
      tick();
    }
    start();
  })();

  // ---------- Backend: formulario de contacto ----------
  function setStatus(form, text, isError) {
    var el = form.querySelector("[data-form-status]");
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "#ff6961" : "#8fd19e";
  }

  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var fd = new FormData(contactForm);
      var payload = {
        name: fd.get("name"),
        email: fd.get("email"),
        message: fd.get("message"),
        company: fd.get("company") // honeypot
      };
      var btn = contactForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      setStatus(contactForm, "Enviando…", false);
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (r) {
          btn.disabled = false;
          if (r.ok) { setStatus(contactForm, "Listo, te contesto pronto.", false); contactForm.reset(); }
          else setStatus(contactForm, r.data.error || "No se pudo enviar.", true);
        }).catch(function () {
          btn.disabled = false;
          setStatus(contactForm, "No se pudo enviar. Escribime directo por correo.", true);
        });
    });
  }

  // ---------- Backend: modal de lista de espera / guías ----------
  var modal = document.getElementById("interest-modal");
  var interestForm = document.getElementById("interest-form");
  var currentInterest = null;

  function openModal(type, item) {
    currentInterest = { type: type, item: item };
    document.getElementById("interest-modal-eyebrow").textContent = type === "curso" ? "Curso" : "Guía gratis";
    document.getElementById("interest-modal-title").textContent = item;
    setStatus(interestForm, "", false);
    interestForm.reset();
    modal.classList.add("open");
  }
  function closeModal() {
    modal.classList.remove("open");
    currentInterest = null;
  }

  root.querySelectorAll(".interest-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.getAttribute("data-type"), btn.getAttribute("data-item"));
    });
  });
  var closeBtn = document.getElementById("interest-modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  if (interestForm) {
    interestForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!currentInterest) return;
      var fd = new FormData(interestForm);
      var payload = {
        type: currentInterest.type,
        item: currentInterest.item,
        email: fd.get("email"),
        company: fd.get("company")
      };
      var btn = interestForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      setStatus(interestForm, "Enviando…", false);
      fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (r) {
          btn.disabled = false;
          if (r.ok) { setStatus(interestForm, "Listo, te aviso apenas esté disponible.", false); }
          else setStatus(interestForm, r.data.error || "No se pudo registrar.", true);
        }).catch(function () {
          btn.disabled = false;
          setStatus(interestForm, "No se pudo registrar. Intenta de nuevo.", true);
        });
    });
  }

  // ---------- Capturas estáticas (img/) — se muestran solo si el archivo existe ----------
  Array.prototype.forEach.call(root.querySelectorAll("[data-dash-img][data-static-src]"), function (img) {
    var placeholder = img.parentElement.querySelector("[data-dash-placeholder]");
    img.onload = function () {
      img.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
    };
    img.src = img.getAttribute("data-static-src");
  });

  // ---------- Backend: capturas de dashboards Power BI ----------
  fetch("/api/dashboard").then(function (res) { return res.ok ? res.json() : null; }).then(function (data) {
    if (!data || !data.images) return;
    Object.keys(data.images).forEach(function (slot) {
      var url = data.images[slot];
      if (!url) return;
      var img = root.querySelector('[data-dash-img="' + slot + '"]');
      var placeholder = img && img.parentElement.querySelector("[data-dash-placeholder]");
      if (img) {
        img.src = url;
        img.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
      }
    });
  }).catch(function () {});
})();

/* Tablero interactivo: parque vehicular de Guatemala (INE/SAT, datos públicos) */
(function () {
  var root = document.getElementById("mercado");
  if (!root || !window.fetch) return;

  var C = { blue: "#2997ff", amber: "#f2a83b", muted: "#a1a1a6", grid: "rgba(255,255,255,0.07)", text: "#f5f5f7" };
  var PALETTE = ["#2997ff", "#f2a83b", "#5ac8fa", "#7b61ff", "#34c759", "#ff6b6b", "#a3b8cc", "#ffd166", "#64d2ff", "#bf5af2", "#30d158", "#ff9f0a"];
  var DEFAULTS = {
    "Moto": [2, 0.9, 260], "Trimoto": [3, 1.0, 300], "Automóvil": [4, 0.35, 650], "Pick up": [4, 0.4, 900],
    "Camioneta": [4, 0.35, 950], "Carga y transporte": [6, 0.6, 2200], "Otros": [4, 0.3, 500]
  };
  var D, charts = {};
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Math.round(n).toLocaleString("es-GT"); };
  var fmtQ = function (n) {
    if (n >= 1e6) return "Q" + (n / 1e6).toLocaleString("es-GT", { maximumFractionDigits: 1 }) + " M";
    return "Q" + fmt(n);
  };

  function state() {
    return {
      g: $("mk-tipo").value, dep: $("mk-depto").value,
      llantas: +$("mk-llantas").value || 0, recambio: +$("mk-recambio").value || 0,
      precio: +$("mk-precio").value || 0, part: (+$("mk-part").value || 0) / 100
    };
  }

  function rows(s) {
    var gi = D.grupos.indexOf(s.g);
    return D.municipios
      .filter(function (r) { return s.dep === "Todos" || r[0] === s.dep; })
      .map(function (r) { return { dep: r[0], mun: r[1], n: r[2 + gi] }; });
  }

  function baseOpts(horizontal) {
    return {
      responsive: true, maintainAspectRatio: false, indexAxis: horizontal ? "y" : "x",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return " " + fmt(c.parsed[horizontal ? "x" : "y"]); } } } },
      scales: {
        x: { grid: { color: horizontal ? C.grid : "transparent" }, ticks: { color: C.muted, font: { size: 11 } } },
        y: { grid: { color: horizontal ? "transparent" : C.grid }, ticks: { color: C.muted, font: { size: 11 } } }
      }
    };
  }

  function draw(key, cfg) {
    if (charts[key]) { charts[key].data = cfg.data; charts[key].options = cfg.options; charts[key].update(); return; }
    charts[key] = new Chart($(key), cfg);
  }

  function render() {
    var s = state(), gi = D.grupos.indexOf(s.g), rs = rows(s);
    var total = rs.reduce(function (a, r) { return a + r.n; }, 0);
    var nacional = D.municipios.reduce(function (a, r) { return a + r[2 + gi]; }, 0);
    // 2026 es un año parcial (corte en mayo): se excluye de la tendencia para no mostrar una caída falsa
    var cut = D.tendencia.years.indexOf(2026);
    var yrs = cut > -1 ? D.tendencia.years.slice(0, cut) : D.tendencia.years;
    var ser = D.tendencia.series[s.g].slice(0, yrs.length);
    var i24 = yrs.indexOf(2024), i25 = yrs.indexOf(2025);
    var crec = ser[i24] ? ser[i25] / ser[i24] - 1 : 0;
    var top = rs.slice().sort(function (a, b) { return b.n - a.n; });

    $("mk-k-total").textContent = fmt(total);
    $("mk-k-share").textContent = (nacional ? (total / nacional) * 100 : 0).toFixed(1) + " %";
    $("mk-k-lider").textContent = top[0] ? top[0].mun : "—";
    $("mk-k-crec").textContent = (crec >= 0 ? "+" : "") + (crec * 100).toFixed(1) + " %";

    // Top 10 territorios
    var byDep = {};
    if (s.dep === "Todos") rs.forEach(function (r) { byDep[r.dep] = (byDep[r.dep] || 0) + r.n; });
    var terr = s.dep === "Todos"
      ? Object.keys(byDep).map(function (k) { return { l: k, n: byDep[k] }; })
      : top.map(function (r) { return { l: r.mun, n: r.n }; });
    terr.sort(function (a, b) { return b.n - a.n; }); terr = terr.slice(0, 10);
    $("mk-t-top").textContent = s.dep === "Todos" ? "Top 10 departamentos" : "Top 10 municipios de " + s.dep;
    draw("mk-c-top", { type: "bar", options: baseOpts(true),
      data: { labels: terr.map(function (t) { return t.l; }), datasets: [{ data: terr.map(function (t) { return t.n; }), backgroundColor: C.blue, borderRadius: 6 }] } });

    // Tendencia
    draw("mk-c-trend", { type: "line", options: baseOpts(false),
      data: { labels: yrs, datasets: [{ data: ser, borderColor: C.amber, backgroundColor: "rgba(242,168,59,0.15)", fill: true, tension: 0.35, pointRadius: 2 }] } });

    // Marcas
    var mb = D.marcas[s.g], vals;
    if (s.dep === "Todos") {
      vals = mb.marcas.map(function (_, i) { return Object.keys(mb.porDepto).reduce(function (a, d) { return a + mb.porDepto[d][i]; }, 0); });
    } else vals = mb.porDepto[s.dep] || mb.marcas.map(function () { return 0; });
    var mk = mb.marcas.map(function (m, i) { return { m: m, n: vals[i] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 10);
    draw("mk-c-marcas", { type: "bar", options: baseOpts(true),
      data: { labels: mk.map(function (x) { return x.m; }), datasets: [{ data: mk.map(function (x) { return x.n; }), backgroundColor: PALETTE, borderRadius: 6 }] } });

    // Antigüedad (nacional)
    var ao = baseOpts(false); delete ao.scales; ao.plugins.legend = { display: true, position: "right", labels: { color: C.muted, boxWidth: 10, font: { size: 11 } } };
    ao.cutout = "62%";
    draw("mk-c-edad", { type: "doughnut", options: ao,
      data: { labels: D.antiguedad.labels, datasets: [{ data: D.antiguedad.series[s.g], backgroundColor: PALETTE, borderColor: "#0c0d10", borderWidth: 2 }] } });

    // Calculadora editable
    var unidades = total * s.llantas * s.recambio;
    var mercado = unidades * s.precio;
    $("mk-r-unid").textContent = fmt(unidades);
    $("mk-r-merc").textContent = fmtQ(mercado);
    $("mk-r-obj").textContent = fmtQ(mercado * s.part);
    $("mk-r-mes").textContent = fmtQ((mercado * s.part) / 12);
    var tb = top.slice(0, 8).map(function (r) {
      var m = r.n * s.llantas * s.recambio * s.precio;
      return "<tr><td>" + r.mun + (s.dep === "Todos" ? ' <span style="color:#6e6e73">· ' + r.dep + "</span>" : "") +
        "</td><td style='text-align:right'>" + fmt(r.n) + "</td><td style='text-align:right'>" + fmtQ(m) +
        "</td><td style='text-align:right;color:" + C.amber + "'>" + fmtQ(m * s.part) + "</td></tr>";
    }).join("");
    $("mk-tabla").innerHTML = tb;
  }

  function setDefaults() {
    var d = DEFAULTS[$("mk-tipo").value] || [4, 0.4, 500];
    $("mk-llantas").value = d[0]; $("mk-recambio").value = d[1]; $("mk-precio").value = d[2];
  }

  fetch("/data/parque-vehicular.json").then(function (r) { return r.json(); }).then(function (data) {
    D = data;
    if (window.Chart) { Chart.defaults.color = C.muted; Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Manrope',sans-serif"; }
    $("mk-tipo").innerHTML = D.grupos.map(function (g) { return "<option>" + g + "</option>"; }).join("");
    var deps = Array.from(new Set(D.municipios.map(function (r) { return r[0]; }))).sort();
    $("mk-depto").innerHTML = "<option>Todos</option>" + deps.map(function (d) { return "<option>" + d + "</option>"; }).join("");
    $("mk-fuente").textContent = D.fuente + " · " + fmt(D.total) + " vehículos registrados";
    setDefaults();
    $("mk-tipo").addEventListener("change", function () { setDefaults(); render(); });
    ["mk-depto", "mk-llantas", "mk-recambio", "mk-precio", "mk-part"].forEach(function (id) { $(id).addEventListener("input", render); });
    render();
  }).catch(function () {
    var w = $("mk-wrap"); if (w) w.innerHTML = '<p style="color:#a1a1a6">No se pudieron cargar los datos del tablero.</p>';
  });
})();

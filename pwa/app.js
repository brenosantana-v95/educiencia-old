(function () {
  "use strict";

  var CFG = window.AULAS_CONFIG || {};
  var REST = CFG.supabaseUrl + "/rest/v1/";
  var STORAGE_PUBLICO = CFG.supabaseUrl + "/storage/v1/object/public/materiais/";
  var CHAVE_VISTAS = "aulas.vistas.v1";
  var app = document.getElementById("app");
  var tituloTopo = document.getElementById("titulo-topo");
  var subtituloTopo = document.getElementById("subtitulo-topo");
  var btnVoltar = document.getElementById("btn-voltar");
  var dados = null;

  /* ---------- utilidades ---------- */

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") n.className = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (filhos || []).forEach(function (f) {
      n.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return n;
  }

  function urlSegura(u) {
    try {
      var url = new URL(u, location.href);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (e) {
      return null;
    }
  }

  function lerVistas() {
    try { return JSON.parse(localStorage.getItem(CHAVE_VISTAS)) || {}; } catch (e) { return {}; }
  }
  function gravarVistas(v) {
    try { localStorage.setItem(CHAVE_VISTAS, JSON.stringify(v)); } catch (e) { /* armazenamento indisponível */ }
  }

  function semAcento(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  /* ---------- telas ---------- */

  function cabecalho(titulo, subtitulo, comVoltar) {
    tituloTopo.textContent = titulo;
    subtituloTopo.textContent = subtitulo || "";
    btnVoltar.hidden = !comVoltar;
    document.title = titulo === "Aulas" ? "Aulas complementares" : titulo + " · Aulas";
  }

  function telaLista() {
    var curso = dados.curso;
    cabecalho(curso.titulo, curso.professor, false);
    var vistas = lerVistas();
    var total = dados.aulas.length;
    var feitas = dados.aulas.filter(function (a) { return vistas[a.id]; }).length;

    var busca = el("input", { class: "busca", type: "search", placeholder: "Buscar aula", "aria-label": "Buscar aula" });
    var progresso = el("p", { class: "progresso", text: feitas + " de " + total + " aulas assistidas" });
    var barra = el("div", { class: "barra" }, [el("span")]);
    barra.firstChild.style.width = (total ? Math.round((feitas / total) * 100) : 0) + "%";
    var lista = el("ul", { class: "lista" });

    function desenhar(filtro) {
      lista.textContent = "";
      var f = semAcento(filtro || "").trim();
      var achou = false;
      dados.aulas.forEach(function (a, i) {
        if (f && semAcento(a.titulo + " " + a.descricao).indexOf(f) === -1) return;
        achou = true;
        var card = el("a", { class: "card-aula" + (vistas[a.id] ? " vista" : ""), href: "#/aula/" + encodeURIComponent(a.id) }, [
          el("div", { class: "num", text: vistas[a.id] ? "✓" : String(i + 1) }),
          el("div", null, [
            el("h2", { text: a.titulo }),
            el("p", { text: a.descricao }),
            el("span", { class: "chip", text: a.duracao || "" })
          ])
        ]);
        lista.appendChild(el("li", null, [card]));
      });
      if (!achou) lista.appendChild(el("li", { class: "vazio", text: "Nenhuma aula encontrada." }));
    }
    busca.addEventListener("input", function () { desenhar(busca.value); });
    desenhar("");

    app.textContent = "";
    [busca, progresso, barra, lista].forEach(function (n) { app.appendChild(n); });
  }

  function montarPlayer(video, tituloAula) {
    var caixa = el("div", { class: "player" });
    var id = video && video.provedor === "youtube" ? String(video.id || "") : "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
      caixa.appendChild(el("div", { class: "player-aviso" }, [
        el("div", { text: "Esta aula ainda não tem vídeo." })
      ]));
      return caixa;
    }
    var capa = el("button", { class: "player-capa", type: "button", "aria-label": "Reproduzir vídeo: " + tituloAula }, [
      el("span", null, [el("span", { class: "play", text: "▶" }), "Toque para assistir"])
    ]);
    capa.addEventListener("click", function () {
      var iframe = el("iframe", {
        src: "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&modestbranding=1&playsinline=1&autoplay=1",
        title: tituloAula,
        allow: "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen",
        allowfullscreen: "",
        referrerpolicy: "strict-origin-when-cross-origin"
      });
      caixa.textContent = "";
      caixa.appendChild(iframe);
    });
    caixa.appendChild(capa);
    return caixa;
  }

  function listaMateriais(titulo, itens, rotuloTipo) {
    var sec = el("section", { class: "secao" }, [el("h3", { text: titulo })]);
    var validos = (itens || []).map(function (i) {
      return { titulo: i.titulo, href: urlSegura(i.url), rotulo: i.rotulo || rotuloTipo };
    }).filter(function (i) { return i.href; });
    if (!validos.length) {
      sec.appendChild(el("p", { class: "vazio", text: "Nada por aqui nesta aula." }));
      return sec;
    }
    validos.forEach(function (i) {
      sec.appendChild(el("a", { class: "item-link", href: i.href, target: "_blank", rel: "noopener noreferrer" }, [
        el("span", { text: i.titulo }),
        el("small", { text: i.rotulo })
      ]));
    });
    return sec;
  }

  function telaAula(id) {
    var idx = dados.aulas.findIndex(function (a) { return a.id === id; });
    if (idx === -1) { location.hash = "#/"; return; }
    var aula = dados.aulas[idx];
    cabecalho(aula.titulo, dados.curso.titulo, true);

    var meta = el("p", { class: "meta" });
    var btnVista = el("button", { class: "btn", type: "button" });
    function atualizarBotao() {
      var v = lerVistas()[aula.id];
      meta.textContent = (aula.duracao || "") + (v ? " · assistida" : "");
      btnVista.textContent = v ? "✓ Aula assistida" : "Marcar como assistida";
      btnVista.className = "btn" + (v ? " feito" : " primario");
    }
    btnVista.addEventListener("click", function () {
      var v = lerVistas();
      if (v[aula.id]) delete v[aula.id]; else v[aula.id] = true;
      gravarVistas(v);
      atualizarBotao();
    });
    atualizarBotao();

    var nav = el("div", { class: "nav-aulas" });
    if (idx > 0) nav.appendChild(el("a", { class: "btn", href: "#/aula/" + encodeURIComponent(dados.aulas[idx - 1].id), text: "← Anterior" }));
    if (idx < dados.aulas.length - 1) nav.appendChild(el("a", { class: "btn", href: "#/aula/" + encodeURIComponent(dados.aulas[idx + 1].id), text: "Próxima →" }));

    app.textContent = "";
    [
      montarPlayer(aula.video, aula.titulo),
      el("div", { class: "detalhe" }, [
        el("h2", { text: aula.titulo }),
        meta,
        el("p", { text: aula.descricao }),
        btnVista
      ]),
      listaMateriais("Materiais para baixar", aula.documentos, "Arquivo"),
      listaMateriais("Links úteis", aula.links, "Link"),
      nav
    ].forEach(function (n) { app.appendChild(n); });
  }

  function telaErro(msg) {
    cabecalho("Aulas", "", false);
    app.textContent = "";
    app.appendChild(el("p", { class: "vazio", text: msg }));
  }

  function telaIndisponivel(curso) {
    cabecalho((curso && curso.titulo) || "Aulas", (curso && curso.professor) || "", false);
    app.textContent = "";
    app.appendChild(el("p", { class: "indisponivel", role: "status", text: "Curso ainda não disponível" }));
  }

  /* ---------- rotas ---------- */

  function rotear() {
    if (!dados) return;
    var m = /^#\/aula\/(.+)$/.exec(location.hash);
    var idAula = null;
    if (m) {
      try { idAula = decodeURIComponent(m[1]); } catch (e) { location.hash = "#/"; return; }
    }
    if (idAula !== null) telaAula(idAula); else telaLista();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  btnVoltar.addEventListener("click", function () { location.hash = "#/"; });
  window.addEventListener("hashchange", rotear);

  /* ---------- dados (Supabase REST, só leitura com chave pública) ---------- */

  function api(caminho) {
    return fetch(REST + caminho, { headers: { apikey: CFG.supabaseKey, Accept: "application/json" }, cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); });
  }

  function tamanhoLegivel(b) {
    if (!b) return "Arquivo";
    var mb = b / 1048576;
    return mb >= 1 ? mb.toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  }

  function urlMaterial(caminho, titulo) {
    var nome = String(caminho).split("/").pop().replace(/^[0-9a-f-]{36}-/i, "");
    return STORAGE_PUBLICO + caminho.split("/").map(encodeURIComponent).join("/") +
      "?download=" + encodeURIComponent(nome || titulo);
  }

  function normalizar(curso, aulas) {
    return {
      curso: curso,
      aulas: aulas.map(function (a) {
        var rec = (a.recursos || []).slice().sort(function (x, y) { return x.ordem - y.ordem; });
        return {
          id: a.id,
          titulo: a.titulo,
          descricao: a.descricao || "",
          duracao: a.duracao || "",
          video: { provedor: "youtube", id: a.youtube_id || "" },
          links: rec.filter(function (r) { return r.tipo === "link"; })
            .map(function (r) { return { titulo: r.titulo, url: r.url }; }),
          documentos: rec.filter(function (r) { return r.tipo === "material" && r.storage_path; })
            .map(function (r) { return { titulo: r.titulo, url: urlMaterial(r.storage_path, r.titulo), rotulo: tamanhoLegivel(r.tamanho_bytes) }; })
        };
      })
    };
  }

  /* Curso desligado: apaga as aulas guardadas para uso offline. */
  function limparAulasEmCache() {
    if (!("caches" in window)) return;
    caches.keys().then(function (nomes) {
      nomes.filter(function (n) { return n.indexOf("aulas-dados-") === 0; }).forEach(function (n) {
        caches.open(n).then(function (c) {
          c.keys().then(function (reqs) {
            reqs.forEach(function (r) { if (r.url.indexOf("/rest/v1/aulas") !== -1) c.delete(r); });
          });
        });
      });
    }).catch(function () { /* ignora */ });
  }

  function carregar() {
    if (!/^https?:\/\//.test(CFG.supabaseUrl || "")) {
      telaErro("App ainda não configurado.");
      return;
    }
    api("config?select=curso_disponivel,titulo,professor,descricao&id=eq.1")
      .then(function (linhas) {
        var curso = linhas[0];
        if (!curso || !curso.curso_disponivel) {
          dados = null;
          telaIndisponivel(curso);
          limparAulasEmCache();
          return;
        }
        return api("aulas?select=id,titulo,descricao,duracao,youtube_id,recursos(tipo,titulo,url,storage_path,tamanho_bytes,ordem)&order=ordem.asc,created_at.asc")
          .then(function (aulas) { dados = normalizar(curso, aulas); rotear(); });
      })
      .catch(function () { telaErro("Não foi possível carregar as aulas. Verifique a conexão e tente de novo."); });
  }
  carregar();

  /* ---------- instalação ---------- */

  var btnInstalar = document.getElementById("btn-instalar");
  var promptInstalacao = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    promptInstalacao = e;
    btnInstalar.hidden = false;
  });
  btnInstalar.addEventListener("click", function () {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    promptInstalacao.userChoice.finally(function () {
      promptInstalacao = null;
      btnInstalar.hidden = true;
    });
  });
  window.addEventListener("appinstalled", function () { btnInstalar.hidden = true; });

  var avisoIos = document.getElementById("aviso-ios");
  var ehIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var jaInstalado = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  var avisoFechado = false;
  try { avisoFechado = localStorage.getItem("aulas.avisoIos") === "1"; } catch (e) { /* ignora */ }
  if (ehIos && !jaInstalado && !avisoFechado) avisoIos.hidden = false;
  document.getElementById("fechar-aviso-ios").addEventListener("click", function () {
    avisoIos.hidden = true;
    try { localStorage.setItem("aulas.avisoIos", "1"); } catch (e) { /* ignora */ }
  });

  /* ---------- rede e service worker ---------- */

  var toast = document.getElementById("status-rede");
  function atualizarRede() { toast.hidden = navigator.onLine; }
  window.addEventListener("online", atualizarRede);
  window.addEventListener("offline", atualizarRede);
  atualizarRede();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* sem offline, o app segue funcionando */ });
    });
  }
})();

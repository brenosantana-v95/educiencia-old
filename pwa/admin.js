(function () {
  "use strict";

  var CFG = window.AULAS_CONFIG || {};
  var BUCKET = "materiais";
  var LIMITE_ARQUIVO = 50 * 1024 * 1024;   /* plano gratuito: 50 MB por arquivo */
  var LIMITE_TOTAL = 1024 * 1024 * 1024;   /* plano gratuito: 1 GB no total */

  var painel = document.getElementById("painel");
  var statusEl = document.getElementById("status");
  var quem = document.getElementById("quem");
  var btnSair = document.getElementById("btn-sair");

  /* Convite e recuperação chegam com o tipo no endereço; guardar antes do SDK limpar. */
  var tipoLink = (/[#&?]type=(invite|recovery)/.exec(location.hash + location.search) || [])[1] || null;

  if (!window.supabase || !/^https?:\/\//.test(CFG.supabaseUrl || "")) {
    painel.textContent = "Painel ainda não configurado (config.js).";
    return;
  }
  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  /* ---------- utilidades ---------- */

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? "" : v);
      });
    }
    (filhos || []).forEach(function (f) {
      if (f) n.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return n;
  }

  function campo(rotulo, input) { return el("label", { class: "campo" }, [rotulo, input]); }

  var timerStatus = null;
  function avisar(msg, erro) {
    clearTimeout(timerStatus);
    statusEl.textContent = msg;
    statusEl.className = "status" + (erro ? " erro" : "");
    statusEl.hidden = false;
    if (!erro) timerStatus = setTimeout(function () { statusEl.hidden = true; }, 4000);
  }

  function falhou(e) {
    var msg = (e && (e.message || e.error_description)) || String(e);
    if (/row-level security|permission denied/i.test(msg)) msg = "Sem permissão. Entre de novo com a conta do administrador.";
    else if (/Failed to fetch|NetworkError/i.test(msg)) msg = "Sem conexão com o servidor. Tente de novo.";
    avisar("Erro: " + msg, true);
  }

  /* Lança o erro do Supabase, para usar em cadeias de promessas. */
  function ok(res) { if (res.error) throw res.error; return res.data; }

  function bytes(b) {
    if (!b) return "0 KB";
    var mb = b / 1048576;
    return mb >= 1 ? mb.toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  }

  function idYoutube(texto) {
    var s = String(texto || "").trim();
    if (!s) return "";
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    var id = null;
    try {
      var u = new URL(s);
      var h = u.hostname.replace(/^(www|m|music)\./, "");
      if (h === "youtu.be") id = u.pathname.split("/")[1];
      else if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) {
        id = u.searchParams.get("v") || (/^\/(embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname) || [])[2];
      }
    } catch (e) { /* não é URL */ }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  function nomeSeguro(nome) {
    var partes = String(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").split(".");
    var ext = partes.length > 1 ? partes.pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    var base = partes.join(".").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "arquivo";
    return base + (ext ? "." + ext : "");
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function confirmar(msg) { return window.confirm(msg); }

  /* Reescreve "ordem" conforme a posição na lista (0, 1, 2...). */
  function reordenar(tabela, itens) {
    return Promise.all(itens.map(function (it, i) {
      if (it.ordem === i) return null;
      it.ordem = i;
      return sb.from(tabela).update({ ordem: i }).eq("id", it.id).then(ok);
    }));
  }

  function mover(tabela, itens, i, delta, depois) {
    var j = i + delta;
    if (j < 0 || j >= itens.length) return;
    var copia = itens.slice();
    var t = copia[i]; copia[i] = copia[j]; copia[j] = t;
    reordenar(tabela, copia).then(depois).catch(falhou);
  }

  /* ---------- login ---------- */

  function telaLogin(msg) {
    btnSair.hidden = true;
    quem.textContent = "";
    var email = el("input", { type: "email", autocomplete: "username", required: true });
    var senha = el("input", { type: "password", autocomplete: "current-password", required: true });
    var form = el("form", { class: "caixa" }, [
      el("h2", { text: "Entrar" }),
      msg ? el("p", { class: "dica", text: msg }) : null,
      campo("E-mail", email),
      campo("Senha", senha),
      el("div", { class: "acoes" }, [
        el("button", { class: "btn primario", type: "submit", text: "Entrar" }),
        el("button", {
          class: "btn", type: "button", text: "Esqueci a senha",
          onclick: function () {
            if (!email.value) { avisar("Digite seu e-mail primeiro.", true); email.focus(); return; }
            sb.auth.resetPasswordForEmail(email.value, { redirectTo: location.origin + location.pathname })
              .then(ok)
              .then(function () { avisar("Se o e-mail estiver cadastrado, chega um link para criar nova senha."); })
              .catch(falhou);
          }
        })
      ])
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      sb.auth.signInWithPassword({ email: email.value.trim(), password: senha.value })
        .then(ok)
        .then(function () { senha.value = ""; iniciar(); })
        .catch(function (err) {
          if (/invalid login/i.test(err.message || "")) avisar("E-mail ou senha incorretos.", true);
          else falhou(err);
        });
    });
    painel.textContent = "";
    painel.appendChild(form);
    email.focus();
  }

  function telaNovaSenha() {
    var senha = el("input", { type: "password", autocomplete: "new-password", minlength: "8", required: true });
    var repetir = el("input", { type: "password", autocomplete: "new-password", minlength: "8", required: true });
    var form = el("form", { class: "caixa" }, [
      el("h2", { text: "Criar sua senha" }),
      el("p", { class: "dica", text: "Use pelo menos 8 caracteres. Guarde num gerenciador de senhas." }),
      campo("Nova senha", senha),
      campo("Repita a senha", repetir),
      el("button", { class: "btn primario", type: "submit", text: "Salvar senha" })
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (senha.value !== repetir.value) { avisar("As senhas não conferem.", true); return; }
      sb.auth.updateUser({ password: senha.value })
        .then(ok)
        .then(function () {
          tipoLink = null;
          history.replaceState(null, "", location.pathname);
          avisar("Senha salva.");
          iniciar();
        })
        .catch(falhou);
    });
    painel.textContent = "";
    painel.appendChild(form);
    senha.focus();
  }

  btnSair.addEventListener("click", function () {
    sb.auth.signOut().finally(function () { telaLogin(); });
  });

  /* ---------- painel ---------- */

  var estado = { config: null, aulas: [], usoTotal: 0 };

  function carregarTudo() {
    return Promise.all([
      sb.from("config").select("*").eq("id", 1).single().then(ok),
      sb.from("aulas").select("*, recursos(*)").order("ordem").order("created_at").then(ok)
    ]).then(function (r) {
      estado.config = r[0];
      estado.aulas = r[1].map(function (a) {
        a.recursos = (a.recursos || []).sort(function (x, y) { return x.ordem - y.ordem; });
        return a;
      });
      estado.usoTotal = 0;
      estado.aulas.forEach(function (a) {
        a.recursos.forEach(function (rc) { estado.usoTotal += rc.tamanho_bytes || 0; });
      });
    });
  }

  function telaPainel() {
    return carregarTudo().then(function () {
      painel.textContent = "";
      painel.appendChild(caixaCurso());
      painel.appendChild(caixaAulas());
    });
  }

  function caixaCurso() {
    var c = estado.config;
    var chave = el("input", { type: "checkbox", role: "switch", "aria-label": "Curso disponível" });
    chave.checked = c.curso_disponivel;
    var estadoTxt = el("span", { class: "estado" });
    function pintar() {
      estadoTxt.textContent = chave.checked ? "Ligado: alunos veem as aulas" : "Desligado: alunos veem “Curso ainda não disponível”";
    }
    pintar();
    chave.addEventListener("change", function () {
      var novo = chave.checked;
      chave.disabled = true;
      sb.from("config").update({ curso_disponivel: novo }).eq("id", 1).select().single().then(ok)
        .then(function (linha) { c.curso_disponivel = linha.curso_disponivel; avisar(novo ? "Curso ligado." : "Curso desligado."); })
        .catch(function (e) { chave.checked = !novo; falhou(e); })
        .finally(function () { chave.disabled = false; pintar(); });
    });

    var titulo = el("input", { type: "text", maxlength: "120", required: true, value: c.titulo });
    var professor = el("input", { type: "text", maxlength: "120", value: c.professor });
    var descricao = el("textarea", { maxlength: "2000" });
    descricao.value = c.descricao;

    var form = el("form", null, [
      campo("Nome do curso", titulo),
      campo("Professor", professor),
      campo("Descrição", descricao),
      el("button", { class: "btn", type: "submit", text: "Salvar dados do curso" })
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      sb.from("config").update({ titulo: titulo.value.trim(), professor: professor.value.trim(), descricao: descricao.value.trim() })
        .eq("id", 1).then(ok)
        .then(function () { avisar("Dados do curso salvos."); })
        .catch(falhou);
    });

    return el("section", { class: "caixa" }, [
      el("h2", { text: "Curso" }),
      el("label", { class: "chave" }, [el("span", null, ["Curso disponível", el("br"), estadoTxt]), chave]),
      el("h3", { text: "Dados" }),
      form
    ]);
  }

  function caixaAulas() {
    var lista = el("ul", { class: "linhas" });
    estado.aulas.forEach(function (a, i) {
      var nVideo = a.youtube_id ? "com vídeo" : "sem vídeo";
      lista.appendChild(el("li", { class: "linha" }, [
        el("div", { class: "texto" }, [
          (i + 1) + ". " + a.titulo,
          el("small", { text: nVideo + " · " + a.recursos.length + " materiais/links" })
        ]),
        el("button", { class: "btn mini", type: "button", "aria-label": "Subir " + a.titulo, text: "↑", disabled: i === 0,
          onclick: function () { mover("aulas", estado.aulas, i, -1, telaPainel); } }),
        el("button", { class: "btn mini", type: "button", "aria-label": "Descer " + a.titulo, text: "↓", disabled: i === estado.aulas.length - 1,
          onclick: function () { mover("aulas", estado.aulas, i, 1, telaPainel); } }),
        el("button", { class: "btn mini", type: "button", text: "Editar", onclick: function () { telaAula(a.id); } })
      ]));
    });
    if (!estado.aulas.length) lista.appendChild(el("li", { class: "vazio", text: "Nenhuma aula ainda." }));

    return el("section", { class: "caixa" }, [
      el("h2", { text: "Aulas" }),
      lista,
      el("div", { class: "acoes" }, [
        el("button", { class: "btn primario", type: "button", text: "+ Nova aula", onclick: function () { telaAula(null); } })
      ]),
      el("p", { class: "uso", text: "Arquivos enviados: " + bytes(estado.usoTotal) + " de 1 GB (plano gratuito)." })
    ]);
  }

  /* ---------- editar aula ---------- */

  function telaAula(id) {
    var a = id ? estado.aulas.filter(function (x) { return x.id === id; })[0] : null;
    if (id && !a) { telaPainel().catch(falhou); return; }

    var titulo = el("input", { type: "text", maxlength: "120", required: true, value: a ? a.titulo : "" });
    var descricao = el("textarea", { maxlength: "2000" });
    descricao.value = a ? a.descricao : "";
    var duracao = el("input", { type: "text", maxlength: "30", placeholder: "ex.: 15 min", value: a ? a.duracao : "" });
    var video = el("input", { type: "text", placeholder: "https://youtu.be/... ou ID", value: a && a.youtube_id ? "https://youtu.be/" + a.youtube_id : "" });
    var previa = el("div", { class: "previa", "aria-live": "polite" });
    function atualizarPrevia() {
      previa.textContent = "";
      var v = idYoutube(video.value);
      if (v === "") previa.appendChild(document.createTextNode("Sem vídeo."));
      else if (v === null) previa.appendChild(document.createTextNode("Link do YouTube não reconhecido."));
      else {
        previa.appendChild(el("img", { src: "https://i.ytimg.com/vi/" + v + "/mqdefault.jpg", alt: "" }));
        previa.appendChild(document.createTextNode("ID: " + v));
      }
    }
    video.addEventListener("input", atualizarPrevia);
    atualizarPrevia();

    var form = el("form", null, [
      campo("Título", titulo),
      campo("Descrição", descricao),
      campo("Duração", duracao),
      campo("Vídeo do YouTube (não listado)", video),
      previa,
      el("p", { class: "dica", text: "Cole o link do vídeo. No YouTube, deixe o vídeo como “Não listado” e com incorporação permitida." }),
      el("div", { class: "acoes" }, [
        el("button", { class: "btn primario", type: "submit", text: a ? "Salvar aula" : "Criar aula" }),
        el("button", { class: "btn", type: "button", text: "Voltar", onclick: function () { telaPainel().catch(falhou); } }),
        a ? el("button", { class: "btn perigo", type: "button", text: "Excluir aula", onclick: function () { excluirAula(a); } }) : null
      ])
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = idYoutube(video.value);
      if (v === null) { avisar("Link do YouTube não reconhecido.", true); video.focus(); return; }
      var dados = { titulo: titulo.value.trim(), descricao: descricao.value.trim(), duracao: duracao.value.trim(), youtube_id: v || null };
      var q = a
        ? sb.from("aulas").update(dados).eq("id", a.id).select().single()
        : sb.from("aulas").insert(Object.assign({ ordem: estado.aulas.length }, dados)).select().single();
      q.then(ok)
        .then(function (linha) { avisar(a ? "Aula salva." : "Aula criada. Agora adicione materiais e links."); return carregarTudo().then(function () { telaAula(linha.id); }); })
        .catch(falhou);
    });

    painel.textContent = "";
    painel.appendChild(el("section", { class: "caixa" }, [el("h2", { text: a ? "Editar aula" : "Nova aula" }), form]));
    if (a) {
      painel.appendChild(caixaMateriais(a));
      painel.appendChild(caixaLinks(a));
    }
    window.scrollTo(0, 0);
    titulo.focus();
  }

  function excluirAula(a) {
    if (!confirmar("Excluir a aula “" + a.titulo + "” com todos os materiais e links? Não dá para desfazer.")) return;
    var caminhos = a.recursos.filter(function (r) { return r.storage_path; }).map(function (r) { return r.storage_path; });
    var apagarArquivos = caminhos.length ? sb.storage.from(BUCKET).remove(caminhos).then(ok) : Promise.resolve();
    apagarArquivos
      .then(function () { return sb.from("aulas").delete().eq("id", a.id).then(ok); })
      .then(function () { avisar("Aula excluída."); return telaPainel(); })
      .catch(falhou);
  }

  function recarregarAula(id) {
    return carregarTudo().then(function () { telaAula(id); });
  }

  function linhaRecurso(a, lista, r, i, detalhe) {
    return el("li", { class: "linha" }, [
      el("div", { class: "texto" }, [r.titulo, el("small", { text: detalhe })]),
      el("button", { class: "btn mini", type: "button", "aria-label": "Subir " + r.titulo, text: "↑", disabled: i === 0,
        onclick: function () { mover("recursos", lista, i, -1, function () { return recarregarAula(a.id); }); } }),
      el("button", { class: "btn mini", type: "button", "aria-label": "Descer " + r.titulo, text: "↓", disabled: i === lista.length - 1,
        onclick: function () { mover("recursos", lista, i, 1, function () { return recarregarAula(a.id); }); } }),
      el("button", { class: "btn mini perigo", type: "button", text: "Excluir", onclick: function () { excluirRecurso(a, r); } })
    ]);
  }

  function excluirRecurso(a, r) {
    if (!confirmar("Excluir “" + r.titulo + "”?")) return;
    var arquivo = r.storage_path ? sb.storage.from(BUCKET).remove([r.storage_path]).then(ok) : Promise.resolve();
    arquivo
      .then(function () { return sb.from("recursos").delete().eq("id", r.id).then(ok); })
      .then(function () { avisar("Excluído."); return recarregarAula(a.id); })
      .catch(falhou);
  }

  function caixaMateriais(a) {
    var mats = a.recursos.filter(function (r) { return r.tipo === "material"; });
    var lista = el("ul", { class: "linhas" });
    mats.forEach(function (r, i) { lista.appendChild(linhaRecurso(a, mats, r, i, "Arquivo · " + bytes(r.tamanho_bytes))); });
    if (!mats.length) lista.appendChild(el("li", { class: "vazio", text: "Nenhum material." }));

    var titulo = el("input", { type: "text", maxlength: "200", placeholder: "ex.: Lista de exercícios" });
    var arquivo = el("input", { type: "file", accept: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.webp,.txt", required: true });
    var enviar = el("button", { class: "btn primario", type: "submit", text: "Enviar arquivo" });
    var form = el("form", null, [
      campo("Título do material", titulo),
      campo("Arquivo (até 50 MB)", arquivo),
      enviar
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = arquivo.files[0];
      if (!f) return;
      if (f.size > LIMITE_ARQUIVO) { avisar("Arquivo com " + bytes(f.size) + ". O limite é 50 MB.", true); return; }
      if (estado.usoTotal + f.size > LIMITE_TOTAL) { avisar("Espaço insuficiente: o total passaria de 1 GB. Exclua materiais antigos.", true); return; }
      var caminho = a.id + "/" + uuid() + "-" + nomeSeguro(f.name);
      enviar.disabled = true;
      enviar.textContent = "Enviando…";
      sb.storage.from(BUCKET).upload(caminho, f, { contentType: f.type || undefined, upsert: false }).then(ok)
        .then(function () {
          return sb.from("recursos").insert({
            aula_id: a.id, tipo: "material", titulo: titulo.value.trim() || f.name,
            storage_path: caminho, tamanho_bytes: f.size, ordem: mats.length
          }).then(function (res) {
            if (res.error) {
              /* não deixar arquivo órfão no Storage */
              return sb.storage.from(BUCKET).remove([caminho]).then(function () { throw res.error; });
            }
          });
        })
        .then(function () { avisar("Material enviado."); return recarregarAula(a.id); })
        .catch(function (err) {
          if (/mime type|not supported/i.test(err.message || "")) avisar("Tipo de arquivo não aceito. Use PDF, Word, PowerPoint, Excel, imagem, ZIP ou TXT.", true);
          else if (/exceeded|too large|maximum allowed size/i.test(err.message || "")) avisar("Arquivo maior que o limite de 50 MB.", true);
          else falhou(err);
        })
        .finally(function () { enviar.disabled = false; enviar.textContent = "Enviar arquivo"; });
    });

    return el("section", { class: "caixa" }, [
      el("h2", { text: "Materiais para baixar" }), lista, el("h3", { text: "Adicionar material" }), form,
      el("p", { class: "uso", text: "Uso total: " + bytes(estado.usoTotal) + " de 1 GB." })
    ]);
  }

  function caixaLinks(a) {
    var links = a.recursos.filter(function (r) { return r.tipo === "link"; });
    var lista = el("ul", { class: "linhas" });
    links.forEach(function (r, i) { lista.appendChild(linhaRecurso(a, links, r, i, r.url)); });
    if (!links.length) lista.appendChild(el("li", { class: "vazio", text: "Nenhum link." }));

    var titulo = el("input", { type: "text", maxlength: "200", required: true });
    var url = el("input", { type: "url", maxlength: "2000", required: true, placeholder: "https://..." });
    var form = el("form", null, [
      campo("Título do link", titulo),
      campo("Endereço", url),
      el("button", { class: "btn primario", type: "submit", text: "Adicionar link" })
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!/^https?:\/\//i.test(url.value.trim())) { avisar("O endereço precisa começar com https://", true); return; }
      sb.from("recursos").insert({ aula_id: a.id, tipo: "link", titulo: titulo.value.trim(), url: url.value.trim(), ordem: links.length })
        .then(ok)
        .then(function () { avisar("Link adicionado."); return recarregarAula(a.id); })
        .catch(falhou);
    });

    return el("section", { class: "caixa" }, [
      el("h2", { text: "Links úteis" }), lista, el("h3", { text: "Adicionar link" }), form
    ]);
  }

  /* ---------- início ---------- */

  function iniciar() {
    sb.auth.getSession().then(function (r) {
      var sessao = r.data && r.data.session;
      if (!sessao) { telaLogin(); return; }
      if (tipoLink) { telaNovaSenha(); return; }
      quem.textContent = sessao.user.email || "";
      btnSair.hidden = false;
      return sb.rpc("is_admin").then(ok).then(function (admin) {
        if (!admin) {
          return sb.auth.signOut().then(function () { telaLogin("Esta conta não tem acesso ao painel."); });
        }
        return telaPainel();
      });
    }).catch(falhou);
  }

  sb.auth.onAuthStateChange(function (evento) {
    if (evento === "PASSWORD_RECOVERY") { tipoLink = "recovery"; setTimeout(telaNovaSenha, 0); }
  });

  iniciar();
})();

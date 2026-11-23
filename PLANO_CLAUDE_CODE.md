# Plano para o Claude Code: app de aulas complementares

## 1. Objetivo

Criar um app instalável no celular (PWA) em que o aluno, sem login, acessa videoaulas, links e documentos complementares de cada aula. Em paralelo, comparar com uma versão feita no AppSheet.

Esta pasta já traz um protótipo funcional da PWA (`pwa/`) e um kit para o AppSheet (`appsheet/`). O trabalho do Claude Code é validar, evoluir e publicar o protótipo seguindo as fases abaixo.

## 2. Decisões de projeto

### 2.1 Onde hospedar os vídeos

| Opção | Custo | Privacidade | Observações |
|---|---|---|---|
| **YouTube "não listado" (escolhida para o protótipo)** | Gratuito | Quem tiver o link assiste. Não é privado de verdade | Player incorporado (`youtube-nocookie.com/embed/ID`), streaming adaptativo, sem peso no servidor |
| Vimeo | Gratuito limitado, pago para privacidade por domínio | Pode restringir ao domínio do app em planos pagos | Bom se o professor quiser controle de onde o vídeo toca |
| Servidor próprio (MP4) | Banda e armazenamento por conta do professor | Controlável | Pesado, sem streaming adaptativo. Não recomendado |
| Serviços de vídeo pagos (Cloudflare Stream, Bunny etc.) | Pago | Alta | Só se o conteúdo for restrito ou pago |

Regras do protótipo:
- O app guarda apenas o ID do vídeo (11 caracteres) em `pwa/data/aulas.json`.
- O iframe só é criado quando o aluno toca na capa. Isso evita carregar o YouTube em toda abertura.
- Incorporação pode estar desativada em vídeos de terceiros. O professor deve usar vídeos próprios ou com incorporação permitida.
- O YouTube pode exibir anúncios e sugestões. O parâmetro `rel=0` limita as sugestões aos vídeos do mesmo canal.

### 2.2 Onde ficam links e documentos

- **Links:** URLs externas (abrem em nova aba).
- **Documentos:** duas alternativas.
  - Arquivos na pasta `pwa/docs/` (entram no mesmo servidor, funcionam offline depois de abertos uma vez).
  - Arquivos no Google Drive com compartilhamento "qualquer pessoa com o link", referenciados por URL.
- Todo link é validado no app: só `http` e `https` são aceitos.

### 2.3 Acesso

- Fase 1 e 2: sem login, conteúdo aberto por link ou QR code.
- Progresso do aluno ("aula assistida") fica só no aparelho (`localStorage`). Não há conta nem coleta de dados.
- Login individual fica como evolução futura (seção 7).

### 2.4 Tecnologia

- HTML, CSS e JavaScript simples, sem framework e sem etapa de build. Facilita manter e publicar em qualquer hospedagem estática.
- Dados em um único arquivo JSON, editado pelo professor.

## 3. Estrutura de arquivos

```
prototipo/
├── PLANO_CLAUDE_CODE.md
├── pwa/
│   ├── index.html
│   ├── styles.css
│   ├── app.js                (rotas por hash, telas, instalação)
│   ├── sw.js                 (service worker: cache e offline)
│   ├── manifest.webmanifest
│   ├── data/aulas.json       (conteúdo)
│   ├── docs/                 (documentos de exemplo)
│   └── icons/                (192, 512 e maskable)
└── appsheet/
    ├── modelo_planilha_appsheet.xlsx
    └── GUIA_APPSHEET.md
```

## 4. Modelo de dados (`pwa/data/aulas.json`)

```json
{
  "curso": { "titulo": "", "professor": "", "descricao": "" },
  "aulas": [
    {
      "id": "aula-1",
      "titulo": "",
      "descricao": "",
      "duracao": "12 min",
      "video": { "provedor": "youtube", "id": "ID_DE_11_CARACTERES" },
      "links": [ { "titulo": "", "url": "https://..." } ],
      "documentos": [ { "titulo": "", "url": "docs/arquivo.pdf" } ]
    }
  ]
}
```

Regras: `id` único e sem espaços; `video.id` com 11 caracteres; URLs com `http`, `https` ou caminho relativo.

## 5. Telas

1. **Lista de aulas:** título do curso, busca (sem diferenciar acentos), barra de progresso, cartões com número, título, descrição e duração.
2. **Aula:** player com capa e botão de reproduzir, título e descrição, botão "Marcar como assistida", links, documentos e navegação anterior/próxima.
3. **Instalação:** botão "Instalar" quando o navegador permite (Android) e aviso de instruções no iPhone.
4. **Offline:** aviso quando o aparelho está sem conexão. A lista e as aulas já abertas continuam disponíveis.

## 6. Fases e critérios de aceite

### Fase 1: validar o protótipo (curto)
Tarefas:
1. Rodar `python3 -m http.server -d pwa 8000` e abrir em `http://localhost:8000`.
2. Substituir os `SUBSTITUIR_ID_AQUI` por IDs reais de vídeos do YouTube não listados.
3. Trocar os textos de exemplo pelo conteúdo real de 3 aulas.

Aceite:
- A lista mostra as aulas e a busca filtra.
- O vídeo toca dentro do app depois de tocar na capa.
- Links e documentos abrem.
- Sem erros no console do navegador.

### Fase 2: publicar e testar em aparelhos reais
Tarefas:
1. Publicar a pasta `pwa/` em hospedagem estática com HTTPS (GitHub Pages, Netlify ou Cloudflare Pages).
2. Gerar um QR code do endereço.
3. Testar em pelo menos um Android (Chrome) e um iPhone (Safari).

Aceite:
- Android: aparece "Instalar" e o app abre em tela cheia com ícone próprio.
- iPhone: "Adicionar à Tela de Início" funciona e o ícone aparece.
- Depois de aberto uma vez, a lista de aulas abre sem internet.
- Lighthouse (aba PWA do Chrome DevTools): sem pendências de instalação.

### Fase 3: robustez
Tarefas:
1. Versionar o cache do service worker (mudar `VERSAO` em `sw.js` a cada publicação).
2. Tratar vídeo indisponível ou incorporação bloqueada com mensagem e link "Assistir no YouTube".
3. Revisar acessibilidade: foco por teclado, contraste, rótulos, tamanho de toque mínimo de 44 px.
4. Adicionar um guia de instalação para os alunos (Android e iPhone), com imagens.

Aceite:
- Atualizar `aulas.json` e republicar aparece para o aluno na abertura seguinte.
- Vídeo bloqueado mostra a mensagem e o link alternativo.

### Fase 4: comparação com o AppSheet
Tarefas:
1. Seguir `appsheet/GUIA_APPSHEET.md` com os mesmos três conteúdos.
2. Testar instalação e abertura de vídeo em Android e iPhone.
3. Registrar tempo de montagem, fricção de instalação e experiência do vídeo.

Aceite: tabela comparativa preenchida e recomendação para o professor.

## 7. Evoluções possíveis (fora do protótipo)

- Planilha Google como fonte de conteúdo (o professor edita a planilha, o app lê).
- Login individual (Firebase Authentication) e lista de alunos autorizados.
- Notificações de novas aulas (exigem instalação no iPhone).
- Estatísticas simples de acesso, sem dados pessoais.
- Empacotar nas lojas via PWABuilder, se um dia for necessário.

## 8. Riscos e cuidados

- **Privacidade:** vídeo "não listado" não é privado. Se o conteúdo for restrito, usar outra solução.
- **iPhone:** a instalação é manual e o armazenamento pode ser limpo em sites pouco usados.
- **Direitos autorais:** incorporar apenas vídeos próprios ou com incorporação permitida.
- **Conteúdo de menores:** sem login, não há coleta de dados. Manter assim até haver decisão sobre privacidade (LGPD) junto à escola.

## 9. Comandos úteis

```bash
# servir localmente
python3 -m http.server -d pwa 8000

# validar JSON
python3 -c "import json; json.load(open('pwa/data/aulas.json'))"
```

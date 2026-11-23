# Guia: protótipo no AppSheet

Tempo estimado: 20 a 30 minutos. Não exige programação.

Os nomes de menus do AppSheet mudam de vez em quando. Se algum item não estiver onde está descrito aqui, procure pelo nome em português ou inglês dentro da mesma área.

## 1. Preparar a planilha

1. Envie `modelo_planilha_appsheet.xlsx` ao Google Drive.
2. Abra o arquivo e use **Arquivo > Salvar como Planilhas Google**.
3. A planilha tem duas abas de dados:
   - **Aulas**: ID, Ordem, Titulo, Descricao, Duracao, VideoURL, Publicada.
   - **Materiais**: ID, AulaID, Tipo (Link ou Documento), Titulo, URL.
4. Substitua os dados de exemplo (texto azul) pelos seus. Os links `SUBSTITUIR` são fictícios.

## 2. Criar o app

1. Acesse appsheet.com e entre com a conta Google.
2. **Create > App > Start with existing data** e escolha a planilha.
3. O AppSheet cria a tabela **Aulas**. Para adicionar a segunda: **Data > Tables > Add new table** e escolha a aba **Materiais**.

## 3. Ligar as tabelas

1. Em **Data > Columns > Materiais**, abra a coluna **AulaID**:
   - Type: **Ref**
   - Source table: **Aulas**
   - Marque **Is a part of?** (assim as aulas mostram seus materiais).
2. Em **Aulas**, confira os tipos: **VideoURL** como **Url**, **Ordem** como **Number**, **Publicada** como **Text** (ou Enum com Sim e Não).
3. Em cada tabela, defina **ID** como chave (**Key**) e **Titulo** como rótulo (**Label**).

## 4. Mostrar só aulas publicadas, em ordem

1. **Data > Slices > New slice**: tabela Aulas, nome `AulasPublicadas`, condição de linhas `[Publicada] = "Sim"`.
2. **UX > Views > New view**:
   - Nome: `Aulas`
   - Tabela: slice `AulasPublicadas`
   - Tipo: **Deck** (ou **Gallery**)
   - Sort by: **Ordem**, ascendente
   - Posição: **Primary navigation**

## 5. Tela da aula (vídeo, links e documentos)

1. Abra a view **Aulas_Detail** (criada automaticamente).
2. Ela mostra os campos da aula e, por causa da referência, a lista de **Materiais** relacionados.
3. Ajuste a ordem dos campos em **UX > Views > Aulas_Detail > Column order**.
4. Vídeo: o campo **VideoURL** vira um link. Ao tocar, o vídeo abre no YouTube (app ou navegador). Até onde sei, o AppSheet não reproduz vídeo do YouTube embutido na tela do app. Vale conferir nas opções de visualização da sua conta, mas conte com esse comportamento no protótipo.

## 6. Aluno sem login e só leitura

1. **Settings > Security > Require sign-in**: desative. O app fica acessível por link a quem o receber.
2. Em **Data > Tables**, para cada tabela, deixe **Are updates allowed?** como **Read-Only**. Assim os alunos não editam nada.
3. Atualizar conteúdo: o professor edita a planilha e, no app, toca em sincronizar (ou o app atualiza ao abrir).

Atenção: app público não é privado. Qualquer pessoa com o link vê as aulas. Planos e limites do AppSheet para apps públicos e número de usuários mudam, então confira os termos atuais antes de usar com uma turma inteira.

## 7. Instalar e testar no celular

1. **Share** (ícone no topo do editor) e copie o link de instalação.
2. Android: o link leva à Play Store para instalar o aplicativo **AppSheet**, e o app do professor abre dentro dele. Também é possível abrir no navegador sem instalar, e depois **Add Shortcut** no menu do app.
3. iPhone: a página de instalação recomenda baixar o aplicativo **AppSheet** pela App Store.
4. Teste em um Android e em um iPhone.

## O que esperar em relação à PWA

| Ponto | AppSheet | PWA |
|---|---|---|
| Tempo para montar | Rápido | Rápido com o protótipo pronto |
| Vídeo | Abre no YouTube | Toca dentro do app |
| Instalação | Aplicativo AppSheet intermediário | Direto do navegador |
| Visual | Padronizado | Livre |
| Edição de conteúdo | Planilha | Arquivo JSON (ou planilha, numa etapa futura) |

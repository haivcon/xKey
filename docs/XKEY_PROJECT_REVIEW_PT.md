# Relatório de Revisão do Projeto xKey

Data de Revisão: 2026-06-16
Versão Atual: 5.7.0
Escopo: código-fonte React/Vite, Capacitor Android, armazenamento, segurança, interface de usuário (UI), suporte multilíngue, build e direção do produto.

## 1. Propósito do Projeto

O xKey é um aplicativo de gerenciamento de cofre (vault) de carteiras Web3 com foco principal no uso offline (offline-first). O aplicativo permite aos usuários armazenar endereços de carteiras, chaves privadas, frases semente (seed phrases), notas, etiquetas, pastas, códigos QR, arquivos de backup `.xkey`, dados CSV e saldos de ativos localmente no dispositivo.

O objetivo central do xKey é ser um "cofre de chaves privadas" local, e não uma carteira de transações online. Os usuários podem usar o xKey para:

- Gerenciar várias carteiras Web3 em um cofre criptografado.
- Armazenar chaves privadas e frases semente em formato criptografado localmente.
- Criar novas carteiras, importar carteiras manualmente, gerar carteiras personalizadas (vanity) por prefixo/sufixo.
- Agrupar carteiras por pastas, etiquetas, redes, status fixado (pinned) ou saldos.
- Fazer backup/restaurar usando arquivos `.xkey` protegidos por senha.
- Exportar CSV quando houver necessidade de inventário ou auditoria.
- Verificar, exibir, compartilhar e baixar códigos QR para endereços ou dados da carteira.
- Rastrear saldos manualmente em unidades opcionais, como `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, pontos ou etiquetas personalizadas.
- Usar a Credencial de Dispositivo Android (Android Device Credential) para desbloquear o cofre com impressão digital, reconhecimento facial, PIN, senha ou padrão do dispositivo.

## 2. Pontos Fortes Atuais

### Segurança e Armazenamento

- Os dados da carteira são criptografados localmente, alinhando-se ao objetivo do cofre offline.
- Campos sensíveis, como chaves privadas e frases semente, são adicionalmente criptografados no nível do campo antes que toda a lista de carteiras seja criptografada.
- O Android nativo possui um plugin dedicado para Device Credential, utilizando o Android Keystore para envolver (wrap) a chave do cofre.
- `android:allowBackup="false"` está definido no AndroidManifest, reduzindo o risco de backups de dados do aplicativo não intencionais.
- Inclui mecanismos como bloqueio automático em caso de inatividade, limpeza automática da área de transferência, escudo de privacidade quando o aplicativo está inativo e solicitações de senha mestre ao visualizar dados sensíveis.
- Suporta limpeza/redefinição (wipe/reset) quando o cofre encontra um erro crítico.

### Experiência do Usuário

- A página inicial suporta um layout responsivo, com uma lista de carteiras em várias colunas em telas grandes e otimização para dispositivos móveis.
- Possui escala de exibição personalizável de 5% a 200%, adequada para dispositivos pequenos ou usuários que desejam visualizar mais dados.
- Fornece modos denso/compacto/ultra compacto para a lista de carteiras.
- Botões para copiar, QR, expandir carteira, adicionar carteira, ferramentas, pesquisa, filtro e classificação estão posicionados perto do fluxo de trabalho real.
- Possui uma pasta para carteiras personalizadas (vanity), etiquetas NEW, um anel brilhante para carteiras recém-criadas e navegação automática para a pasta que contém a nova carteira.
- O modal de edição de saldo inclui pesquisa, colar, copiar endereço, importar CSV, filtro e salvamento automático de rascunhos.
- Toasts/confirmações foram reformulados para parecerem mais profissionais e tendem a escalar de acordo com a proporção da tela.

### Recursos

- Criar carteiras regulares, importar manualmente e gerar carteiras personalizadas usando um worker dedicado.
- Backup `.xkey`, importação/exportação CSV, detector de duplicatas, análises, ferramentas avançadas.
- Transferência de QR code protegida por senha, scanner QR, compartilhamento/download de QR.
- Suporta redes populares: XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- Suporte multilíngue com 15 idiomas.
- A versão é obtida do `package.json`/informações do aplicativo nativo e exibida no aplicativo.

### Build e Android

- `npm run lint` é concluído com sucesso.
- `npm run build` é concluído com sucesso.
- `npx cap sync android` sincroniza com sucesso os ativos web para o Android.
- A versão atual do Android é `versionName "5.7.0"` e `versionCode 57`.
- O `.gitignore` exclui adequadamente `1/`, artefatos de build, segredos de assinatura, `.xkey`, APK/AAB e arquivos locais.

## 3. Fraquezas e Possíveis Problemas

### Alto Nível

1. As dependências têm avisos de segurança do `npm audit`.

   Executar `npm audit --omit=dev` relata:

   - `vite 8.0.0 - 8.0.15`: gravidade alta, relacionado ao caminho do Windows/UNC no servidor de desenvolvimento.
   - `ws` via `ethers`: gravidade alta/moderada. `npm audit fix --force` sugere o rebaixamento do `ethers` para a versão principal 5, o que pode causar alterações de quebra (breaking changes).

   Recomendação: Atualize o Vite com segurança dentro da faixa de patch/minor primeiro. Para `ethers/ws`, verifique se há uma versão mais recente do `ethers` ou anule (override) `ws` se for suportado upstream; evite usar `--force` cegamente.

2. A versão de lançamento do Android não ativou shrink/minify.

   `android/app/build.gradle` atualmente tem `release { minifyEnabled false }`. Isso não causa o travamento do aplicativo, mas torna o APK/AAB mais fácil de ser submetido à engenharia reversa e aumenta seu tamanho.

   Recomendação: Tente ativar o R8/ProGuard para o lançamento, adicione regras de manutenção (keep rules) para o Capacitor/plugins, se necessário, e teste exaustivamente antes da publicação.

3. A chave AES de fallback ainda é armazenada nas Preferências.

   O código atualmente armazena `xkey_aes_fallback` para recuperação ou compatibilidade web/fallback. Esta é uma compensação para reduzir o risco de perda do cofre ao alterar os métodos de bloqueio do dispositivo, mas, em termos de segurança nativa do Android, é mais fraco do que manter a chave apenas no Keystore.

   Recomendação: Separe claramente os dois modos:
   - Modo Seguro do Android: A chave só é desembrulhada (unwrapped) através do Keystore/credencial do dispositivo.
   - Modo de Compatibilidade: Mantém a chave de fallback, exibindo um aviso claro ao usuário.

4. Algumas traduções secundárias ainda contêm strings em inglês.

   Verificações automáticas mostram que muitas localidades, como `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th`, ainda têm strings como `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics`.

   Recomendação: Crie um script de verificação i18n na CI para falhar o build quando uma localidade não possuir chaves ou ainda tiver chaves brutas importantes.

### Nível Médio

1. Localidades com falta de chaves em vários idiomas.

   Comparado a `en.js`, a maioria das localidades, exceto `vi`, carecem de:
   - `common.warning`
   - `createWallet.vanityLongTitle`

   Como o `LanguageContext` faz o fallback para o inglês, o aplicativo não falha, mas a experiência multilíngue fica incompleta.

2. `chainBulk` é uma chave extra em muitas localidades.

   Muitas localidades têm o grupo `chainBulk.*`, mas `en.js` não. Estas podem ser chaves legadas ou não sincronizadas. Embora não causem erros diretos, dificultam o gerenciamento das traduções.

3. O modo passphrase AES do CryptoJS não é o padrão de criptografia mais moderno.

   `CryptoJS.AES.encrypt(data, key)` funciona, mas não é tão explícito quanto um modelo padrão com tags dedicadas salt/KDF/IV/auth. AES-GCM ou WebCrypto seriam mais fáceis de auditar.

   Recomendação a longo prazo: Migre o formato do cofre para WebCrypto AES-GCM, com parâmetros PBKDF2/Argon2id explicitamente definidos, cargas úteis versionadas e tags de autenticação obrigatórias.

4. A senha mestre usa PBKDF2 com 10.000 iterações.

   Este nível é um pouco baixo para os padrões atuais na proteção de dados sensíveis. Embora seja uma senha secundária para visualizar chaves privadas/seeds e não a chave principal do cofre, ela ainda deve ser aumentada.

   Recomendação: Aumente as iterações com base em benchmarks de dispositivos e armazene o hash da versão para que as migrações não corrompam os dados antigos.

5. A limpeza automática da área de transferência não é totalmente garantida em todas as plataformas.

   O código verifica se a área de transferência ainda retém o valor correto antes de limpá-la, o que é uma boa abordagem. No entanto, o Android/navegadores podem restringir as gravações na área de transferência quando não forem acionadas por um gesto do usuário.

   Recomendação: Descreva claramente na interface do usuário que "o xKey tentará limpar a área de transferência se o sistema operacional permitir", sem fazer promessas absolutas.

6. Falta de testes automatizados práticos.

   O projeto tem linting e compilação, mas carece de testes unitários/e2e para fluxos críticos como desbloqueio, importar/exportar, criação de carteira vanity, edição de saldo, operações da área de transferência e i18n.

   Recomendação: Adicione testes de fumaça (smoke tests) usando Playwright para web e uma lista de verificação para instrumentação no Android/testes de lançamento manual.

### Nível Baixo

1. `console.error` permanece em alguns lugares.

   Não é crítico, mas deve ser agrupado em um logger ou ambiente de desenvolvimento apenas (dev-only) para evitar o vazamento de pilhas de rastreamento (stacks) desnecessárias na produção.

2. O Vite adverte sobre pedaços (chunks) grandes.

   Os chunks `index` e `scan` são grandes. Isso não é um erro em tempo de execução, mas pode atrasar o carregamento do aplicativo em dispositivos de baixo desempenho.

   Recomendação: Carregamento lento (Lazy load) para o scanner QR, caminhos pesados do ethers, ferramentas avançadas e exibições mais profundas do painel.

3. Alguns elementos da interface do usuário podem quebrar em escalas muito baixas ou muito altas.

   O aplicativo lida bem com a escala em muitas áreas, mas modais grandes, códigos QR, formulários densos, planilhas inferiores (bottom sheets) e cartões de carteira ainda precisam de testes em 5%, 50%, 75%, 100%, 150% e 200%.

## 4. Avaliação de Grupo de Recursos

### Segurança de Desbloqueio

A abordagem da Credencial de Dispositivo Android está correta, pois permite que o sistema operacional lide com biometria e fallback para PIN/senha/padrão. O risco principal está na migração entre o mecanismo de PIN antigo, chaves de fallback e chaves Keystore.

Recomendações:
- Forneça uma tela "Status de Segurança do Cofre": Android Secure, Web Fallback, Compatibility, requer configuração de bloqueio de dispositivo.
- Se uma chave invalidada for detectada, não gere automaticamente uma nova chave de cofre se o cofre antigo ainda contiver texto cifrado; em vez disso, oriente o usuário para a recuperação/limpeza (wipe).
- Registre o status interno de desbloqueio sem registrar dados confidenciais.

### Geração de Carteiras Vanity

Usar um worker separado é a abordagem correta, pois evita que a interface do usuário congele. Atualizações recentes, como a quantidade de carteiras, o salvamento automático na pasta, a pausa do bloqueio automático durante a geração, limites de tempo e avisos sobre padrões muito longos, são razoáveis.

Recomendações:
- Exibir claramente a probabilidade/tempo estimado com base no comprimento do padrão.
- Permitir pausar/retomar/parar o trabalho.
- Salvar um histórico dos trabalhos gerados para que os usuários saibam quais carteiras vieram de qual lote.
- Fornecer fortes avisos para padrões excessivamente longos no celular.

### Edição de Saldo de Ativos

O fluxo de trabalho atual é adequado para usuários que verificam endereços em exploradores de bloco e, em seguida, inserem os saldos manualmente. Os pontos fortes incluem pesquisa, copiar endereço, colar, filtro, suporte CSV e salvamento automático de rascunhos.

Recomendações:
- Adicionar um modo de "verificação passo a passo": a tela mostra 1 carteira por vez, endereço completo, botão de cópia, link para o explorador por rede e um grande campo de entrada.
- Permitir marcar como "verificado" para evitar pular entradas.
- Permitir importações CSV com as colunas `address,balance,unit,network`.
- Adicionar um recurso de desfazer (undo) para a última edição.

### Multilíngue

O fallback para o inglês evita que a interface quebre, mas um produto direcionado a um público internacional requer um controle de tradução mais rígido.

Recomendações:
- Crie um script `npm run i18n:check`.
- Relatar chaves ausentes, chaves extras e chaves de tradução brutas na UI.
- Priorize traduções precisas para grupos de segurança, backup, wipe, chaves privadas e seed phrase.

### Lançamento do Android

A configuração atual é suficiente para compilar e sincronizar, mas o endurecimento (hardening) do lançamento é deficiente.

Recomendações:
- Ative o minify para o lançamento após os testes.
- Adicione uma etapa na CI `npm audit --omit=dev` com uma lista de permissões clara (allowlist).
- Crie o APK/AAB através do GitHub Actions no envio de tags (tag pushes).
- Mantenha notas de versão no repositório.

## 5. Ideias Propostas de Atualização

### Curto Prazo

- Corrigir todas as chaves de tradução ausentes: `common.warning`, `createWallet.vanityLongTitle`.
- Limpar as strings em inglês remanescentes em outras localidades.
- Adicionar um script de verificação i18n na CI.
- Atualizar o Vite para resolver o aviso atual.
- Adicionar uma página "Status de Segurança" nas configurações.
- Adicionar uma nota clara indicando que a limpeza automática da área de transferência é um esforço melhor possível (best-effort).
- Adicionar um botão "Abrir no explorador" por rede no modal de edição de saldo.
- Adicionar barras de notificação de desfazer (undo snackbars) para exclusão de carteira, edições de saldo e alterações de pasta.

### Médio Prazo

- Migrar o formato de criptografia para WebCrypto AES-GCM versionado.
- Separar o Modo Seguro do Android do Modo de Compatibilidade.
- Adicionar testes de fumaça Playwright para fluxos principais.
- Carregamento lento de scanner/análises/ferramentas avançadas para reduzir o tamanho inicial do bundle.
- Adicionar importação/exportação de configurações que exclua dados sensíveis.
- Adicionar modo "Auditoria do Cofre": carteiras sem backups, endereços duplicados, redes ausentes, nomes ausentes ou chaves privadas que não correspondem aos endereços.

### Longo Prazo

- Criar um guia oficial de recuperação para cenários como troca de dispositivos, alteração dos bloqueios de tela, perda da biometria ou perda dos arquivos `.xkey`.
- Adicionar transferência multi-dispositivos criptografada através de códigos QR com várias partes ou arquivos temporários.
- Adicionar uma opção apenas apoiada por hardware (hardware-backed-only) para usuários com altos requisitos de segurança.
- Adicionar validação de endereço via checksum/rede.
- Fornecer modelos de backup em papel: endereço, rede, notas, excluindo chaves privadas se o usuário escolher.
- Melhor suporte Desktop/PWA para usar o xKey como cofre offline em computadores.

## 6. Direção Futura do Produto

O xKey deve seguir o caminho de um "cofre offline profissional para usuários com muitas carteiras". Não deve ser convertido prematuramente em uma carteira de transações online, pois isso aumenta os riscos de segurança, a dependência de RPC, os vetores de phishing, as responsabilidades de assinatura de transações e a superfície de ataque.

Direção Adequada:
1. Priorizar a segurança de dados: backup, restauração, migração, avisos claros, auditoria do cofre.
2. Priorizar o gerenciamento rápido de várias carteiras: pastas, etiquetas, filtros, edições em lote, CSV, QR, geração vanity.
3. Priorizar os recursos nativos do Android: Credenciais de Dispositivo, Keystore, gerenciamento da área de transferência, seletor de arquivos, compartilhar/baixar QR.
4. Priorizar a UI densa mas clara: escala, modo compacto, layout responsivo em tablet, toasts rápidos, modais não bloqueadores.
5. Priorizar a transparência: Status de Segurança, notas da versão, versão explícita no app, guias de backup e wipe.

## 7. Conclusão

O projeto tem uma base muito sólida: possui muitos recursos, uma abordagem "offline-first" clara, a integração da Credencial Android está correta, a interface de usuário está altamente otimizada para dispositivos móveis e tablets e inclui um amplo conjunto de ferramentas para gerenciar as carteiras.

A principal prioridade para avançar não é adicionar dezenas de novos recursos, mas sim garantir que seja "difícil o app dar erro" (harder to break):
- Concluir a implementação da i18n.
- Endurecer o lançamento do Android.
- Esclarecer o modelo de segurança Keystore/fallback.
- Adicionar testes automatizados para fluxos vitais.
- Controlar a auditoria de dependência.
- Padronizar o formato de criptografia em longo prazo.

Ao realizar isso, o xKey pode se transformar numa das ferramentas mais confiáveis de gerenciamento e armazenamento de várias carteiras para a Web3.

# Levô Entregador — app Android

Casca nativa em volta de `/m/{token}`, a mesma tela que roda no navegador.

## Por que ele existe

Só por uma coisa: **posição com a tela apagada.** Site não faz isso, e o celular
do motoboy passa o turno apagado no bolso ou preso no guidão. Todo o resto — a
lista de paradas, o botão de entregue, o mapa — continua sendo web.

Isso é uma decisão de manutenção, não de gosto. O que está em Kotlin só muda
quando cada motoboy reinstala o APK. O que está na web muda no deploy. Por isso
a parte nativa é minúscula e deve continuar assim: WebView, serviço de
localização, e a ponte entre os dois.

## Como a página conversa com o app

A ponte se chama `LevoApp` e tem três métodos. A página os usa se existirem, e
ignora se não — é o mesmo código no navegador e aqui.

| Método | Quando |
|---|---|
| `rastrear(token)` | rota passou a `IN_PROGRESS` |
| `parar()` | rota saiu de `IN_PROGRESS` |
| `temPermissao()` | para a página mostrar o estado real |

Dentro do app, a página **desliga** o próprio `watchPosition`: o serviço nativo
já manda posição, e ligar os dois acenderia o GPS duas vezes pelo mesmo dado.

O serviço posta em `POST /api/driver/ping` com `{token, lat, lng, at}` — o mesmo
endereço que a web já usa. Nada muda no servidor.

## Compilar

```
./gradlew assembleDebug     # APK de teste
./gradlew bundleRelease     # AAB assinado, para a Play Store
./gradlew assembleRelease   # APK assinado, para distribuir por fora
```

A Play Store quer o **AAB** (`bundleRelease`), não o APK. O APK serve para
instalar direto, pelo Drive.

## A chave de assinatura

**Já foi criada**, em `android/levo-upload.jks`, com o alias `levo`.

Ela e a senha **não estão no Git** — nem podem estar. Então, ao trocar de
máquina, clonar o repositório NÃO traz a chave:

1. Copie `levo-upload.jks` à mão (pendrive, AirDrop, gerenciador de senhas com
   anexo — não por e-mail nem chat).
2. Na outra máquina, crie `android/keystore.properties` a partir do
   `keystore.properties.exemplo` e preencha a senha.

O Gradle lê esse arquivo sozinho. Sem ele, o build de release sai **sem
assinatura** em vez de quebrar — quem só quer compilar para testar não precisa
da chave.

Perder a chave dá trabalho, mas com o Play App Signing é recuperável pelo
Google: esta é a chave de *envio*, e a definitiva fica com eles.

### As duas impressões digitais

O `assetlinks.json` aceita mais de uma, e você vai precisar das duas:

- **Da loja:** a que o Console mostra em *Configuração → Integridade do app →
  Assinatura de apps*. É ela que vale para quem instalar pela Play Store.
- **Do APK distribuído por fora** (Drive): a desta chave aqui, que sai com
  `keytool -list -v -keystore levo-upload.jks -alias levo | grep SHA256`.

Sem a impressão certa, o link do WhatsApp não abre no app: o Android mostra o
seletor "abrir com", o motoboy escolhe o navegador uma vez, e o app nunca mais
é usado.

## Montar o ambiente numa máquina nova

```bash
brew install --cask android-commandlinetools   # ~156 MB
brew install openjdk@17                        # se ainda não tiver
sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"
```

Reserve **uns 4 GB livres**: o que engorda não são as ferramentas, é o cache de
dependências do Gradle (~1,5 GB), e ele não avisa antes — quebra no meio.

O `gradlew` **não está no repositório**. Abra a pasta `android/` no Android
Studio e ele gera o wrapper na primeira sincronização; ou instale o Gradle e
rode `gradle wrapper` uma vez.

## Distribuir pelo Drive, antes da loja

Suba o `app-release.apk` e mande o link. O motoboy vai ver um aviso de "app não
verificado" — é normal em instalação fora da loja, e ele precisa autorizar a
origem uma vez. Vale mandar junto um passo a passo curto, com print.

## As três armadilhas que só aparecem no celular

Nenhuma delas dá erro de compilação. Todas derrubam o rastreio em silêncio.

**1. O fabricante mata o serviço.** Xiaomi, Motorola e Samsung encerram apps em
segundo plano por conta própria, e cada uma esconde o ajuste num lugar
diferente — "início automático", "sem restrições", "não otimizar". É a causa
número um de app de rastreio falhar no Brasil. `Permissoes.abrirEconomiaDeBateria`
leva até a lista do sistema, que é a única porta comum; o resto é instrução
escrita, marca por marca.

**2. "Permitir o tempo todo" não sai numa caixa de diálogo.** Do Android 11 em
diante o sistema só concede localização em segundo plano se a pessoa for até as
Configurações e escolher lá. O app pede a permissão comum primeiro e só depois
explica a segunda — pedir as duas juntas faz o Android negar as duas calado.

**3. Sem a permissão de notificação, não há serviço.** Android 13+ exige
autorização até para a notificação fixa, e sem ela o serviço de primeiro plano
não se sustenta.

## Quando for para a Play Store

- **Nível de API alvo.** A exigência sobe todo agosto e app novo abaixo do
  mínimo é recusado no envio, não na revisão. Confira o número atual no Console
  antes de gerar o pacote.
- **Localização em segundo plano é permissão sensível.** Exige formulário de
  declaração e **vídeo** mostrando o uso dentro do app. O que a revisão quer ver
  é a notificação fixa aparecendo e o motoboy sabendo que está sendo rastreado —
  as duas coisas já estão implementadas, então grave exatamente isso.
- **Evite pedir isenção de bateria direto.** `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
  é restrita e costuma ser recusada. O app leva a pessoa até a lista do sistema,
  que consegue o mesmo sem arriscar a publicação.
- **Política de privacidade** é obrigatória e já existe em `/privacidade`.

## O que não foi testado

Nada disso rodou em aparelho. O projeto foi escrito sem Android Studio na
máquina, então não houve compilação nem execução. As três armadilhas acima, em
especial, só se confirmam com um celular na mão e a tela apagada por uns bons
minutos.

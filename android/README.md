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

Precisa do Android Studio (SDK 36). O wrapper do Gradle vem incompleto de
propósito: abra a pasta `android/` no Android Studio e ele completa sozinho na
primeira sincronização.

```
./gradlew assembleDebug     # APK de teste
./gradlew assembleRelease   # APK assinado, para distribuir
```

## A chave de assinatura — faça isso antes do primeiro envio

**Ela é definitiva.** Publicou com uma chave, é aquela para sempre; perdeu a
chave, perdeu o app e precisa republicar com outro nome de pacote. O mesmo vale
para o `applicationId` (`br.com.levo.entregador`), que também não muda depois do
primeiro envio.

```bash
keytool -genkey -v -keystore levo-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias levo
```

Guarde o `.jks` e a senha **fora do repositório** e com cópia em outro lugar.
Se for usar o Play App Signing, essa vira a chave de *upload* — o Google guarda
a de assinatura, o que reduz o risco, mas a de upload ainda precisa sobreviver.

Depois, pegue a impressão digital:

```bash
keytool -list -v -keystore levo-release.jks -alias levo | grep SHA256
```

e cole em `public/.well-known/assetlinks.json`, no lugar do texto
`PREENCHER`. **Sem esse passo o link do WhatsApp não abre no app** — o Android
mostra o seletor "abrir com", o motoboy escolhe o navegador uma vez, e o app
nunca mais é usado. Se for usar Play App Signing, a impressão que vale é a que
o Console mostra, não a da sua chave local.

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

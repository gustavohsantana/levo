package br.com.levo.entregador

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.view.View
import android.webkit.GeolocationPermissions
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import br.com.levo.entregador.databinding.ActivityMainBinding

/**
 * A tela unica: a mesma pagina web que roda no navegador.
 *
 * Nada de interface nativa aqui de proposito. Botao desenhado em Kotlin so muda
 * quando cada motoboy reinstala o APK; botao desenhado na web muda no deploy. O
 * app existe pelo que a web nao faz — posicao com a tela apagada — e nao para
 * refazer o que ela ja faz bem.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val pedirPermissoes = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { concedidas ->
        val temLocalizacao = concedidas.entries.any {
            it.key.contains("LOCATION") && it.value
        }
        if (temLocalizacao) {
            Sessao.token(this)?.let { RastreioService.comecar(this, it) }
            /*
             * O segundo plano vem depois, e em outra tela.
             *
             * Pedir os dois de uma vez faz o Android negar os dois em silencio.
             * E preciso ter a localizacao comum concedida antes de sequer poder
             * pedir "o tempo todo".
             */
            if (!Permissoes.temSegundoPlano(this)) explicarSegundoPlano()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        afastarDasBarrasDoSistema()
        configurarWebView()
        abrir(intent)
        cuidarDoBotaoVoltar()
    }

    /**
     * Devolve a pagina o espaco que as barras do sistema ocupam.
     *
     * A partir da API 35 — e o app mira a 36 — o Android desenha a janela de
     * ponta a ponta e ignora `android:statusBarColor`. Sem tratar isso, a pagina
     * inteira sobe: o nome da loja fica atras do relogio, e o "Entreguei", que e
     * o botao pelo qual o app existe, fica atras da barra de gestos. Ninguem ve
     * erro nenhum; so parece que a tela foi desenhada torta.
     *
     * `fitsSystemWindows` no XML era o mecanismo de antes, e sob a borda-a-borda
     * forcada ele nao e confiavel. Aplicar a margem aqui deixa explicito o que
     * antes dependia do comportamento padrao de cada versao.
     *
     * O teclado entra na mesma conta: `adjustResize` tambem deixa de encolher a
     * janela sozinho quando a decoracao para de reservar espaco.
     */
    private fun afastarDasBarrasDoSistema() {
        WindowCompat.setDecorFitsSystemWindows(window, false)

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, janela ->
            val margens = janela.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    or WindowInsetsCompat.Type.displayCutout()
                    or WindowInsetsCompat.Type.ime(),
            )
            view.setPadding(margens.left, margens.top, margens.right, margens.bottom)
            janela
        }
    }

    /**
     * `singleTask`: o link do WhatsApp chega aqui com o app ja aberto.
     *
     * Sem isto o Android empilharia uma segunda copia da tela, e o motoboy
     * ficaria com duas rotas abertas — a velha por baixo, viva, ainda mandando
     * posicao.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        abrir(intent)
    }

    private fun abrir(intent: Intent?) {
        val doLink = Sessao.tokenDaUrl(intent?.dataString)
        val token = doLink ?: Sessao.token(this)

        if (doLink != null) Sessao.guardarToken(this, doLink)

        if (token == null) {
            binding.web.loadUrl(SEM_LINK)
            return
        }

        binding.web.loadUrl("${BuildConfig.BASE_URL}/m/$token")
    }

    private fun mostrarCarregando(visivel: Boolean) {
        binding.carregando.visibility = if (visivel) View.VISIBLE else View.GONE
    }

    /**
     * Troca a janela em branco por uma tela que diz o que houve.
     *
     * A WebView so tem duas respostas para um carregamento que falha, e as duas
     * sao ruins: a pagina de erro dela, em ingles e com codigo `net::ERR_`, ou —
     * em erro de certificado — nada, a janela em branco. Do lado de fora as duas
     * sao "o app quebrou".
     */
    private fun mostrarFalha() {
        mostrarCarregando(false)
        binding.web.loadUrl(ERRO)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configurarWebView() {
        binding.web.settings.apply {
            javaScriptEnabled = true

            /*
             * Sem isto o localStorage nao funciona, e a pagina do motoboy o usa
             * para lembrar escolhas entre aberturas. E o tipo de coisa que nao
             * quebra na hora: ela some quando o app e fechado, e parece bug do
             * servidor.
             */
            domStorageEnabled = true

            /*
             * A pagina web pede posicao com a tela acesa; o servico nativo cuida
             * da tela apagada. Sem esta linha a chamada do navegador falha calada
             * dentro do app, e o rastreio fica pior aqui do que no Chrome.
             */
            setGeolocationEnabled(true)

            /*
             * As duas linhas que fazem a WebView ler o <meta name="viewport">.
             *
             * `useWideViewPort` nasce em `false`, e nesse estado a WebView
             * DESCARTA a meta tag inteira — justamente a que o site define com
             * cuidado em src/app/layout.tsx e em src/app/m/[token]/page.tsx
             * (`width=device-width, initial-scale=1, maximum-scale=5`). Duas
             * consequencias, e nenhuma delas da erro:
             *
             *  1. sem a meta, a pagina nao conta como feita para celular, e o
             *     Chromium liga o aumento automatico de fonte — ele infla uns
             *     blocos de texto e outros nao, entao o cabecalho estoura, o
             *     endereco quebra no meio e os botoes desalinham. E exatamente a
             *     tela "zoada" que aparece no app e nao no navegador;
             *  2. sem a meta, `maximum-scale` tambem se perde: um toque duplo
             *     sem querer deixa a pagina numa escala qualquer, deslocada, e
             *     sem caminho de volta.
             *
             * `loadWithOverviewMode` completa o par: manda comecar na escala que
             * cabe na largura da tela, que com `width=device-width` e 1.
             */
            useWideViewPort = true
            loadWithOverviewMode = true

            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            // O motoboy vai dar zoom no endereco. Sem barra de controle na tela.
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }

        binding.web.addJavascriptInterface(
            PonteWeb(
                contexto = this,
                pedirPermissao = { pedirPermissoes.launch(Permissoes.ESSENCIAIS) },
                // Vem da thread da ponte, nao da principal.
                abrirDeNovo = { runOnUiThread { abrir(intent) } },
            ),
            "LevoApp",
        )

        binding.web.webChromeClient = object : WebChromeClient() {
            /**
             * A WebView pergunta ao app antes de deixar a pagina pegar posicao.
             *
             * O padrao e negar em silencio. Como a origem e o nosso proprio site e
             * a permissao do sistema ja foi verificada, conceder aqui e apenas
             * repassar o que o usuario ja autorizou.
             */
            override fun onGeolocationPermissionsShowPrompt(
                origem: String?,
                callback: GeolocationPermissions.Callback?,
            ) {
                val nosso = origem?.startsWith(BuildConfig.BASE_URL) == true
                callback?.invoke(origem, nosso && Permissoes.temLocalizacao(this@MainActivity), false)
            }
        }

        binding.web.webViewClient = object : WebViewClient() {
            /**
             * Link que nao e nosso sai para o sistema.
             *
             * A pagina tem botao de WhatsApp, de telefone e de mapa. Deixar a
             * WebView tentar abrir `tel:` ou `wa.me` resulta em tela branca sem
             * mensagem, e o motoboy conclui que o app quebrou.
             */
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?,
            ): Boolean {
                val url = request?.url ?: return false
                if (url.toString().startsWith(BuildConfig.BASE_URL)) return false

                return runCatching {
                    startActivity(Intent(Intent.ACTION_VIEW, url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    true
                }.getOrDefault(true)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                // So para a pagina de verdade: as telas locais aparecem na hora,
                // e uma roda piscando antes delas seria ruido.
                if (url?.startsWith(BuildConfig.BASE_URL) == true) mostrarCarregando(true)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                mostrarCarregando(false)
            }

            /** Rede, DNS, tempo esgotado. Quadro secundario nao derruba a tela. */
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?,
            ) {
                if (request?.isForMainFrame == true) mostrarFalha()
            }

            /**
             * O servidor respondeu, e respondeu mal.
             *
             * O 404 tem tratamento proprio: o token guardado e de um turno que
             * acabou. Ficar tentando abri-lo em toda abertura devolve a mesma
             * pagina de erro para sempre — esquece-lo devolve o motoboy a tela
             * que explica o que fazer, que e pedir o link novo para a loja.
             */
            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                resposta: WebResourceResponse?,
            ) {
                if (request?.isForMainFrame != true) return
                val codigo = resposta?.statusCode ?: return

                if (codigo == 404 || codigo == 410) {
                    Sessao.esquecerToken(this@MainActivity)
                    mostrarCarregando(false)
                    binding.web.loadUrl(SEM_LINK)
                    return
                }

                if (codigo >= 500) mostrarFalha()
            }

            /**
             * Certificado recusado e o caso que nao deixava rastro nenhum.
             *
             * O padrao cancela o carregamento em silencio: nem pagina de erro da
             * WebView, nem chamada a `onReceivedError`. Fica a janela vazia. E
             * acontece de verdade — Wi-Fi de praca com portal de captura,
             * relogio do aparelho fora de hora, proxy de operadora.
             *
             * O cancelamento continua: seguir apesar do erro seria abrir o token
             * da rota para quem estiver no meio do caminho.
             */
            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: SslError?,
            ) {
                handler?.cancel()
                mostrarFalha()
            }
        }
    }

    /**
     * Voltar anda no historico da pagina, e nao fecha o app.
     *
     * O motoboy abre o detalhe de uma parada e aperta voltar. Sem isto ele cai
     * fora do app inteiro e precisa achar o icone de novo, no meio da rua, de
     * capacete.
     */
    private fun cuidarDoBotaoVoltar() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.web.canGoBack()) {
                    binding.web.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun explicarSegundoPlano() {
        AlertDialog.Builder(this)
            .setTitle(R.string.fundo_titulo)
            .setMessage(R.string.fundo_texto)
            .setPositiveButton(R.string.fundo_abrir) { _, _ -> Permissoes.abrirAjustes(this) }
            .setNegativeButton(R.string.fundo_depois, null)
            .show()
    }

    override fun onDestroy() {
        // A WebView segura a Activity se nao for destruida na mao.
        binding.web.destroy()
        super.onDestroy()
    }

    private companion object {
        const val SEM_LINK = "file:///android_asset/sem_link.html"
        const val ERRO = "file:///android_asset/erro.html"
    }
}

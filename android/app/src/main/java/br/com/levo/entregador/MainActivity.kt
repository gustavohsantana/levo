package br.com.levo.entregador

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
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

    /** A WebView ja foi descartada: `onDestroy` nao deve mexer nela de novo. */
    private var telaDescartada = false

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

        configurarWebView()
        binding.web.setBackgroundColor(0xFFFAF9F7.toInt())
        abrir(intent)
        cuidarDoBotaoVoltar()
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

        if (doLink != null) {
            Sessao.guardarToken(this, doLink)
            binding.web.loadUrl("${BuildConfig.BASE_URL}/m/$doLink")
            return
        }

        /*
         * Sem link do WhatsApp: a porta e o login.
         *
         * `/entregador` manda para o formulario se nao houver sessao, e para a
         * rota atual se o motoboy ja entrou. Guardar o token antigo e abrir
         * `/m/` direto deixaria ele preso numa rota de ontem.
         */
        binding.web.loadUrl("${BuildConfig.BASE_URL}/entregador/login")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configurarWebView() {
        /*
         * Depuracao remota so no build de depuracao.
         *
         * Com ela ligada, `chrome://inspect` na maquina ligada por USB abre a
         * pagina que roda dentro do app. Foi assim que a queda do renderizador
         * no tablet do piloto virou uma causa em vez de um chute. No APK de
         * envio fica desligada: qualquer maquina com USB dirigiria a tela do
         * motoboy.
         */
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(binding.web, true)

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
             * Sem estas duas, a WebView joga fora o <meta viewport> e o
             * Chromium infla a fonte sozinho — a tela "zoada" do app.
             */
            useWideViewPort = true
            loadWithOverviewMode = true
            textZoom = 100

            /*
             * Cache normal, respeitando o que o servidor manda.
             *
             * Isto ja foi LOAD_NO_CACHE, posto quando "HTML novo com CSS velho"
             * parecia cache podre. Nao era: o CSS nao entrava porque o Tailwind
             * embrulha tudo em `@layer`, que este WebView nao conhece. Com a
             * causa corrigida, desligar o cache so custa: as paginas do Next tem
             * nome com hash, entao nunca ficam velhas, e o motoboy rebaixava o
             * app inteiro de novo a cada abertura, no 3G da rua.
             */
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            // Zoom so na rota, com os controles escondidos — no login um toque
            // duplo deixava a pagina numa escala torta sem saida.
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }

        // 100 = escala do aparelho. Sem isto o WebView as vezes abre em 75%.
        binding.web.setInitialScale(100)

        binding.web.addJavascriptInterface(
            PonteWeb(this) { pedirPermissoes.launch(Permissoes.ESSENCIAIS) },
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
                val nosso = eDoLevo(origem)
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
                if (eDoLevo(url)) return false

                return runCatching {
                    startActivity(Intent(Intent.ACTION_VIEW, url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    true
                }.getOrDefault(true)
            }

            /**
             * Quando o login cai na rota, o token precisa ir para o servico
             * nativo. Sem isto o rastreio com a tela apagada nao liga — a pagina
             * chama `rastrear`, mas so depois que a rota comeca.
             */
            override fun onPageFinished(view: WebView?, url: String?) {
                CookieManager.getInstance().flush()
                Sessao.tokenDaUrl(url)?.let { Sessao.guardarToken(this@MainActivity, it) }
            }

            /**
             * O processo que desenha a pagina morreu. O app nao morre junto.
             *
             * Sem este metodo o Android mata a Activity inteira quando o
             * renderizador cai — "o app fechou sozinho" no meio da entrega, e o
             * rastreio, que vive no mesmo processo, para junto. Devolver true
             * diz que nos cuidamos disso.
             *
             * A WebView morta nao volta a funcionar: e preciso tirar da tela,
             * destruir, e recriar a Activity — que infla outra e chama `abrir`
             * de novo. Com o cookie no lugar, `/entregador` devolve o motoboy
             * para a mesma rota.
             *
             * `didCrash` separaria defeito do renderizador de morte por falta
             * de memoria. Os dois se resolvem igual aqui, entao a distincao so
             * serviria para log — e nao ha para onde mandar log deste aparelho.
             */
            override fun onRenderProcessGone(
                view: WebView?,
                detail: RenderProcessGoneDetail?,
            ): Boolean {
                val agora = SystemClock.elapsedRealtime()
                val emSeguida = agora - ultimaQueda < REPETIDA_EM_MS
                ultimaQueda = agora

                descartar(view)

                /*
                 * Duas quedas em quinze segundos e a mesma pagina derrubando o
                 * renderizador de novo. Recarregar sozinho ali vira laco: a
                 * tela pisca sem parar e o motoboy nao consegue nem sair.
                 */
                if (emSeguida) {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle(R.string.queda_titulo)
                        .setMessage(R.string.queda_texto)
                        .setPositiveButton(R.string.queda_tentar) { _, _ -> recreate() }
                        .setCancelable(false)
                        .show()
                } else {
                    recreate()
                }

                return true
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

    /**
     * O site do Levô, em qualquer domínio que a Vercel estiver usando.
     *
     * O app abre `levoentregas.vercel.app`. Um redirect do Next às vezes aponta
     * para o alias `levo-nine.vercel.app`. Tratar isso como site de terceiros
     * manda o WebView para o Chrome — ou para lugar nenhum, tela branca.
     */
    private fun eDoLevo(url: Uri): Boolean {
        if (url.toString().startsWith(BuildConfig.BASE_URL)) return true
        val host = url.host ?: return false
        return host == "levoentregas.vercel.app" || host == "levo-nine.vercel.app"
    }

    private fun eDoLevo(origem: String?): Boolean {
        if (origem.isNullOrBlank()) return false
        return runCatching { eDoLevo(Uri.parse(origem)) }.getOrDefault(false)
    }

    private fun explicarSegundoPlano() {
        AlertDialog.Builder(this)
            .setTitle(R.string.fundo_titulo)
            .setMessage(R.string.fundo_texto)
            .setPositiveButton(R.string.fundo_abrir) { _, _ -> Permissoes.abrirAjustes(this) }
            .setNegativeButton(R.string.fundo_depois, null)
            .show()
    }

    private fun descartar(morta: WebView?) {
        val web = morta ?: return
        (web.parent as? ViewGroup)?.removeView(web)
        web.destroy()
        telaDescartada = true
    }

    override fun onDestroy() {
        // A WebView segura a Activity se nao for destruida na mao.
        if (!telaDescartada) binding.web.destroy()
        super.onDestroy()
    }

    private companion object {
        const val REPETIDA_EM_MS = 15_000L

        /**
         * Fora da instancia de proposito: `recreate` cria outra Activity, e o
         * contador precisa atravessar a queda para reconhecer a segunda.
         */
        var ultimaQueda = 0L
    }
}

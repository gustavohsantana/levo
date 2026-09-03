package br.com.levo.motoboy

import android.content.Context
import android.webkit.JavascriptInterface

/**
 * O que a pagina web pode pedir ao aparelho.
 *
 * Deliberadamente minuscula. Tudo que passa por aqui vira codigo nativo, e
 * codigo nativo so se atualiza reinstalando o APK em cada motoboy — enquanto a
 * pagina se corrige num deploy. Cada metodo novo aqui e uma coisa a menos que
 * voce conserta sozinho.
 *
 * Por isso a ponte nao desenha nada nem decide nada: ela liga e desliga o
 * rastreio, e diz que o app existe. Quem sabe quando a rota comecou e a pagina.
 */
class PonteWeb(private val contexto: Context, private val pedirPermissao: () -> Unit) {

    /**
     * Deixa a pagina saber que esta dentro do app.
     *
     * A mesma tela roda no navegador e aqui. Sem isto ela nao teria como esconder
     * o aviso de "abra pelo Telegram para o rastreio funcionar" quando o rastreio
     * ja esta funcionando de verdade.
     */
    @JavascriptInterface
    fun temApp(): Boolean = true

    /** A rota comecou: liga o rastreio em segundo plano. */
    @JavascriptInterface
    fun rastrear(token: String) {
        if (token.isBlank()) return
        Sessao.guardarToken(contexto, token)

        /*
         * Pede a permissao em vez de so tentar: se ela ainda nao foi concedida, o
         * servico subiria, gastaria a notificacao e morreria sem uma posicao. O
         * motoboy veria "rastreando" na barra e o dono nao veria nada no mapa —
         * a pior das falhas, porque os dois lados acham que esta funcionando.
         */
        if (Permissoes.podeRastrear(contexto)) {
            RastreioService.comecar(contexto, token)
        } else {
            pedirPermissao()
        }
    }

    /** A rota acabou, ou o motoboy recusou: desliga. */
    @JavascriptInterface
    fun parar() {
        RastreioService.parar(contexto)
    }

    /** Para a pagina poder mostrar o estado real, e nao o que ela supoe. */
    @JavascriptInterface
    fun temPermissao(): Boolean = Permissoes.podeRastrear(contexto)
}

package br.com.levo.entregador

import android.content.Context

/**
 * O token da rota, guardado entre aberturas do app.
 *
 * O motoboy recebe um link por turno e nao vai reabri-lo toda vez. Sem guardar,
 * o app abriria numa tela vazia toda manha e o dono levaria a culpa.
 *
 * Fica em SharedPreferences comum, e nao criptografado: o token ja trafega em
 * texto no link do WhatsApp, e ele so da acesso a uma rota que expira. Cifrar
 * aqui seria teatro — protegeria o elo que ja e o mais forte da corrente.
 */
object Sessao {
    private const val ARQUIVO = "levo"
    private const val TOKEN = "token"

    fun guardarToken(contexto: Context, token: String) {
        prefs(contexto).edit().putString(TOKEN, token).apply()
    }

    fun token(contexto: Context): String? = prefs(contexto).getString(TOKEN, null)

    fun esquecerToken(contexto: Context) {
        prefs(contexto).edit().remove(TOKEN).apply()
    }

    private fun prefs(contexto: Context) =
        contexto.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)

    /**
     * Tira o token de uma URL como `https://levoentregas.vercel.app/m/abc123`.
     *
     * Aceita barra no fim e ignora query, porque link colado no WhatsApp chega
     * de todo jeito — com `?utm`, com `/` sobrando, cortado e recolado.
     */
    fun tokenDaUrl(url: String?): String? {
        if (url == null) return null
        val semQuery = url.substringBefore('?').substringBefore('#')
        val marca = "/m/"
        val i = semQuery.indexOf(marca)
        if (i < 0) return null
        val token = semQuery.substring(i + marca.length).trim('/')
        return token.ifBlank { null }
    }
}

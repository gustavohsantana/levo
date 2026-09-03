package br.com.levo.motoboy

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * As posicoes que ainda nao chegaram ao servidor.
 *
 * Motoboy passa o turno inteiro entrando e saindo de area sem sinal — viaduto,
 * subsolo, o fundo do bairro. Sem fila, cada ping perdido nesses buracos some
 * para sempre, e o mapa do dono fica com o rastro furado justamente onde ele
 * mais quer olhar.
 *
 * Guarda em SharedPreferences porque sao poucos registros minusculos e o serviço
 * pode ser morto a qualquer momento: banco de dados aqui seria peso sem ganho.
 */
class FilaDePings(private val contexto: Context) {

    /**
     * Teto de 200.
     *
     * A um ping a cada 15s, sao cerca de 50 minutos sem sinal. Passou disso, o
     * mais antigo cai: rastro de uma hora atras nao ajuda ninguem a achar o
     * motoboy agora, e uma fila sem teto vira vazamento de memoria lento.
     */
    private val teto = 200

    fun enfileirar(ping: JSONObject) {
        val fila = ler()
        fila.put(ping)
        while (fila.length() > teto) fila.remove(0)
        gravar(fila)
    }

    fun tudo(): List<JSONObject> {
        val fila = ler()
        return (0 until fila.length()).mapNotNull { fila.optJSONObject(it) }
    }

    fun limpar() {
        prefs().edit().remove(CHAVE).apply()
    }

    /** Remove os que ja subiram, preservando os que entraram durante o envio. */
    fun descartarPrimeiros(quantos: Int) {
        val fila = ler()
        repeat(minOf(quantos, fila.length())) { fila.remove(0) }
        gravar(fila)
    }

    private fun ler(): JSONArray =
        runCatching { JSONArray(prefs().getString(CHAVE, "[]")) }.getOrDefault(JSONArray())

    private fun gravar(fila: JSONArray) {
        prefs().edit().putString(CHAVE, fila.toString()).apply()
    }

    private fun prefs() = contexto.getSharedPreferences("levo", Context.MODE_PRIVATE)

    private companion object {
        const val CHAVE = "fila_pings"
    }
}

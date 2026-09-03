package br.com.levo.motoboy

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * O caminho ate "Permitir o tempo todo".
 *
 * E a parte do app que mais parece boba e mais derruba na pratica. Do Android 11
 * em diante o sistema nao concede localizacao em segundo plano por caixa de
 * dialogo nenhuma: a pessoa tem que abrir as Configuracoes e escolher com a mao.
 * Um app que so chama requestPermissions e reza fica para sempre sem rastreio, e
 * sem nenhum erro para explicar por que.
 */
object Permissoes {

    val ESSENCIAIS: Array<String> = buildList {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
        // Android 13 passou a exigir permissao ate para a notificacao fixa — e sem
        // ela o servico de primeiro plano nao se sustenta.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
    }.toTypedArray()

    fun temLocalizacao(contexto: Context): Boolean =
        concedida(contexto, Manifest.permission.ACCESS_FINE_LOCATION) ||
            concedida(contexto, Manifest.permission.ACCESS_COARSE_LOCATION)

    fun temSegundoPlano(contexto: Context): Boolean {
        // Antes do Android 10 nao existia permissao separada: quem tem localizacao
        // tem em segundo plano.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return temLocalizacao(contexto)
        return concedida(contexto, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    }

    /**
     * O que basta para o servico valer a pena.
     *
     * Sem segundo plano ele ainda funciona com a tela acesa — util para o motoboy
     * que deixa o celular no suporte do guidao. Nao e o ideal, mas e melhor que
     * recusar a rastrear e deixar o dono sem nada.
     */
    fun podeRastrear(contexto: Context): Boolean = temLocalizacao(contexto)

    /**
     * Abre a ficha do app nas Configuracoes.
     *
     * Nao existe atalho direto para a tela de localizacao em todos os fabricantes,
     * e tentar adivinhar a Activity interna de cada um quebra em metade dos
     * aparelhos. A ficha do app abre em todos, e dali sao dois toques.
     */
    fun abrirAjustes(contexto: Context) {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", contexto.packageName, null),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        contexto.startActivity(intent)
    }

    /**
     * A lista de economia de bateria do sistema.
     *
     * Xiaomi, Motorola e Samsung matam servico em segundo plano por conta propria,
     * e cada uma esconde o ajuste num lugar diferente. Esta lista e a unica porta
     * que existe em todos — o resto e instrucao escrita, aparelho por aparelho.
     *
     * Nao usamos o pedido direto de isencao: ele e permissao sensivel na Play
     * Store e exige justificativa que raramente e aceita. Levar a pessoa ate a
     * lista consegue a mesma coisa sem arriscar a publicacao.
     */
    fun abrirEconomiaDeBateria(contexto: Context) {
        runCatching {
            contexto.startActivity(
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }.onFailure { abrirAjustes(contexto) }
    }

    private fun concedida(contexto: Context, permissao: String): Boolean =
        ContextCompat.checkSelfPermission(contexto, permissao) == PackageManager.PERMISSION_GRANTED
}

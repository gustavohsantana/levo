package br.com.levo.motoboy

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * O motivo de existir um app nativo.
 *
 * Site nao pega posicao com a tela apagada, e o celular do motoboy passa o turno
 * apagado no bolso ou preso no guidao. Este servico e a unica parte que a web
 * nao consegue fazer — e por isso e a unica coisa nativa que existe aqui.
 *
 * Roda em primeiro plano com notificacao fixa. Nao e enfeite nem exigencia
 * burocratica: e o que impede o sistema de matar o processo, e e o que deixa o
 * motoboy ver, a qualquer momento, que esta sendo rastreado. Um app que segue a
 * pessoa sem dizer isso na cara dela nao merece estar no celular de ninguem.
 */
class RastreioService : Service() {

    private val escopo = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var cliente: FusedLocationProviderClient
    private lateinit var fila: FilaDePings
    private var token: String? = null

    private val ouvinte = object : LocationCallback() {
        override fun onLocationResult(resultado: LocationResult) {
            resultado.lastLocation?.let { enviar(it) }
        }
    }

    override fun onCreate() {
        super.onCreate()
        cliente = LocationServices.getFusedLocationProviderClient(this)
        fila = FilaDePings(this)
        criarCanal()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        token = intent?.getStringExtra(EXTRA_TOKEN) ?: Sessao.token(this)

        /*
         * Sem token nao ha para onde mandar posicao. Encerrar e melhor que ficar
         * de pe consumindo bateria com uma notificacao que nao explica nada.
         */
        if (token == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        /*
         * A notificacao tem que subir nos primeiros segundos, antes de qualquer
         * outra coisa. Se o servico demorar para chamar startForeground, o
         * sistema o derruba com ForegroundServiceDidNotStartInTimeException — e
         * isso so aparece rodando, nunca ao compilar.
         */
        startForeground(ID_NOTIFICACAO, notificacao())

        pedirPosicoes()

        /*
         * START_STICKY: se o sistema matar por pressao de memoria, ele recria o
         * servico. O token vem do disco na recriacao, porque o Intent volta nulo.
         */
        return START_STICKY
    }

    private fun pedirPosicoes() {
        /*
         * Intervalo de 15s, com teto de 10s para atualizacao mais rapida se outro
         * app ja estiver pedindo posicao. Prioridade equilibrada, e nao alta
         * precisao: alta precisao mantem o chip de GPS aceso sem parar, e num
         * turno de seis horas isso e o que esvazia a bateria antes do fim.
         */
        val pedido = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 15_000L)
            .setMinUpdateIntervalMillis(10_000L)
            .setMinUpdateDistanceMeters(20f)
            .setWaitForAccurateLocation(false)
            .build()

        try {
            cliente.requestLocationUpdates(pedido, ouvinte, mainLooper)
        } catch (e: SecurityException) {
            /*
             * A permissao pode ter sido revogada com o servico rodando — a pessoa
             * abriu as Configuracoes e desligou. Encerrar em silencio e a resposta
             * certa: insistir so gera excecao a cada ciclo.
             */
            stopSelf()
        }
    }

    private fun enviar(posicao: Location) {
        val alvo = token ?: return

        val ping = JSONObject().apply {
            put("token", alvo)
            put("lat", posicao.latitude)
            put("lng", posicao.longitude)
            put("at", iso(posicao.time))
        }

        fila.enfileirar(ping)
        escopo.launch { esvaziarFila() }
    }

    /**
     * Sobe o que estiver acumulado, na ordem em que aconteceu.
     *
     * Para no primeiro erro em vez de continuar: se a rede caiu, as proximas vao
     * falhar igual, e insistir so gasta bateria. O que sobrou fica na fila para a
     * proxima posicao disparar de novo.
     */
    private suspend fun esvaziarFila() = withContext(Dispatchers.IO) {
        val pendentes = fila.tudo()
        var enviados = 0

        for (ping in pendentes) {
            if (!postar(ping)) break
            enviados++
        }

        if (enviados > 0) fila.descartarPrimeiros(enviados)
    }

    private fun postar(ping: JSONObject): Boolean {
        return try {
            val conexao = (URL("${BuildConfig.BASE_URL}/api/driver/ping").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 10_000
                readTimeout = 10_000
                doOutput = true
            }
            conexao.outputStream.use { it.write(ping.toString().toByteArray()) }

            val codigo = conexao.responseCode
            conexao.disconnect()

            /*
             * 4xx conta como entregue.
             *
             * Token expirado ou rota encerrada devolvem 404, e o servidor esta
             * certo. Reenfileirar isso faria a fila crescer para sempre tentando
             * entregar algo que nunca sera aceito.
             */
            codigo in 200..299 || codigo in 400..499
        } catch (e: Exception) {
            false
        }
    }

    private fun notificacao(): Notification {
        val abrir = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, CANAL)
            .setContentTitle(getString(R.string.rastreio_titulo))
            .setContentText(getString(R.string.rastreio_texto))
            .setSmallIcon(R.drawable.ic_rastreio)
            .setContentIntent(abrir)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            // Discreta: ela fica a tarde inteira na barra, e nao pode competir
            // com o que realmente precisa da atencao do motoboy.
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun criarCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val canal = NotificationChannel(
            CANAL,
            getString(R.string.rastreio_canal),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.rastreio_canal_descricao)
            setShowBadge(false)
        }

        getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }

    override fun onDestroy() {
        cliente.removeLocationUpdates(ouvinte)
        escopo.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val CANAL = "rastreio"
        private const val ID_NOTIFICACAO = 1
        private const val EXTRA_TOKEN = "token"

        private fun iso(millis: Long): String =
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                .apply { timeZone = TimeZone.getTimeZone("UTC") }
                .format(Date(millis))

        fun comecar(contexto: Context, token: String) {
            val intent = Intent(contexto, RastreioService::class.java).putExtra(EXTRA_TOKEN, token)
            /*
             * startForegroundService e nao startService: a partir do Android 8 o
             * sistema so deixa um servico subir com o app em segundo plano se ele
             * prometer virar primeiro plano em seguida.
             */
            androidx.core.content.ContextCompat.startForegroundService(contexto, intent)
        }

        fun parar(contexto: Context) {
            contexto.stopService(Intent(contexto, RastreioService::class.java))
        }
    }
}

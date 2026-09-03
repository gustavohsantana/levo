import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/*
 * A senha da chave mora fora do repositorio.
 *
 * `keystore.properties` esta no .gitignore junto com o proprio .jks. Sem o
 * arquivo, o build de release simplesmente sai sem assinatura em vez de
 * quebrar — quem so quer compilar para testar nao precisa da chave, e quem
 * precisa dela recebe um erro claro do Gradle na hora de enviar.
 */
val assinatura = Properties().apply {
    val arquivo = rootProject.file("keystore.properties")
    if (arquivo.exists()) arquivo.inputStream().use { load(it) }
}

android {
    namespace = "br.com.levo.entregador"

    /*
     * A Play Store exige que app novo mire a API recente do ano.
     * Confira a exigencia atual no console antes de enviar: ela sobe todo agosto,
     * e app que mira abaixo do minimo e recusado no envio, nao na revisao.
     */
    compileSdk = 36

    defaultConfig {
        /*
         * Definitivo. Depois do primeiro envio a Play Store nao deixa mudar o
         * applicationId — trocar significa outro app, com outra ficha e outra
         * base de usuarios.
         */
        applicationId = "br.com.levo.entregador"

        // Android 8. Abaixo disso o servico em primeiro plano funciona diferente,
        // e nao vale carregar dois caminhos por aparelho que motoboy nao usa mais.
        minSdk = 26
        targetSdk = 36

        versionCode = 1
        versionName = "1.0"

        buildConfigField("String", "BASE_URL", "\"https://levoentregas.vercel.app\"")
    }

    signingConfigs {
        create("envio") {
            /*
             * Chave de ENVIO, nao de assinatura final.
             *
             * Com o Play App Signing, o Google guarda a chave definitiva e esta
             * aqui so prova que o pacote veio de voce. Perde-la da trabalho, mas
             * e recuperavel — perder a definitiva, nao seria.
             *
             * Consequencia pratica: a impressao SHA-256 que vai no
             * assetlinks.json da versao da LOJA e a que o Console mostra, e nao
             * a desta chave. Para o APK distribuido por fora (Drive), vale esta.
             * As duas podem conviver no mesmo arquivo.
             */
            val caminho = assinatura.getProperty("storeFile")
            if (caminho != null) {
                storeFile = rootProject.file(caminho)
                storePassword = assinatura.getProperty("storePassword")
                keyAlias = assinatura.getProperty("keyAlias")
                keyPassword = assinatura.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // Sem o keystore.properties, sai sem assinar em vez de quebrar.
            if (assinatura.getProperty("storeFile") != null) {
                signingConfig = signingConfigs.getByName("envio")
            }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")

    /*
     * Fused Location, e nao o LocationManager cru: ele funde GPS, rede e sensores,
     * e o sistema coordena o intervalo entre os aplicativos que pedem posicao. Num
     * turno de seis horas isso e a diferenca entre o celular chegar no fim do dia
     * com bateria ou nao.
     */
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}

# A ponte com o JavaScript e chamada por nome pela pagina web: o ofuscador nao
# tem como saber disso e removeria os metodos.
-keepclassmembers class br.com.levo.motoboy.PonteWeb {
    public *;
}
-keepattributes JavascriptInterface

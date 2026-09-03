# A ponte com o JavaScript e chamada por nome pela pagina web: o ofuscador nao
# tem como saber disso e removeria os metodos.
-keepclassmembers class br.com.levo.entregador.PonteWeb {
    public *;
}
-keepattributes JavascriptInterface

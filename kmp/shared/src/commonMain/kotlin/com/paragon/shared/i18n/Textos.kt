package com.paragon.shared.i18n

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/** Los 4 idiomas de la app (los mismos que la web). */
enum class Idioma(val codigo: String) { ES("es"), EN("en"), DE("de"), FR("fr") }

/** Idioma del sistema (código ISO de dos letras, p. ej. "es"). */
expect fun idiomaDelSistema(): String

/**
 * Textos traducidos para Android e iOS, generados desde kmp/i18n/textos.json.
 * El idioma activo es estado de Compose: al cambiarlo se repinta todo lo que
 * use `stringResource(T.x)`.
 */
object Textos {
    var idioma: Idioma by mutableStateOf(desdeCodigo(idiomaDelSistema()))

    private val cache = HashMap<Idioma, Array<String>>()

    fun desdeCodigo(codigo: String?): Idioma =
        Idioma.entries.firstOrNull { it.codigo == codigo?.take(2)?.lowercase() } ?: Idioma.ES

    /** Fuera de Compose (repositorios, avisos...). Los huecos {0}, {1}... se rellenan con `args`. */
    fun t(texto: Texto, vararg args: Any?): String {
        val tabla = cache.getOrPut(idioma) {
            when (idioma) {
                Idioma.ES -> textosES()
                Idioma.EN -> textosEN()
                Idioma.DE -> textosDE()
                Idioma.FR -> textosFR()
            }
        }
        return rellenar(tabla[texto.indice], args)
    }

    internal fun rellenar(plantilla: String, args: Array<out Any?>): String {
        if (args.isEmpty() || '{' !in plantilla) return plantilla
        return HUECO.replace(plantilla) { m ->
            val i = m.groupValues[1].toInt()
            if (i < args.size) args[i].toString() else m.value
        }
    }

    private val HUECO = Regex("""\{(\d+)\}""")
}

/** Equivalente común de `stringResource(R.string.x, ...)`. */
@Composable
fun stringResource(texto: Texto, vararg args: Any?): String = Textos.t(texto, *args)

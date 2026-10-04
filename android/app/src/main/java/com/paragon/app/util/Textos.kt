package com.paragon.app.util

import android.content.Context
import androidx.annotation.StringRes

/**
 * Textos traducidos fuera de Compose (repositorios, workers, widget...),
 * donde no hay `stringResource`. Los textos viven en los strings.xml de res/values, values-en, values-de y values-fr,
 * generados desde android/i18n/textos.json (es por defecto, en, de, fr).
 * Se inicializa en ParagonApplication.onCreate.
 */
object Textos {
    private lateinit var app: Context

    fun init(context: Context) {
        app = context.applicationContext
    }

    fun t(@StringRes id: Int, vararg args: Any): String =
        if (args.isEmpty()) app.getString(id) else app.getString(id, *args)
}

package com.paragon.app.ui.common

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle

/**
 * Los textos del servidor (avisos, bandeja) marcan las negritas con
 * `**así**`, como en la web y en Discord. Antes la app enseñaba los
 * asteriscos tal cual (visto en las capturas del emulador, 8 nov 2026).
 */
fun conNegritasMarkdown(texto: String, colorNegrita: Color? = null): AnnotatedString = buildAnnotatedString {
    val partes = texto.split("**")
    partes.forEachIndexed { i, parte ->
        // Las partes impares van entre ** **; un ** sin cerrar se queda como texto normal.
        if (i % 2 == 1 && i < partes.lastIndex) {
            withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = colorNegrita ?: Color.Unspecified)) { append(parte) }
        } else {
            if (i % 2 == 1) append("**")
            append(parte)
        }
    }
}

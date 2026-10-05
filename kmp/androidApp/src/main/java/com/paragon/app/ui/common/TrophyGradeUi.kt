package com.paragon.app.ui.common

import androidx.compose.ui.graphics.Color
import com.paragon.app.data.TrophyGrade
import com.paragon.app.ui.theme.Bronze
import com.paragon.app.ui.theme.Gold
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Platinum
import com.paragon.app.ui.theme.Silver
import com.paragon.app.R
import com.paragon.app.util.Textos

/**
 * Color y etiqueta en español de un metal — antes duplicado literalmente
 * en FocusScreen.kt y GameDetailScreen.kt (encontrado en auditoría), cada
 * uno con su propia copia idéntica que había que mantener sincronizada a
 * mano.
 */
fun gradeColor(grade: TrophyGrade?): Color = when (grade) {
    TrophyGrade.PLATINUM -> Platinum
    TrophyGrade.GOLD -> Gold
    TrophyGrade.SILVER -> Silver
    TrophyGrade.BRONZE -> Bronze
    null -> Muted
}

fun gradeLabelEs(grade: TrophyGrade?): String = when (grade) {
    TrophyGrade.PLATINUM -> Textos.t(R.string.grado_platino)
    TrophyGrade.GOLD -> Textos.t(R.string.grado_oro)
    TrophyGrade.SILVER -> Textos.t(R.string.grado_plata)
    TrophyGrade.BRONZE -> Textos.t(R.string.grado_bronce)
    null -> "?"
}

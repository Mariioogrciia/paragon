package com.paragon.app.ui.common

import androidx.compose.ui.graphics.Color
import com.paragon.app.data.TrophyGrade
import com.paragon.app.ui.theme.Bronze
import com.paragon.app.ui.theme.Gold
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Platinum
import com.paragon.app.ui.theme.Silver

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
    TrophyGrade.PLATINUM -> "Platino"
    TrophyGrade.GOLD -> "Oro"
    TrophyGrade.SILVER -> "Plata"
    TrophyGrade.BRONZE -> "Bronce"
    null -> "?"
}

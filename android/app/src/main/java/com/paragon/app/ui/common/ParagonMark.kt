package com.paragon.app.ui.common

import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.paragon.app.R

/**
 * El símbolo de Paragon: la misma P que la web (public/logo.png) y que el
 * icono de la app (4 oct 2026). Antes aquí había una gema con flecha
 * dibujada a mano que no aparecía en ningún otro sitio — la marca era una
 * en el lanzador y otra dentro de la app. Decorativa: el nombre "PARAGON"
 * va siempre al lado, así que TalkBack no la lee.
 */
@Composable
fun ParagonMark(modifier: Modifier = Modifier) {
    Image(
        painter = painterResource(R.drawable.marca_paragon),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = modifier,
    )
}

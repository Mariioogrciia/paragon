package com.paragon.app.ui.panel

import com.paragon.app.util.formatDecimal

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.paragon.app.ui.common.premiumClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GameProgress
import com.paragon.app.data.LatestTrophy
import com.paragon.app.data.NextTrophy
import com.paragon.app.ui.common.rememberCoverAuraColor
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos


/**
 * `coverUrl` sale de `iconUrl` del backend, y puede venir vacío para
 * muchos juegos (dato todavía sin sincronizar, o la plataforma no lo da)
 * — la web ya lo trata así, con un degradado de respaldo en vez de una
 * imagen rota (ver LibraryGrid.tsx). Antes esto se pasaba tal cual a
 * `AsyncImage`, que con un modelo vacío no pinta nada — de ahí las
 * carátulas en blanco reportadas el 16/09.
 */
@Composable
internal fun GameCover(coverUrl: String, title: String, modifier: Modifier) {
    if (coverUrl.isNotBlank()) {
        AsyncImage(
            model = coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier,
        )
    } else {
        Box(
            modifier = modifier.background(Brush.linearGradient(colors = listOf(Surface2, Surface))),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = title.take(1).uppercase(),
                color = Muted,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

/**
 * `label`/`labelColor`/`accentColor` parametrizados para poder reutilizar
 * esta misma Hero Card tanto en "Cerca del platino" (azul, algorítmico)
 * como en el juego que el usuario ancló a mano en Modo Enfoque (dorado,
 * explícito) — antes el anclado tenía su propia versión plana y pequeña
 * (una fila plana de 56dp, sin esta presencia) pese a ser la elección
 * deliberada del usuario, no un cálculo.
 */
@OptIn(androidx.compose.animation.ExperimentalSharedTransitionApi::class)
@Composable
fun HeroGameCard(
    game: GameProgress,
    onClick: () -> Unit = {},
    label: String = Textos.t(T.panel_siguiente_platino),
    labelColor: Color = Accent,
    accentColor: Color = Accent,
    sharedTransitionScope: androidx.compose.animation.SharedTransitionScope? = null,
    animatedVisibilityScope: androidx.compose.animation.AnimatedVisibilityScope? = null,
) {
    val restantes = game.totalTrophies - game.earnedTrophies
    val aura = rememberCoverAuraColor(game.coverUrl)
    val shape = RoundedCornerShape(radio(20))
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(240.dp)
            // Sombra suave y borde en degradado sutil (blanco 12%→2%) en
            // vez de un borde plano de un solo color — mismo criterio que
            // "bordes más sofisticados" del documento de diseño: da
            // sensación de superficie elevada, no de rectángulo pintado.
            .shadow(
                elevation = 16.dp,
                shape = shape,
                ambientColor = Color.Black.copy(alpha = 0.4f),
                spotColor = Color.Black.copy(alpha = 0.4f),
            )
            .clip(shape)
            .border(1.dp, Brush.linearGradient(listOf(Color.White.copy(alpha = 0.12f), Color.White.copy(alpha = 0.02f))), shape)
            .premiumClickable { onClick() }
    ) {
        // Imagen de fondo con opacidad — sin degradado de respaldo aquí:
        // con coverUrl vacío simplemente no hay capa de fondo, el Box ya
        // tiene el gradiente oscuro de abajo encima.
        if (game.coverUrl.isNotBlank()) {
            AsyncImage(
                model = game.coverUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                // `blur` necesita API 31+ (RenderEffect) — por debajo se
                // queda sin desenfoque pero no rompe nada, sigue enseñando
                // la portada atenuada igual que antes.
                modifier = Modifier.fillMaxSize().blur(20.dp),
                alpha = 0.25f
            )
        }

        // Gradiente oscuro — con un toque del color de la propia carátula
        // en el medio cuando ya se conoce (Game Aura), no solo negro puro,
        // para que cada juego tenga su propia atmósfera. `labelColor`/
        // `accentColor` (dorado anclado / azul algorítmico) se quedan
        // igual: esto solo tiñe el ambiente, no lo que ya significa algo.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = if (aura != null) {
                            listOf(Color.Transparent, aura.copy(alpha = 0.22f), Background)
                        } else {
                            listOf(Color.Transparent, Background)
                        }
                    )
                )
        )

        // Contenido
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            val coverModifier = Modifier
                .width(100.dp)
                .height(140.dp)
                .clip(RoundedCornerShape(radio(12)))
                .border(1.dp, Border, RoundedCornerShape(radio(12)))
                .let { base ->
                    if (sharedTransitionScope != null && animatedVisibilityScope != null) {
                        with(sharedTransitionScope) {
                            base.sharedElement(
                                rememberSharedContentState(key = "game-cover-${game.id}"),
                                animatedVisibilityScope = animatedVisibilityScope,
                            )
                        }
                    } else base
                }

            // Portada pequeña
            GameCover(
                coverUrl = game.coverUrl,
                title = game.title,
                modifier = coverModifier
            )

            Spacer(modifier = Modifier.width(20.dp))

            // Con 0 trofeos restantes el juego YA está platinado — "SIGUIENTE
            // PLATINO"/"A POR ESTE PLATINO AHORA" (las etiquetas que pasan
            // los sitios que usan esta tarjeta) dejan de tener sentido, y
            // "¡A un paso!" para algo ya terminado sonaba a que le faltaba
            // uno, no a que ya estaba hecho — bug real visto en Biblioteca
            // con juegos platinados de verdad.
            // Platinado aunque queden DLC (lo que falta ya no es el platino).
            val terminado = restantes <= 0 || game.platinado
            val etiquetaFinal = if (terminado) Textos.t(T.panel_platinado) else label
            val colorEtiqueta = if (terminado) Platinum else labelColor
            Column {
                Text(
                    text = etiquetaFinal,
                    color = colorEtiqueta,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    modifier = Modifier
                        .background(colorEtiqueta.copy(alpha = 0.14f), RoundedCornerShape(radio(12)))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                )

                Text(
                    text = game.title,
                    color = Foreground,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    // Sin esto, un título largo ("Assassin's Creed Black
                    // Flag Remastered"...) se comía el hueco reservado
                    // para "trofeos restantes"/la barra de progreso más
                    // abajo, dejando la tarjeta con una altura distinta
                    // según el juego en vez de siempre 240dp.
                    maxLines = 2,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    lineHeight = 30.sp,
                    modifier = Modifier.padding(top = 8.dp, bottom = 12.dp)
                )

                if (!terminado) {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = restantes.toString(),
                            color = Platinum,
                            fontSize = 42.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = Textos.t(T.panel_restantes),
                            color = Muted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 6.dp, start = 4.dp)
                        )
                    }
                } else {
                    // Antes decía "¡A un paso!" también aquí — sonaba a que
                    // faltaba uno, cuando en realidad ya está platinado
                    // (bug real reportado con juegos de Biblioteca ya
                    // terminados). "0 trofeos restantes" sin más también
                    // suena a fallo, no a logro — de ahí el texto final.
                    Text(
                        text = Textos.t(T.panel_platinado_excl),
                        color = Platinum,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // ProgressBar — anima de 0 al valor real en vez de aparecer
                // ya llena, mismo criterio que el contador del Paragon Score.
                val progresoAnimado by androidx.compose.animation.core.animateFloatAsState(
                    targetValue = game.percent / 100f,
                    animationSpec = androidx.compose.animation.core.tween(800),
                    label = "progresoHero",
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .background(Surface2, RoundedCornerShape(radio(4)))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progresoAnimado)
                            .fillMaxHeight()
                            .background(accentColor, RoundedCornerShape(radio(4)))
                    )
                }
            }
        }
    }
}

/**
 * `sharedTransitionScope`/`animatedVisibilityScope` solo llegan no-nulos
 * desde `LibraryScreen` (ver `MainScreen.kt`) — es el único origen que hace
 * "volar" la carátula hasta `GameDetailHero` al tocar la tarjeta. El resto
 * de sitios donde se usa esta card (Panel) siguen sin pasarlos y no animan
 * nada especial, se quedan con el fundido normal de siempre.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun StandardGameCard(
    game: GameProgress,
    onClick: () -> Unit = {},
    sharedTransitionScope: SharedTransitionScope? = null,
    animatedVisibilityScope: AnimatedVisibilityScope? = null,
) {
    Box(
        modifier = Modifier
            .width(180.dp)
            .height(260.dp)
            .clip(RoundedCornerShape(radio(20)))
            .border(1.dp, Border, RoundedCornerShape(radio(20)))
            .background(Surface)
            .premiumClickable { onClick() }
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                val coverModifier = Modifier.fillMaxSize().let { base ->
                    if (sharedTransitionScope != null && animatedVisibilityScope != null) {
                        with(sharedTransitionScope) {
                            base.sharedElement(
                                rememberSharedContentState(key = "game-cover-${game.id}"),
                                animatedVisibilityScope = animatedVisibilityScope,
                            )
                        }
                    } else base
                }
                GameCover(
                    coverUrl = game.coverUrl,
                    title = game.title,
                    modifier = coverModifier,
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Background)
                            )
                        )
                )
                Text(
                    text = game.title,
                    color = Foreground,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(16.dp)
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${game.percent}%",
                        color = Accent,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${game.earnedTrophies}/${game.totalTrophies}",
                        color = Muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                val progresoAnimado by androidx.compose.animation.core.animateFloatAsState(
                    targetValue = game.percent / 100f,
                    animationSpec = androidx.compose.animation.core.tween(700),
                    label = "progresoStandard",
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(5.dp)
                        .background(Surface2, RoundedCornerShape(2.5.dp))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progresoAnimado)
                            .fillMaxHeight()
                            .background(Accent, RoundedCornerShape(2.5.dp))
                    )
                }
            }
        }
    }
}

/** Metal por `grade` ("bronze"/"silver"/"gold"/"platinum"), o `Muted` si es `null` (Steam/Xbox: un logro es un logro y ya). */
private fun gradeColor(grade: String?): Color = when (grade) {
    "bronze" -> Bronze
    "silver" -> Silver
    "gold" -> Gold
    "platinum" -> Platinum
    else -> Muted
}

/**
 * Fila de "Siguiente trofeo" — mismo recomendador que la portada web
 * (TrophyRecommendations.tsx): carátula pequeña, nombre del trofeo, y
 * "{juego} · {pct}% completado" debajo. Compacta a propósito (no es una
 * Hero Card): puede haber hasta 4 a la vez y el nombre del trofeo ya ocupa
 * sitio de sobra.
 */
@Composable
fun NextTrophyCard(trophy: NextTrophy, onClick: () -> Unit = {}) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .premiumClickable { onClick() }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GameCover(
            coverUrl = trophy.iconUrl ?: "",
            title = trophy.trophyName,
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(radio(10)))
                .border(1.dp, gradeColor(trophy.grade).copy(alpha = 0.5f), RoundedCornerShape(radio(10))),
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = trophy.trophyName,
                color = Foreground,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            )
            Text(
                text = Textos.t(T.panel_juego_progreso, trophy.gameTitle, trophy.gameProgress),
                color = Muted,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
        }

        // Rareza real (si la plataforma la da) antes que el metal: es el
        // dato que de verdad varía trofeo a trofeo, el metal ya se ve en el
        // borde de la carátula de arriba.
        trophy.rarityPercent?.let { rareza ->
            Text(
                text = "${formatDecimal(rareza.toDouble(), 1)}%",
                color = gradeColor(trophy.grade),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}

/**
 * "Últimos trofeos" — los conseguidos más recientes de toda la biblioteca,
 * como la sección del perfil web (RecentTrophies.tsx). Mismo aspecto que
 * "Para hoy" (GrupoNativo): una fila por trofeo con su foto y el borde de su
 * metal, el juego debajo, y hace cuánto y la rareza a la derecha.
 */
@Composable
fun UltimosTrofeos(trofeos: List<LatestTrophy>, onClick: (LatestTrophy) -> Unit, modifier: Modifier = Modifier) {
    com.paragon.app.ui.common.GrupoNativo(modifier = modifier) {
        trofeos.forEachIndexed { i, trofeo ->
            if (i > 0) com.paragon.app.ui.common.SeparadorFila()
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .premiumClickable { onClick(trofeo) }
                    .padding(horizontal = 16.dp, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                GameCover(
                    coverUrl = trofeo.iconUrl ?: trofeo.gameIconUrl ?: "",
                    title = trofeo.trophyName,
                    modifier = Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(radio(10)))
                        .border(1.dp, gradeColor(trofeo.grade).copy(alpha = 0.6f), RoundedCornerShape(radio(10))),
                )
                Column(Modifier.weight(1f).padding(start = 12.dp)) {
                    Text(
                        text = trofeo.trophyName,
                        color = Foreground,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    )
                    Text(
                        text = trofeo.gameTitle,
                        color = Muted,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 1.dp),
                    )
                }
                Column(horizontalAlignment = Alignment.End, modifier = Modifier.padding(start = 8.dp)) {
                    Text(text = trofeo.timeAgo, color = Muted, fontSize = 13.sp)
                    trofeo.rarityPercent?.let { rareza ->
                        Text(
                            text = "${formatDecimal(rareza, 1)}%",
                            color = gradeColor(trofeo.grade),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 1.dp),
                        )
                    }
                }
            }
        }
    }
}

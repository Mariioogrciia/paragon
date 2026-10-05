package com.paragon.shared

import androidx.compose.runtime.Composable

/** El contexto de la plataforma dentro de Compose (en Android, `contextoPlataforma()`). */
@Composable
expect fun contextoPlataforma(): ContextoPlataforma

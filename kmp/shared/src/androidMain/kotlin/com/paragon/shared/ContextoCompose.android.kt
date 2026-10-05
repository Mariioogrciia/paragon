package com.paragon.shared

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

@Composable
actual fun contextoPlataforma(): ContextoPlataforma = LocalContext.current

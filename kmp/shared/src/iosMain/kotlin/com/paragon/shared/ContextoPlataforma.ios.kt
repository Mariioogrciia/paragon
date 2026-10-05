package com.paragon.shared

actual abstract class ContextoPlataforma

/** En iOS no hay contexto que pasar: este basta para todo. */
object ContextoIOS : ContextoPlataforma()

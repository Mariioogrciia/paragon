package com.paragon.app.data

/**
 * Spotlight (5 nov 2026): cada vez que llega la biblioteca por red, iOS
 * indexa tus juegos para que buscar «Elden Ring» desde la pantalla de inicio
 * abra su ficha en Paragon. Lo pone AppIOS (iosMain); Android no lo usa.
 */
object IndiceBusqueda {
    var alCargarBiblioteca: ((List<LibraryGame>) -> Unit)? = null
}

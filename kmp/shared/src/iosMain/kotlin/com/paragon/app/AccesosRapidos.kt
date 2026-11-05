package com.paragon.app

import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/**
 * Accesos rápidos del icono en iOS (mantener pulsado, 5 nov 2026), con los
 * textos en el idioma de la app. Los pone AppDelegate.swift
 * (`AccesosRapidosKt.accesosRapidos()`); `ruta` es una ruta de la web que
 * la app ya sabe abrir (EnlaceAviso → rutaAppDeAviso), y `icono` un SF Symbol.
 * Los mismos cuatro que xml/shortcuts.xml en Android.
 */
data class AccesoRapido(val ruta: String, val titulo: String, val icono: String)

fun accesosRapidos(): List<AccesoRapido> = listOf(
    AccesoRapido("/enfoque", Textos.t(T.atajo_enfoque), "scope"),
    AccesoRapido("/biblioteca", Textos.t(T.atajo_biblioteca), "square.grid.2x2"),
    AccesoRapido("/ligas", Textos.t(T.atajo_ligas), "trophy"),
    AccesoRapido("/sesiones", Textos.t(T.atajo_sesiones), "person.2"),
)

/** Texto del recordatorio de racha, en el idioma de la app ({0} = días). */
fun textoRecordatorioRacha(dias: Int): String = Textos.t(T.recordatorio_racha, dias)

fun tituloRecordatorioRacha(): String = Textos.t(T.recordatorio_racha_titulo)

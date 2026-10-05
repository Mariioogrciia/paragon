package com.paragon.app.data.theme

import com.paragon.shared.red.AparienciaDto
import com.paragon.shared.red.GuardarAparienciaRequest

interface ThemeSettings {
    fun aplicarDeCuenta(dto: AparienciaDto)
    fun requestParaGuardar(): GuardarAparienciaRequest
}

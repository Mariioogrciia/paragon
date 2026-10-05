package com.paragon.app.ui.settings

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

actual fun setAppLanguage(lang: String) {
    val localeList = if (lang.isBlank()) LocaleListCompat.getEmptyLocaleList() else LocaleListCompat.forLanguageTags(lang)
    AppCompatDelegate.setApplicationLocales(localeList)
}

actual fun getAppLanguage(): String {
    return AppCompatDelegate.getApplicationLocales().takeIf { !it.isEmpty }?.get(0)?.language.orEmpty()
}

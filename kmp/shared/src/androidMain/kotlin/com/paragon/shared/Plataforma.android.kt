package com.paragon.shared

import android.os.Build

actual fun nombrePlataforma(): String = "Android ${Build.VERSION.RELEASE}"

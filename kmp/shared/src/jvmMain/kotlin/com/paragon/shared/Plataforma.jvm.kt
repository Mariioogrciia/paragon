package com.paragon.shared

actual fun nombrePlataforma(): String = "JVM ${System.getProperty("java.version")}"

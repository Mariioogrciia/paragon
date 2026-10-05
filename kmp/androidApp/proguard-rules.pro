# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Paragon (4 oct 2026): reglas para minificar la APK de producción ---
# Moshi (cachés locales) lee por reflexión las clases que guarda: nombres de
# campos y metadatos de Kotlin tienen que sobrevivir a R8. Los DTO de la API
# (kotlinx.serialization) no lo necesitan, pero se conservan por si alguna
# caché guarda uno.
-keep class com.paragon.app.data.** { *; }
-keep class com.paragon.shared.red.** { *; }
-keep class kotlin.Metadata { *; }
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
# Widget de Glance: el receptor lo instancia el sistema por nombre.
-keep class com.paragon.app.widget.** { *; }
-dontwarn org.slf4j.**

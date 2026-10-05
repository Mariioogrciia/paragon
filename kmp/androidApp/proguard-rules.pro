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
# Moshi lee los DTO por reflexión (KotlinJsonAdapterFactory + kotlin-reflect):
# nombres de campos y metadatos de Kotlin tienen que sobrevivir a R8.
-keep class com.paragon.app.data.network.** { *; }
-keep class kotlin.Metadata { *; }
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
# Retrofit con funciones suspend: el tipo de Continuation y las interfaces de la API.
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
# Widget de Glance: el receptor lo instancia el sistema por nombre.
-keep class com.paragon.app.widget.** { *; }
-dontwarn org.slf4j.**

import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// La app Android. Fase 1 de MIGRACION.md: es la de android/app trasladada tal
// cual (sin Capacitor); el código va pasando poco a poco a :shared.
plugins {
    id("com.android.application")
    kotlin("plugin.compose")
    id("com.google.gms.google-services")
}

/** El .jks de publicación, si quien compila lo da (ver signingConfigs). */
val claveRelease: File? = System.getenv("PARAGON_KEYSTORE")?.let { file(it) }?.takeIf { it.exists() }

android {
    namespace = "com.paragon.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.paragon.app"
        minSdk = 24
        targetSdk = 36
        // Subir en cada APK que se reparta (Android no instala encima una con
        // el mismo versionCode desde una tienda).
        versionCode = 2
        versionName = "1.1"
        // Al publicar, la CI pone el número de build (siempre creciente).
        System.getenv("PARAGON_VERSION_CODE")?.toIntOrNull()?.let { versionCode = it }
    }

    // Siempre la misma clave de depuración (la de androidApp/debug.keystore,
    // con la contraseña estándar "android"): sin esto, GitHub Actions firma
    // cada APK con una clave nueva y Android se niega a instalarla encima de
    // la anterior ("conflicto de paquete"). No es secreta: solo vale para debug.
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        // Clave de publicación (Google Play): solo existe si quien compila la
        // da por variables de entorno — en la CI, el workflow "Publicar en
        // las tiendas" la saca de los secretos del repo. Nunca va en el repo.
        if (claveRelease != null) {
            create("release") {
                storeFile = claveRelease
                storePassword = System.getenv("PARAGON_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("PARAGON_KEY_ALIAS")
                keyPassword = System.getenv("PARAGON_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            // R8: APK más pequeña y más rápida. Reglas propias en proguard-rules.pro.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Sin la clave de publicación sale sin firmar (no se puede subir a Play).
            if (claveRelease != null) signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_21) }
}

dependencies {
    implementation(project(":shared"))

    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.core:core-splashscreen:1.2.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.navigation:navigation-compose:2.9.5")

    // Misma numeración que Compose Multiplatform 1.12.1 (foundation/ui 1.12.1).
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("io.coil-kt.coil3:coil-compose:3.6.3")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.6.3")
    implementation("androidx.palette:palette-ktx:1.0.0")

    implementation("androidx.glance:glance-appwidget:1.1.1")

    // Room (la base) vive en :shared.

    implementation("androidx.work:work-runtime-ktx:2.10.5")

    // Red: la API es común (:shared, Ktor); aquí solo el motor OkHttp, con la
    // caché HTTP y el interceptor del modo demo (ver ApiClient.kt).
    implementation("io.ktor:ktor-client-okhttp:3.6.0")
    // Moshi solo para las cachés locales que aún no han pasado a :shared.
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")

    // Custom Tabs para el login (ver ComposeMainActivity.kt).
    implementation("androidx.browser:browser:1.8.0")

    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging")
}

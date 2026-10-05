plugins {
    kotlin("multiplatform")
    kotlin("plugin.compose")
    kotlin("plugin.serialization")
    id("org.jetbrains.compose")
    id("com.android.kotlin.multiplatform.library")
    id("com.google.devtools.ksp")
}

val versionCompose = "1.12.1"
val versionKtor = "3.6.0"
val versionCoil = "3.6.3"

kotlin {
    android {
        namespace = "com.paragon.shared"
        compileSdk = 37
        minSdk = 24
        withHostTest {}
        // Sin esto los recursos comunes (composeResources: logo, iconos) no
        // entran en el APK y la app se cierra al pintarlos.
        androidResources { enable = true }
    }

    listOf(iosArm64(), iosSimulatorArm64()).forEach { target ->
        target.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation("org.jetbrains.compose.runtime:runtime:$versionCompose")
            implementation("org.jetbrains.compose.foundation:foundation:$versionCompose")
            implementation("org.jetbrains.compose.ui:ui:$versionCompose")
            implementation("org.jetbrains.compose.material3:material3:1.12.0-alpha03")
            // Imágenes comunes (logo, iconos de plataformas): src/commonMain/composeResources.
            implementation("org.jetbrains.compose.components:components-resources:$versionCompose")
            implementation("org.jetbrains.compose.material:material-icons-extended:1.7.3")
            implementation("io.ktor:ktor-client-core:$versionKtor")
            implementation("io.ktor:ktor-client-content-negotiation:$versionKtor")
            implementation("io.ktor:ktor-serialization-kotlinx-json:$versionKtor")
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
            // Calendario (días que quedan del mes) en común.
            implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.8.0")
            implementation("io.coil-kt.coil3:coil-compose:$versionCoil")
            implementation("io.coil-kt.coil3:coil-network-ktor3:$versionCoil")
            implementation("org.jetbrains.androidx.navigation:navigation-compose:2.10.0-beta01")
            implementation("org.jetbrains.androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")
            // Base local (cachés y diario de sesiones): Room con SQLite propio.
            api("androidx.room:room-runtime:2.8.5")
            implementation("androidx.sqlite:sqlite-bundled:2.6.2")
            // Sesión: SharedPreferences en Android, Llavero en iOS.
            api("com.russhwolf:multiplatform-settings:1.3.0")
            // AES-GCM del login (EnlaceSeguro): JDK en Android, CryptoKit en iOS.
            implementation("dev.whyoleg.cryptography:cryptography-core:0.6.0")
            implementation("dev.whyoleg.cryptography:cryptography-provider-optimal:0.6.0")
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation("com.russhwolf:multiplatform-settings-test:1.3.0")
        }
        iosMain.dependencies {
            implementation("io.ktor:ktor-client-darwin:$versionKtor")
        }
        androidMain.dependencies {
            implementation("io.ktor:ktor-client-okhttp:$versionKtor")
            implementation("androidx.palette:palette-ktx:1.0.0")
            // Idioma por app (Ajustes → Idioma), ver LanguagePlatform.android.kt.
            implementation("androidx.appcompat:appcompat:1.7.1")
            // Custom Tab del login (abrirLoginEnNavegador).
            implementation("androidx.browser:browser:1.8.0")
        }
    }
}

// El compilador de Room genera la base para cada plataforma.
dependencies {
    listOf("kspAndroid", "kspIosArm64", "kspIosSimulatorArm64").forEach {
        add(it, "androidx.room:room-compiler:2.8.5")
    }
}

compose.resources {
    packageOfResClass = "com.paragon.shared.recursos"
    publicResClass = true
}

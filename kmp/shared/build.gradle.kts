plugins {
    kotlin("multiplatform")
    kotlin("plugin.compose")
    kotlin("plugin.serialization")
    id("org.jetbrains.compose")
    id("com.android.kotlin.multiplatform.library")
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
            implementation("io.ktor:ktor-client-core:$versionKtor")
            implementation("io.ktor:ktor-client-content-negotiation:$versionKtor")
            implementation("io.ktor:ktor-serialization-kotlinx-json:$versionKtor")
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
            implementation("io.coil-kt.coil3:coil-compose:$versionCoil")
            implementation("io.coil-kt.coil3:coil-network-ktor3:$versionCoil")
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
        }
    }
}

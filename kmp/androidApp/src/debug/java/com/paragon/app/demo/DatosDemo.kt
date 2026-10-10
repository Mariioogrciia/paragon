package com.paragon.app.demo

/**
 * Respuestas de ejemplo del modo demo (ver ModoDemo.kt). Datos inventados
 * pero con la forma exacta de la API real; carátulas del CDN público de
 * Steam para que las tarjetas se vean como en uso de verdad.
 */
object DatosDemo {
    private fun portada(appId: Int) = "https://cdn.cloudflare.steamstatic.com/steam/apps/$appId/library_600x900.jpg"

    private data class J(val id: String, val plat: String, val titulo: String, val app: Int, val pct: Int, val def: Int, val gan: Int, val horas: Int?)

    private val juegos = listOf(
        J("psn-elden", "psn", "Elden Ring", 1245620, 92, 42, 39, 214),
        J("steam-1145360", "steam", "Hades", 1145360, 100, 49, 49, 96),
        J("psn-gow", "psn", "God of War Ragnarök", 1593500, 81, 36, 29, 61),
        J("steam-367520", "steam", "Hollow Knight", 367520, 74, 63, 47, 58),
        J("xbox-bg3", "xbox", "Baldur's Gate 3", 1086940, 38, 54, 21, 120),
        J("steam-504230", "steam", "Celeste", 504230, 100, 32, 32, 41),
        J("psn-spidey", "psn", "Marvel's Spider-Man 2", 1817070, 95, 42, 40, 37),
        J("steam-814380", "steam", "Sekiro: Shadows Die Twice", 814380, 12, 34, 4, 9),
        J("epic-cyber", "epic", "Cyberpunk 2077", 1091500, 55, 57, 31, null),
        J("steam-413150", "steam", "Stardew Valley", 413150, 0, 40, 0, 0),
    )

    private fun tarjeta(j: J) =
        """{"id":"${j.id}","title":"${j.titulo}","coverUrl":"${portada(j.app)}","earnedTrophies":${j.gan},"totalTrophies":${j.def},"percent":${j.pct}}"""

    private fun biblioteca(j: J, i: Int) =
        """{"id":"${j.id}","platform":"${j.plat}","title":"${j.titulo}","deviceLabel":"PS5","iconUrl":"${portada(j.app)}","progressPercent":${j.pct},"definedTotal":${j.def},"earnedTotal":${j.gan},"defined":{"bronze":${j.def - 9},"silver":6,"gold":2,"platinum":1},"earned":{"bronze":${maxOf(0, j.gan - 7)},"silver":${minOf(5, j.gan)},"gold":${if (j.gan > 20) 2 else 0},"platinum":${if (j.pct == 100) 1 else 0}},"isWishlist":false,"isPinned":${i == 0},"lastPlayedAt":"2026-10-0${1 + i % 3}T20:00:00.000Z","playtimeMinutes":${j.horas?.times(60) ?: "null"}}"""

    private val trofeos = listOf(
        Triple("Elden Lord", "platinum", 6.1), Triple("Señor de la llama", "gold", 11.4), Triple("Maestro de las artes marciales", "gold", 18.4),
        Triple("Leyenda del Ceniciento", "silver", 24.0), Triple("Primera Sangre", "bronze", 88.2), Triple("Arma legendaria", "silver", 31.7),
        Triple("Hechizo legendario", "bronze", 29.9), Triple("Cenizas legendarias", "bronze", 35.2),
    )

    fun respuesta(metodo: String, ruta: String): String? {
        if (metodo != "GET") return when {
            ruta.endsWith("/react") -> """{"reacted":true}"""
            ruta.endsWith("/view") -> """{"isNew":false}"""
            ruta.endsWith("/pin") -> """{"pinned":true}"""
            ruta.endsWith("/reserve") -> """{"reservado":true}"""
            ruta.endsWith("/resync") -> """{"nuevos":0}"""
            ruta == "api/mobile/appearance" -> null // POST: sin respuesta, se queda lo elegido en el teléfono
            else -> """{"ok":true}"""
        }
        return when {
            ruta == "api/mobile/panel" ->
                """{"profile":{"handle":"lagrena","name":"La Greña","level":42,"psnId":"lagrena_69","image":null},"stats":{"platinums":87,"trophies":4312,"games":214,"completionRate":68,"gold":341,"silver":812,"bronze":3072},"racha":{"actual":6,"mejor":23}}"""
            ruta == "api/mobile/panel/highlights" ->
                """{"nearPlatinum":[${juegos.filter { it.pct in 80..99 }.joinToString(",") { tarjeta(it) }}],"recent":[${juegos.take(5).joinToString(",") { tarjeta(it) }}],"nextTrophies":[""" +
                    trofeos.drop(1).take(4).mapIndexed { i, (n, g, r) -> """{"gameId":"psn-elden","gameTitle":"Elden Ring","trophyId":"t$i","trophyName":"$n","detail":"Derrota a un enemigo poderoso.","rarityPercent":$r,"gameProgress":92,"iconUrl":null,"grade":"$g"}""" }.joinToString(",") + "]," +
                    "\"latestTrophies\":[" + trofeos.take(5).mapIndexed { i, (n, g, r) -> """{"gameId":"${juegos[i].id}","gameTitle":"${juegos[i].titulo}","gameIconUrl":"${portada(juegos[i].app)}","trophyId":"t$i","trophyName":"$n","iconUrl":null,"grade":"$g","earnedAt":"2026-10-0${5 - i}T20:00:00.000Z","rarityPercent":$r}""" }.joinToString(",") + "]}"
            ruta == "api/mobile/library" -> """{"games":[${juegos.mapIndexed { i, j -> biblioteca(j, i) }.joinToString(",")}]}"""
            ruta.startsWith("api/mobile/games/") && ruta.count { it == '/' } == 3 -> {
                val j = juegos.firstOrNull { ruta.endsWith(it.id) } ?: juegos[0]
                val lista = trofeos.mapIndexed { i, (n, g, r) ->
                    val ganado = i % 3 != 1
                    """{"id":"t$i","name":"$n","detail":"Consigue algo memorable en ${j.titulo}.","grade":"$g","earned":$ganado,"earnedAt":${if (ganado) "\"2026-0${1 + i}-1${i}T18:30:00.000Z\"" else "null"},"rarityPercent":$r,"iconUrl":null}"""
                }.joinToString(",")
                """{"game":{"id":"${j.id}","platform":"${j.plat}","title":"${j.titulo}","iconUrl":"${portada(j.app)}","progressPercent":${j.pct},"definedTotal":${j.def},"earnedTotal":${j.gan},"isPinned":false,"notes":null,"playtimeMinutes":${j.horas?.times(60) ?: "null"},"trophies":[$lista]}}"""
            }
            // Precios y "Platinos de oferta" (8 oct 2026), con datos reales de ese día.
            ruta.startsWith("api/mobile/games/") && ruta.endsWith("/precios") ->
                """{"precios":{"steamAppId":"1245620","precio":{"final":35.99,"inicial":59.99,"descuento":40},"ofertas":[{"tienda":"GreenManGaming","precio":31.49,"precioOriginal":59.99,"ahorro":48,"url":"https://www.cheapshark.com"}],"minimoHistoricoUsd":23.99,"alerta":null}}"""
            ruta == "api/mobile/price-alerts" ->
                """{"alertas":[{"steamAppId":"814380","gameId":"steam-814380","titulo":"Sekiro: Shadows Die Twice","precioObjetivo":25.0,"precio":{"final":23.99,"inicial":59.99,"descuento":60},"avisadoAt":"2026-10-07T10:00:00.000Z"},{"steamAppId":"1145360","gameId":"steam-1145360","titulo":"Hades","precioObjetivo":8.0,"precio":{"final":24.5,"inicial":24.5,"descuento":0},"avisadoAt":null}]}"""
            ruta == "api/mobile/platinos-oferta" ->
                """{"ofertas":[""" + listOf(
                    Triple(1170880 to "The Last Campfire", 1.47 to 14.79, Triple(22, 25.0, 3)),
                    Triple(390290 to "Bulb Boy", 0.89 to 8.99, Triple(12, 10.3, 4)),
                    Triple(304430 to "INSIDE", 2.29 to 22.99, Triple(14, 14.0, 4)),
                    Triple(1013310 to "Yoku's Island Express", 1.99 to 19.99, Triple(31, 6.9, 5)),
                ).joinToString(",") { (juego, precio, dif) ->
                    val (app, titulo) = juego
                    val (logros, raro, nivel) = dif
                    val color = if (nivel <= 3) "#6a9c56" else if (nivel == 4) "#8fa347" else "#b8a53a"
                    """{"steamAppId":"$app","titulo":"$titulo","caratula":"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/$app/header.jpg","precio":{"final":${precio.first},"inicial":${precio.second},"descuento":90},"precioUsd":${precio.first},"ahorro":90,"logros":$logros,"logroMasRaro":$raro,"dificultad":{"nivel":$nivel,"etiqueta":"","color":"$color"},"horas":null,"gameId":null,"url":"https://store.steampowered.com/app/$app/"}"""
                } + "]}"
            ruta == "api/mobile/milestone" ->"""{"hito":null,"proximo":{"numero":25,"faltan":11}}"""
            ruta == "api/mobile/racha" ->
                """{"actual":6,"mejor":23,"diasActivos":148,"dias":[${(0 until 35).joinToString(",") { """{"dia":"2026-09-${"%02d".format(1 + it % 30)}","trofeos":${listOf(0, 2, 5, 0, 1, 8, 3)[it % 7]}}""" }}]}"""
            ruta == "api/mobile/feed" ->
                """{"items":[
                  {"id":"a1","type":"platinum","rating":null,"review":null,"createdAt":"2026-10-04T09:00:00.000Z","user":{"id":"u2","handle":"nerea","name":"Nerea","image":null},"game":{"id":"steam-1145360","title":"Hades","iconUrl":"${portada(1145360)}","deviceLabel":"PC"},"reactions":12,"reacted":true,"miReaccion":"fuego","comments":[{"activityId":"a1","body":"¡Enhorabuena! Ese Heat 32 es una locura","userName":"Iker","createdAt":"2026-10-04T09:30:00.000Z"}],"views":31},
                  {"id":"a2","type":"review","rating":9,"review":"La mejor campaña que he jugado este año. El tramo final te deja sin aliento.","createdAt":"2026-10-03T21:00:00.000Z","user":{"id":"u3","handle":"iker","name":"Iker","image":null},"game":{"id":"psn-gow","title":"God of War Ragnarök","iconUrl":"${portada(1593500)}","deviceLabel":"PS5"},"reactions":4,"reacted":false,"miReaccion":null,"comments":[],"views":18},
                  {"id":"a3","type":"status","rating":null,"review":"Esta semana voy a por el platino de Sekiro. Deseadme suerte con el Monje Corrupto.","createdAt":"2026-10-02T18:00:00.000Z","user":{"id":"u1","handle":"lagrena","name":"La Greña","image":null},"game":null,"reactions":7,"reacted":false,"miReaccion":null,"comments":[],"views":25}
                ]}"""
            ruta == "api/mobile/social" ->
                """{"amigos":[
                  {"userId":"u2","name":"Nerea","handle":"nerea","avatarUrl":null,"trophyLevel":51,"platinos":112,"trofeos":5120,"juegos":240,"completadoMedio":71,"accounts":[{"platform":"psn","username":"nerea_ps"},{"platform":"steam","username":"Nerea"}]},
                  {"userId":"u3","name":"Iker","handle":"iker","avatarUrl":null,"trophyLevel":33,"platinos":54,"trofeos":2981,"juegos":163,"completadoMedio":59,"accounts":[{"platform":"xbox","username":"IkerGT"}]}
                ],"liga":[
                  {"userId":"u2","handle":"nerea","name":"Nerea","image":null,"points":1840},
                  {"userId":"u1","handle":"lagrena","name":"La Greña","image":null,"points":1615},
                  {"userId":"u3","handle":"iker","name":"Iker","image":null,"points":990}
                ]}"""
            ruta == "api/mobile/leagues" -> """{"leagues":[{"id":"l1","name":"Los de siempre","ownerId":"u1","memberCount":4,"endsAt":"2026-12-31T23:59:59.000Z"},{"id":"l2","name":"Para el finde","ownerId":"u2","memberCount":3,"endsAt":null}]}"""
            ruta == "api/mobile/leagues/invites" -> """{"invites":[{"id":"l3","name":"Otra liga","ownerId":"u3","ownerName":"Iker"}]}"""
            ruta == "api/mobile/clans" -> """{"clans":[{"id":"c1","name":"Cazadores del Alba","tag":"ALBA","description":"Platinos al amanecer.","memberCount":12,"emblema":"emblema:1:hexagono:llama:1:9"},{"id":"c2","name":"Fontaneros","tag":"FONT","description":"De Mario y poco más.","memberCount":5,"emblema":"emblema:1:circulo:mando:0:9"}],"myClan":{"tag":"ALBA","name":"Cazadores del Alba","role":"owner","emblema":"emblema:1:hexagono:llama:1:9"}}"""
            ruta == "api/mobile/clans/invites" -> """{"invites":[]}"""
            ruta == "api/mobile/clans/ALBA" -> """{"clan":{"id":"c1","tag":"ALBA","name":"Cazadores del Alba","description":"Platinos al amanecer.","emblema":"emblema:1:hexagono:llama:1:9"},"score":18450,"amIMember":true,"amIOwner":true,"miRango":"owner","puedoEditar":true,"puedoInvitar":true,"leaderboard":[{"userId":"u2","role":"veterano","handle":"nerea","name":"Nerea","image":null,"score":9200,"trofeos":5120},{"userId":"u1","role":"owner","handle":"lagrena","name":"La Greña","image":null,"score":9250,"trofeos":4312}],"activity":[],"invitables":[]}"""
            ruta == "api/mobile/achievements" -> """{"badges":[{"id":"b1","name":"Primer platino","description":"Tu primer platino en Paragon.","earnedAt":"2026-01-12T10:00:00.000Z"},{"id":"b2","name":"Racha de 7","description":"Siete días seguidos con trofeos.","earnedAt":"2026-03-02T10:00:00.000Z"}],"trophyCase":[{"kind":"liga","rank":1,"titulo":"Liga Mensual · septiembre de 2026","earnedAt":"2026-10-01T00:00:00.000Z"}]}"""
            ruta == "api/mobile/diet" -> """{"dieta":null}"""
            ruta == "api/mobile/stats" ->
                """{"paragonScore":{"total":18420,"porPlataforma":[{"platform":"psn","puntos":11200,"trofeos":2900},{"platform":"steam","puntos":5100,"trofeos":1100},{"platform":"xbox","puntos":2120,"trofeos":312}]},
                   "trophyDna":{"ejes":[{"key":"rareza","label":"Rareza","valor":72,"trofeos":310},{"key":"completismo","label":"Completismo","valor":81,"trofeos":2900},{"key":"variedad","label":"Variedad","valor":55,"trofeos":800},{"key":"constancia","label":"Constancia","valor":64,"trofeos":1500},{"key":"velocidad","label":"Velocidad","valor":47,"trofeos":600}],"arquetipo":"Completista"},
                   "estiloDeCaza":{"nombre":"Francotirador","descripcion":"Pocos juegos, pero te los agotas de verdad."},
                   "rachas":{"actual":6,"mejor":23,"diasActivos":148},"historico":{"conFecha":4100,"esteAnio":612,"mejorMes":{"mes":"marzo de 2026","total":143}},
                   "financiero":{"totalGastado":1240.5,"totalHoras":2210.0,"costeHoraMedio":0.56,"juegosConDatos":38},
                   "eficiencia":{"ritmoMedioPct":18,"juegosConDatos":21},"backlog":{"juegosContados":9,"horasHistoriaRestantes":84.5,"horasPlatinoRestantes":231.0},
                   "horasTotales":3120,
                   "hitos":{"primerTrofeo":{"gameId":"psn-elden","tituloJuego":"Uncharted 2","nombre":"Primer tesoro","iconUrl":null,"grade":"bronze","fecha":"2011-02-14T18:00:00.000Z"},"primerPlatino":{"gameId":"psn-x","titulo":"Uncharted 2","iconUrl":null,"fecha":"2011-05-02T18:00:00.000Z"},"trofeoMasRaro":{"gameId":"steam-1145360","tituloJuego":"Hades","nombre":"Es hora de cambiar","iconUrl":null,"rarityPercent":0.8,"fecha":"2025-11-03T18:00:00.000Z"},"platinoAnejo":{"gameId":"psn-elden","titulo":"Elden Ring","iconUrl":null,"dias":540,"desde":"2024-03-01T00:00:00.000Z","hasta":"2025-08-23T00:00:00.000Z"},"rachaMasLarga":{"dias":23,"desde":"2026-02-01T00:00:00.000Z","hasta":"2026-02-23T00:00:00.000Z"},"platinosHitos":[{"numero":50,"gameId":"steam-504230","titulo":"Celeste","iconUrl":"${portada(504230)}","fecha":"2024-06-10T18:00:00.000Z"}]}}"""
            ruta == "api/mobile/accounts" ->
                """{"oauth":[{"provider":"google","linked":true,"configured":true},{"provider":"discord","linked":false,"configured":true}],"platforms":[{"platform":"psn","linked":true,"username":"lagrena_69","level":412,"declared":false,"appLinkable":true},{"platform":"steam","linked":true,"username":"LaGreña","level":null,"declared":false,"appLinkable":true},{"platform":"xbox","linked":false,"username":null,"level":null,"declared":false,"appLinkable":true},{"platform":"epic","linked":false,"username":null,"level":null,"declared":true,"appLinkable":false}]}"""
            ruta == "api/mobile/appearance" -> null // sin cuenta: se queda la apariencia del teléfono
            ruta == "api/mobile/collections" -> """{"collections":[{"id":"k1","name":"Soulslike","gameIds":["psn-elden","steam-814380","steam-367520"]},{"id":"k2","name":"Para el verano","gameIds":["steam-413150"]}]}"""
            else -> null
        }
    }
}

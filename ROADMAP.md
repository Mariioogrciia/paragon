# Roadmap

## Hecho

### Esqueleto (2026-09-02)

Modelo de datos y lógica de progreso separados de la UI, biblioteca por jugador,
detalle de juego con "próximos pasos", comparativa.

### Multiusuario y conexión real con PSN (2026-09-02)

El proyecto dejó de ser "para mí y para mi padre alternando perfiles" y pasó a
ser una app con cuentas:

- Login con Google o Discord (Auth.js). Sin contraseñas propias.
- Handle de plataforma (`@usuario`), elegido en el alta, por donde se añaden los
  amigos.
- Vinculación de PSN escribiendo solo el ID de PlayStation. Una única credencial
  de servidor (`PSN_NPSSO`) resuelve los perfiles públicos de todos.
- Biblioteca real desde PSN, con caché de 15 minutos.
- Amigos: solicitudes, aceptar, quitar, y comparativa uno contra uno.

**Pendiente de verificar en ejecución.** Compila y tipa limpio, pero nada de esto
se ha probado contra PSN, Google/Discord ni una base de datos real todavía —
hacen falta las credenciales.

### Persistencia y conexión real verificada (2026-09-02)

Trofeos y juegos guardados en Postgres; las páginas leen de nuestra base y no de
Sony. Probado de extremo a extremo con una cuenta real: 265 juegos importados.

Ver **HALLAZGOS.md** — hay cuatro cosas que rompen suposiciones del diseño
original, entre ellas que PSN no deja leer los trofeos de desconocidos y que el
progreso parcial de los trofeos no existe en los datos.

## Siguiente

### 0. Decidir cómo entra gente que no sea amiga en PSN

Es la decisión bloqueante. O cada usuario aporta su propio NPSSO (funciona con
cualquiera, pero guardamos credenciales de terceros y caducan cada ~2 meses), o
se acepta que solo entren amigos de PlayStation de la cuenta del servidor. Ver
HALLAZGOS.md §1.

### 1. Arrancarlo de verdad

Crear el Postgres, las apps de OAuth y sacar el NPSSO (ver README). El primer
recorrido completo — entrar, elegir handle, vincular PSN, ver la biblioteca — es
lo que va a destapar los fallos que el compilador no ve.

### 2. Histórico

Los trofeos ya se guardan, pero solo el estado actual: cada sincronización
sobrescribe. Guardar también *cuándo* cambió cada cosa es lo que habilita rachas,
evolución y "qué platinaste este mes".

### 3. Niveles y ranking

PSN ya da su propio nivel de trofeos y lo mostramos. Falta decidir si calculamos
uno propio que premie cosas distintas (platinos raros, constancia, variedad) y un
ranking **entre amigos, no global** — un ranking global nos pondría a competir con
Exophase y PSNProfiles, que es justo lo que no queremos.

Depende del punto 2: sin histórico no hay rachas ni evolución que rankear.

### 4. Guías por trofeo

Existía en el esqueleto y se perdió al pasar a multiusuario: era `localStorage`,
que no tiene sentido cuando hay cuentas. Rehacerlo contra la base de datos, y
decidir si el enlace es privado de cada uno o compartido entre todos.

### 5. Recomendaciones

Sin ML: reglas simples sobre géneros y metadatos de IGDB o RAWG. "Mismo género que
lo que ya platinaste, con platino asequible".

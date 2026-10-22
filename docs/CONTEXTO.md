# Contexto del Proyecto: Paragon (Platinos)

## 🎮 ¿Qué es Paragon?
Paragon (referenciado en el código como "platinos") es una plataforma web integral, diseñada bajo los estándares de una Progressive Web App (PWA), centrada en el seguimiento, gestión y gamificación de trofeos y logros multiplataforma. 
Permite a los jugadores unificar su progreso de ecosistemas tradicionalmente separados (PlayStation, Xbox, Steam, etc.) en un único lugar "agnóstico", creando un perfil universal de jugador.

## 🎯 ¿Para qué es? (Propósito Principal)
El propósito de Paragon es resolver la fragmentación que existe en el mundo del *gaming* actual. Un jugador que disfruta de juegos en consola y en PC suele tener sus logros aislados en cada ecosistema. Paragon centraliza esta experiencia para que el usuario pueda:
1. **Unificar su progreso:** Ver todos sus logros y el 100% de sus juegos en un solo tablero.
2. **Consultar y crear guías:** Acceder a guías de trofeos detalladas para conseguir logros complejos de manera más fácil.
3. **Planificar:** Organizar su *backlog* (juegos pendientes) mediante la herramienta del "Planificador".
4. **Analizar su historia:** Ver estadísticas detalladas, progreso por plataformas y resúmenes de estilo "Wrapped" sobre sus hábitos de juego.

## 🚀 ¿Qué se quiere buscar? (Visión y Objetivos)
Más allá de ser un simple rastreador de bases de datos, Paragon busca crear una **comunidad social, competitiva y sana** para los "cazadores de logros" (Trophy Hunters). Los objetivos clave de la plataforma son:

*   **Gamificación (El Nivel Paragon):** Todo trofeo o logro conseguido en cualquier plataforma aporta experiencia a un nivel global del usuario dentro de Paragon (*Paragon Level*), premiando la dedicación sin importar dónde juegue.
*   **Competitividad sana:** A través de un sistema de **Ligas** y **Rankings**, los usuarios pueden medir su progreso contra sus amigos y contra la comunidad global.
*   **Identidad *Gamer* Universal:** A través del perfil público (que incluye un CV Gamer, insignias/Badges de hitos logrados y estadísticas comparativas), se le otorga al usuario una identidad digital que trasciende la consola específica que utilice.
*   **Descubrimiento:** Ayudar a los usuarios a encontrar su próximo desafío a través de secciones de "Descubrir", calendarios de próximos lanzamientos y recomendaciones basadas en sus géneros favoritos.

## 🧱 Arquitectura y Estructura (Resumen de Alto Nivel)
*   **Framework:** Construido sobre **Next.js** (App Router) y React.
*   **PWA:** Soporte para instalación y funcionamiento offline (Service Workers, manifiesto web).
*   **Base de Datos & Tipado:** Esquemas fuertemente tipados (TypeScript) para manejar relaciones complejas (Usuarios -> Cuentas Vinculadas -> Juegos -> Trofeos).
*   **Integración de Datos:** Sistemas de sincronización (Sync) que actúan como puentes para absorber los datos de las distintas APIs externas (PSN, Steam, Xbox).

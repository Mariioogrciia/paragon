import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-4 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        ← Volver al inicio
      </Link>

      <div className="space-y-4">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">
          Política de Privacidad
        </h1>
        <p className="text-sm text-muted">Última actualización: Septiembre 2026</p>
      </div>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">1. Información que recopilamos</h2>
        <p>
          En <strong>Paragon</strong>, nos tomamos muy en serio tu privacidad. Solo recopilamos los datos estrictamente necesarios para ofrecerte el servicio:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted">
          <li><strong>Datos de autenticación:</strong> Nombre, dirección de correo electrónico y foto de perfil pública proporcionados a través de proveedores de inicio de sesión de terceros (como Google o Discord).</li>
          <li><strong>Identificadores de juego:</strong> Identificador público de PlayStation Network (PSN ID) o Steam ID que decidas vincular voluntariamente.</li>
          <li><strong>Datos de logros y juegos:</strong> Información pública sobre tus juegos, trofeos y horas jugadas extraída de las APIs oficiales o públicas de dichas plataformas.</li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">2. Uso de la información</h2>
        <p>Los datos recopilados se utilizan única y exclusivamente para:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted">
          <li>Permitirte iniciar sesión y gestionar tu cuenta en Paragon.</li>
          <li>Calcular y mostrar tus estadísticas de trofeos, logros y progreso.</li>
          <li>Facilitar la comparación y el feed de actividad con amigos dentro de la plataforma.</li>
        </ul>
        <p className="text-muted">
          <strong>Nunca</strong> vendemos, alquilamos ni compartimos tus datos personales con terceras empresas para fines comerciales o publicitarios.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">3. Seguridad de tus credenciales</h2>
        <p className="text-muted">
          Paragon <strong>nunca solicita ni almacena contraseñas de tus cuentas de PlayStation o Steam</strong>. La sincronización se realiza mediante identificadores públicos sin requerir credenciales confidenciales de Sony ni de Valve.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">4. Eliminación de datos</h2>
        <p className="text-muted">
          Puedes solicitar la eliminación completa de tu cuenta y todos los datos asociados en cualquier momento desde los ajustes de tu perfil o poniéndote en contacto con el administrador.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold text-foreground">5. Contacto</h2>
        <p className="text-muted">
          Si tienes alguna duda sobre esta política de privacidad, puedes contactarnos a través del correo de soporte técnico indicado en la plataforma.
        </p>
      </section>
    </div>
  );
}

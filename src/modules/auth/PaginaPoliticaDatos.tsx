import { Tarjeta } from '@/components/ui';
import { configuracionSincrona } from '@/services/configuracion';

/**
 * Texto de la política de tratamiento de datos, enlazado desde el consentimiento
 * del registro. La versión vigente viene de la configuración de plataforma y es
 * la que se guarda junto a la aceptación de cada organización.
 */
export function PaginaPoliticaDatos() {
  const version = configuracionSincrona().versionPoliticaDatos;

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Política de tratamiento de datos personales</h1>
        <p className="mt-2 text-sm text-tinta-suave">Versión {version} · Skilly SpA, Chile</p>
      </header>

      <Tarjeta relleno="lg" className="flex flex-col gap-5 text-sm leading-relaxed text-tinta-suave">
        <section>
          <h2 className="text-base font-semibold text-tinta">Qué datos guardamos</h2>
          <p className="mt-1.5">
            De tu organización guardamos la razón social, el RUT, el giro, el tamaño y los datos de la persona
            de contacto. De tu actividad en la plataforma guardamos las reservas que haces, los mensajes que
            envías al agendar y las evaluaciones que escribes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-tinta">Para qué los usamos</h2>
          <p className="mt-1.5">
            Para conectarte con profesionales, coordinar las reservas, emitir los documentos del servicio y
            responderte cuando nos escribes. No vendemos tus datos ni los compartimos con terceros con fines
            publicitarios.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-tinta">Con quién los compartimos</h2>
          <p className="mt-1.5">
            El profesional que agendas ve el nombre de tu organización, el servicio solicitado y el mensaje que
            le escribes. No ve tu RUT ni tus datos de facturación hasta que la reserva queda confirmada.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-tinta">Cuánto tiempo los conservamos</h2>
          <p className="mt-1.5">
            Mientras tu cuenta esté activa y, después de cerrarla, el tiempo que la ley chilena exige para
            respaldar documentos tributarios y laborales.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-tinta">Tus derechos</h2>
          <p className="mt-1.5">
            Puedes pedirnos acceder a tus datos, corregirlos, eliminarlos o retirar tu autorización cuando
            quieras, escribiendo a <a href="mailto:datos@skilly.cl" className="underline">datos@skilly.cl</a>.
            Te responde una persona del equipo, no un formulario automático.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-tinta">Registro de tu autorización</h2>
          <p className="mt-1.5">
            Cuando aceptas esta política dejamos registro de la fecha, la hora y la versión del texto que
            aceptaste. Puedes revisarlo en cualquier momento desde el perfil de tu organización.
          </p>
        </section>
      </Tarjeta>
    </article>
  );
}

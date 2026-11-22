import { listarOrganizacionesAdmin } from '@/services/admin';
import { useRecurso } from '@/lib/useRecurso';
import { ETIQUETA_TAMANO, formatearFechaCorta, formatearFechaHoraExacta } from '@/lib/formato';
import { Esqueleto, EstadoError, EstadoVacio, Tarjeta } from '@/components/ui';

export function PaginaOrganizacionesAdmin() {
  const lista = useRecurso(() => listarOrganizacionesAdmin(), []);

  if (lista.error) return <EstadoError mensaje={lista.error} reintentar={lista.recargar} />;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Organizaciones</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">Empresas registradas y el registro de su consentimiento de datos.</p>
      </header>

      {lista.cargando ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Esqueleto key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (lista.datos ?? []).length === 0 ? (
        <EstadoVacio titulo="Todavía no hay organizaciones registradas" />
      ) : (
        <ul className="flex flex-col gap-2">
          {(lista.datos ?? []).map((o) => (
            <li key={o.id}>
              <Tarjeta relleno="sm" className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[1fr_1fr_1fr]">
                <div>
                  <p className="font-medium">{o.razonSocial}</p>
                  <p className="text-xs text-tinta-suave">
                    RUT {o.rut} · {o.giro}
                  </p>
                  <p className="text-xs text-tinta-tenue">{ETIQUETA_TAMANO[o.tamano]}</p>
                </div>
                <div>
                  <p className="text-xs text-tinta-tenue">Contacto</p>
                  <p>{o.nombreContacto}</p>
                  <p className="text-xs text-tinta-suave">{o.emailContacto}</p>
                </div>
                <div>
                  <p className="text-xs text-tinta-tenue">Registrada el {formatearFechaCorta(o.creadaEn)}</p>
                  <p className="text-xs text-tinta-suave">
                    Consentimiento v{o.consentimiento.version} aceptado el {formatearFechaHoraExacta(o.consentimiento.fecha)}
                  </p>
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

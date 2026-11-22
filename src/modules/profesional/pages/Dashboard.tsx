import { useLocation } from 'react-router-dom';
import { obtenerMiCuenta } from '@/services/panelProfesional';
import { useRecurso } from '@/lib/useRecurso';
import { Alerta, EsqueletoTexto, EstadoError } from '@/components/ui';
import { BannerValidacion } from '../components/BannerValidacion';

/**
 * Inicio del profesional. En el bloque 1 muestra el saludo y el estado del
 * perfil; las tarjetas de resumen, reservas y solicitudes llegan en el bloque 2.
 */
export function Dashboard() {
  const ubicacion = useLocation();
  const recienRegistrado = (ubicacion.state as { recienRegistrado?: boolean } | null)?.recienRegistrado ?? false;
  const cuenta = useRecurso(obtenerMiCuenta, []);

  if (cuenta.error) return <EstadoError mensaje={cuenta.error} reintentar={cuenta.recargar} />;
  if (cuenta.cargando || !cuenta.datos) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <EsqueletoTexto lineas={2} />
      </div>
    );
  }

  const { profesional, privado } = cuenta.datos;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {profesional.nombre}</h1>
        <p className="mt-1 text-sm text-tinta-suave">Este es tu espacio en Skilly. Tú decides qué ofreces y cuándo.</p>
      </header>

      {recienRegistrado && (
        <Alerta tono="exito" titulo="Te damos la bienvenida a Skilly">
          Tu cuenta quedó creada. Ya puedes recorrer tu panel.
        </Alerta>
      )}

      <BannerValidacion estado={privado.estadoValidacion} comentario={privado.comentarioValidacion} />
    </div>
  );
}

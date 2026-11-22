import type { EstadoValidacion } from '@/types';
import { Alerta, BotonEnlace } from '@/components/ui';

/** Aviso de estado del perfil. No muestra nada si el profesional ya está validado. */
export function BannerValidacion({ estado, comentario }: { estado: EstadoValidacion; comentario?: string | null }) {
  if (estado === 'perfil_incompleto') {
    return (
      <Alerta
        tono="aviso"
        titulo={comentario ? 'Skilly te pidió completar o corregir tu perfil' : 'Completa tu perfil para empezar a publicar'}
        accion={
          <BotonEnlace to="/profesional/perfil" tamano="sm">
            Completar mi perfil
          </BotonEnlace>
        }
      >
        {comentario
          ? `${comentario} Cuando lo tengas listo, vuelve a enviarlo a revisión desde Mi perfil.`
          : 'Tu cuenta ya está creada. Cuando agregues tu presentación, experiencia y documentos, el equipo de Skilly revisará tus antecedentes. Podrás publicar servicios una vez validado.'}
      </Alerta>
    );
  }
  if (estado === 'en_revision') {
    return (
      <Alerta tono="info" titulo="Tu perfil está en revisión">
        El resultado aparecerá aquí cuando el equipo de Skilly termine. Mientras tanto puedes preparar tus servicios
        (quedan pausados); podrás publicarlos apenas tu perfil esté validado.
      </Alerta>
    );
  }
  return null;
}

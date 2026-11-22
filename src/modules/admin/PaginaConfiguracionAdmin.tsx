import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { actualizarConfiguracion, obtenerConfiguracion } from '@/services/configuracion';
import { mensajeParaUsuario } from '@/services/errores';
import { useRecurso } from '@/lib/useRecurso';
import { calcularDesglose } from '@/lib/precios';
import { formatearCLP } from '@/lib/formato';
import { Alerta, Boton, CampoTexto, Esqueleto, EstadoError, Tarjeta } from '@/components/ui';

const porcentaje = (max: number) =>
  z.coerce.number<number>({ error: 'Escribe un número' }).min(0, 'No puede ser negativo').max(max, `Máximo ${max} %`);

const esquema = z.object({
  comisionPorcentaje: porcentaje(50),
  retencionMas48: porcentaje(100),
  retencion24a48: porcentaje(100),
  retencionMenos24: porcentaje(100),
  comisionProfesionalPorcentaje: porcentaje(50),
  comisionOrganizacionPorcentaje: porcentaje(50),
  retencionBloqueMinutos: z.coerce.number<number>().int().min(0).max(120),
  minimoEvaluaciones: z.coerce.number<number>().int().min(0),
  ventanaMaxEvaluaciones: z.coerce.number<number>().int().min(1),
  ventanaMeses: z.coerce.number<number>().int().min(1),
  diasPublicacionAutomatica: z.coerce.number<number>().int().min(0),
  maxCaracteresComentario: z.coerce.number<number>().int().min(1),
  versionCondiciones: z.string().min(1),
  versionPoliticaDatos: z.string().min(1),
});

type Formulario = z.infer<typeof esquema>;

const PRECIO_EJEMPLO = 500_000;

export function PaginaConfiguracionAdmin() {
  const config = useRecurso(() => obtenerConfiguracion(), []);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), mode: 'onChange' });

  useEffect(() => {
    const c = config.datos;
    if (!c) return;
    const tramo = (desde: number) => c.politicaCancelacion.find((t) => t.desdeHoras === desde)?.retencionPorcentaje ?? 0;
    reset({
      comisionPorcentaje: c.comisionPorcentaje,
      retencionMas48: tramo(48),
      retencion24a48: tramo(24),
      retencionMenos24: tramo(0),
      comisionProfesionalPorcentaje: c.comisionProfesionalPorcentaje,
      comisionOrganizacionPorcentaje: c.comisionOrganizacionPorcentaje,
      retencionBloqueMinutos: c.retencionBloqueMinutos,
      minimoEvaluaciones: c.reputacion.minimoEvaluaciones,
      ventanaMaxEvaluaciones: c.reputacion.ventanaMaxEvaluaciones,
      ventanaMeses: c.reputacion.ventanaMeses,
      diasPublicacionAutomatica: c.reputacion.diasPublicacionAutomatica,
      maxCaracteresComentario: c.reputacion.maxCaracteresComentario,
      versionCondiciones: c.versionCondiciones,
      versionPoliticaDatos: c.versionPoliticaDatos,
    });
  }, [config.datos, reset]);

  const comisionActual = Number(watch('comisionPorcentaje')) || 0;
  const ejemplo = calcularDesglose(PRECIO_EJEMPLO, comisionActual);

  const guardar = handleSubmit(async (datos) => {
    setError(null);
    setGuardado(false);
    try {
      const nueva = await actualizarConfiguracion({
        comisionPorcentaje: datos.comisionPorcentaje,
        comisionProfesionalPorcentaje: datos.comisionProfesionalPorcentaje,
        comisionOrganizacionPorcentaje: datos.comisionOrganizacionPorcentaje,
        retencionBloqueMinutos: datos.retencionBloqueMinutos,
        reputacion: {
          minimoEvaluaciones: datos.minimoEvaluaciones,
          ventanaMaxEvaluaciones: datos.ventanaMaxEvaluaciones,
          ventanaMeses: datos.ventanaMeses,
          diasPublicacionAutomatica: datos.diasPublicacionAutomatica,
          maxCaracteresComentario: datos.maxCaracteresComentario,
        },
        versionCondiciones: datos.versionCondiciones,
        versionPoliticaDatos: datos.versionPoliticaDatos,
        politicaCancelacion: [
          { desdeHoras: 48, retencionPorcentaje: datos.retencionMas48, etiqueta: 'Más de 48 horas antes' },
          { desdeHoras: 24, retencionPorcentaje: datos.retencion24a48, etiqueta: 'Entre 24 y 48 horas antes' },
          { desdeHoras: 0, retencionPorcentaje: datos.retencionMenos24, etiqueta: 'Menos de 24 horas antes o ausencia' },
        ],
      });
      config.establecer(nueva);
      setGuardado(true);
    } catch (e) {
      setError(mensajeParaUsuario(e));
    }
  });

  if (config.error) return <EstadoError mensaje={config.error} reintentar={config.recargar} />;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración de la plataforma</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">
          Estos valores se aplican a todas las reservas nuevas. Las reservas ya creadas conservan los valores que
          tenían al momento de solicitarse.
        </p>
      </header>

      {config.cargando || !config.datos ? (
        <Tarjeta aria-busy="true" className="flex flex-col gap-4">
          <Esqueleto className="h-11 w-full" />
          <Esqueleto className="h-11 w-full" />
          <Esqueleto className="h-11 w-full" />
        </Tarjeta>
      ) : (
        <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
          {error && <Alerta tono="peligro">{error}</Alerta>}
          {guardado && !isDirty && <Alerta tono="exito">Cambios guardados. Ya se aplican a las reservas nuevas.</Alerta>}

          <Tarjeta className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Comisión de plataforma</h2>
            <CampoTexto
              etiqueta="Porcentaje sobre el precio del servicio"
              type="number"
              inputMode="decimal"
              min={0}
              max={50}
              step={0.5}
              error={errors.comisionPorcentaje?.message}
              {...register('comisionPorcentaje')}
            />
            <p className="rounded-lg bg-crema px-3 py-2 text-sm text-tinta-suave">
              Ejemplo con un servicio de {formatearCLP(PRECIO_EJEMPLO)}: la organización paga{' '}
              <span className="font-medium text-tinta">{formatearCLP(ejemplo.total)}</span> y Skilly retiene{' '}
              <span className="font-medium text-tinta">{formatearCLP(ejemplo.comision)}</span>.
            </p>
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Comisiones por actor</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto etiqueta="Comisión profesional (%)" type="number" min={0} max={50} step={0.5} {...register('comisionProfesionalPorcentaje')} />
              <CampoTexto etiqueta="Comisión organización (%)" type="number" min={0} max={50} step={0.5} {...register('comisionOrganizacionPorcentaje')} />
            </div>
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Reglas operativas</h2>
            <CampoTexto etiqueta="Retención de bloque (minutos)" type="number" min={0} max={120} {...register('retencionBloqueMinutos')} />
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Reputación</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto etiqueta="Mínimo de evaluaciones" type="number" min={0} {...register('minimoEvaluaciones')} />
              <CampoTexto etiqueta="Máximo en ventana" type="number" min={1} {...register('ventanaMaxEvaluaciones')} />
              <CampoTexto etiqueta="Ventana en meses" type="number" min={1} {...register('ventanaMeses')} />
              <CampoTexto etiqueta="Días para publicación automática" type="number" min={0} {...register('diasPublicacionAutomatica')} />
              <CampoTexto etiqueta="Máximo de caracteres" type="number" min={1} {...register('maxCaracteresComentario')} />
            </div>
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Versiones legales</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto etiqueta="Versión de condiciones" {...register('versionCondiciones')} />
              <CampoTexto etiqueta="Versión de política de datos" {...register('versionPoliticaDatos')} />
            </div>
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Política de cancelación</h2>
            <p className="text-sm text-tinta-suave">Porcentaje del total que se retiene cuando la organización cancela.</p>
            <CampoTexto etiqueta="Más de 48 horas antes" type="number" min={0} max={100} error={errors.retencionMas48?.message} {...register('retencionMas48')} />
            <CampoTexto etiqueta="Entre 24 y 48 horas antes" type="number" min={0} max={100} error={errors.retencion24a48?.message} {...register('retencion24a48')} />
            <CampoTexto etiqueta="Menos de 24 horas antes o ausencia" type="number" min={0} max={100} error={errors.retencionMenos24?.message} {...register('retencionMenos24')} />
          </Tarjeta>

          <Tarjeta relleno="sm" className="text-xs text-tinta-suave">
            <p>
              Reglas de reputación y operación: mínimo {config.datos.reputacion.minimoEvaluaciones} evaluaciones para
              mostrar indicadores, ventana de {config.datos.reputacion.ventanaMaxEvaluaciones} evaluaciones o{' '}
              {config.datos.reputacion.ventanaMeses} meses, publicación automática a los{' '}
              {config.datos.reputacion.diasPublicacionAutomatica} días, comentarios de hasta{' '}
              {config.datos.reputacion.maxCaracteresComentario} caracteres. Retención de bloque:{' '}
              {config.datos.retencionBloqueMinutos} minutos.
            </p>
          </Tarjeta>

          <div className="flex justify-end">
            <Boton type="submit" tamano="lg" cargando={isSubmitting} disabled={!isDirty}>
              Guardar cambios
            </Boton>
          </div>
        </form>
      )}
    </div>
  );
}

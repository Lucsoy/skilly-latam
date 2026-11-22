import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { esquemaContrasena, esquemaEmail, esquemaRut } from '@/lib/validadores';
import { formatearRut } from '@/lib/rut';
import { ETIQUETA_TAMANO } from '@/lib/formato';
import { mensajeParaUsuario } from '@/services/errores';
import { useSesion } from './sesionStore';
import { Alerta, Boton, CampoCheckbox, CampoSelect, CampoTexto, Tarjeta } from '@/components/ui';

/**
 * Registro de la organización.
 *
 * Son exactamente 7 campos obligatorios (razón social, RUT, giro, tamaño,
 * nombre de contacto, correo y contraseña) más el consentimiento informado.
 * Teléfono, sitio web, dirección y descripción se completan después desde el
 * perfil, para no frenar a quien recién llega.
 */
const esquema = z.object({
  razonSocial: z.string().trim().min(2, 'Escribe la razón social de tu organización'),
  rut: esquemaRut,
  giro: z.string().trim().min(3, 'Cuéntanos a qué se dedica tu organización'),
  tamano: z.enum(['1-10', '11-50', '51-200', '201-500', '500+'], { error: 'Elige el tamaño de tu organización' }),
  nombreContacto: z.string().trim().min(2, 'Escribe tu nombre'),
  emailContacto: esquemaEmail,
  contrasena: esquemaContrasena,
  consentimiento: z.boolean().refine((v) => v, 'Necesitamos tu autorización para poder crear la cuenta'),
});

type Formulario = z.infer<typeof esquema>;

const opcionesTamano = (Object.keys(ETIQUETA_TAMANO) as Array<keyof typeof ETIQUETA_TAMANO>).map((valor) => ({
  valor,
  etiqueta: ETIQUETA_TAMANO[valor] as string,
}));

export function PaginaRegistro() {
  const registrar = useSesion((s) => s.registrar);
  const navegar = useNavigate();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    // Validación en tiempo real: revisa al salir del campo y luego en cada tecla.
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { consentimiento: false },
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await registrar({
        razonSocial: datos.razonSocial,
        rut: datos.rut,
        giro: datos.giro,
        tamano: datos.tamano,
        nombreContacto: datos.nombreContacto,
        emailContacto: datos.emailContacto,
        contrasena: datos.contrasena,
        // Queda registrado el momento exacto de la aceptación.
        consentimiento: true,
        consentimientoAceptadoEn: new Date().toISOString(),
      });
      navegar('/buscar', { replace: true });
    } catch (e) {
      setErrorServidor(mensajeParaUsuario(e));
    }
  });

  const rutRegistro = register('rut');

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-4 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Crea la cuenta de tu organización</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Son siete datos y listo. Lo demás lo puedes completar más adelante desde tu perfil.
        </p>
      </header>

      <Tarjeta relleno="lg">
        <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
          {errorServidor && <Alerta tono="peligro">{errorServidor}</Alerta>}

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold text-tinta">Datos de la organización</legend>

            <CampoTexto
              etiqueta="Razón social"
              autoComplete="organization"
              placeholder="Ej: Bloom Tecnología SpA"
              error={errors.razonSocial?.message}
              {...register('razonSocial')}
            />
            <CampoTexto
              etiqueta="RUT"
              inputMode="text"
              placeholder="76.543.210-3"
              ayuda="Lo usamos para emitir los documentos del servicio."
              error={errors.rut?.message}
              {...rutRegistro}
              onBlur={(e) => {
                // Se formatea al salir del campo para que se lea como en Chile.
                const valor = e.target.value.trim();
                if (valor) setValue('rut', formatearRut(valor), { shouldValidate: true });
                void rutRegistro.onBlur(e);
              }}
            />
            <CampoTexto
              etiqueta="Giro"
              placeholder="Ej: Desarrollo de software"
              error={errors.giro?.message}
              {...register('giro')}
            />
            <CampoSelect
              etiqueta="Tamaño"
              placeholder="Elige un rango"
              opciones={opcionesTamano}
              error={errors.tamano?.message}
              {...register('tamano')}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4 border-t border-borde pt-5">
            <legend className="mb-1 text-sm font-semibold text-tinta">Tus datos de contacto</legend>

            <CampoTexto
              etiqueta="Nombre y apellido"
              autoComplete="name"
              placeholder="Ej: Paula Sandoval"
              error={errors.nombreContacto?.message}
              {...register('nombreContacto')}
            />
            <CampoTexto
              etiqueta="Correo"
              type="email"
              autoComplete="email"
              placeholder="tunombre@tuempresa.cl"
              ayuda="Lo usarás para ingresar a Skilly. El estado de tus reservas lo verás en Mis servicios."
              error={errors.emailContacto?.message}
              {...register('emailContacto')}
            />
            <CampoTexto
              etiqueta="Contraseña"
              type="password"
              autoComplete="new-password"
              ayuda="Al menos 8 caracteres, con letras y números."
              error={errors.contrasena?.message}
              {...register('contrasena')}
            />
          </fieldset>

          <div className="border-t border-borde pt-5">
            <CampoCheckbox
              etiqueta={
                <>
                  Autorizo a Skilly a tratar los datos de mi organización para prestar el servicio, según la{' '}
                  <Link to="/politica-datos" className="font-medium text-primario-700 underline" target="_blank">
                    política de tratamiento de datos personales
                  </Link>
                  .
                </>
              }
              error={errors.consentimiento?.message}
              {...register('consentimiento')}
            />
            <p className="mt-2 text-xs text-tinta-tenue">
              Guardamos la fecha y hora exactas de esta autorización para que quede registro de cuándo la diste.
            </p>
          </div>

          <Boton type="submit" bloque tamano="lg" cargando={isSubmitting}>
            Crear cuenta
          </Boton>
        </form>
      </Tarjeta>

      <p className="text-center text-sm text-tinta-suave">
        ¿Ya tienes cuenta?{' '}
        <Link to="/ingresar" className="font-medium text-primario-700 underline">
          Ingresa aquí
        </Link>
      </p>
    </div>
  );
}

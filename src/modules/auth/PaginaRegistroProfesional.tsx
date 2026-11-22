import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { esquemaContrasena, esquemaEmail, esquemaLinkedinOpcional, normalizarLinkedin } from '@/lib/validadores';
import { mensajeParaUsuario } from '@/services/errores';
import { AREAS_PROFESIONAL } from '@/modules/profesional/constantes';
import { useSesion } from './sesionStore';
import { Alerta, Boton, CampoCheckbox, CampoSelect, CampoTexto, Tarjeta } from '@/components/ui';

/**
 * Registro del profesional, etapa 1 (cuenta).
 *
 * Cinco campos obligatorios (nombre, correo, contraseña, confirmación y área),
 * LinkedIn opcional, más el consentimiento. Con esto la cuenta queda creada y puede
 * explorar su panel; para publicar servicios debe completar la etapa 2
 * (perfil) desde "Mi perfil" y pasar la validación de Skilly.
 */
const esquema = z
  .object({
    nombreCompleto: z
      .string()
      .trim()
      .min(2, 'Escribe tu nombre')
      .refine((v) => v.split(/\s+/).length >= 2, 'Escribe tu nombre y al menos un apellido'),
    email: esquemaEmail,
    contrasena: esquemaContrasena,
    confirmarContrasena: z.string().min(1, 'Repite tu contraseña'),
    areaPrincipal: z.string().min(1, 'Elige el área en la que más trabajas'),
    linkedin: esquemaLinkedinOpcional,
    consentimiento: z.boolean().refine((v) => v, 'Necesitamos tu autorización para poder crear la cuenta'),
  })
  .refine((d) => d.contrasena === d.confirmarContrasena, {
    path: ['confirmarContrasena'],
    message: 'Las contraseñas no coinciden',
  });

type Formulario = z.infer<typeof esquema>;

export function PaginaRegistroProfesional() {
  const registrarProfesional = useSesion((s) => s.registrarProfesional);
  const navegar = useNavigate();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { consentimiento: false, areaPrincipal: '', linkedin: '' },
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await registrarProfesional({
        nombreCompleto: datos.nombreCompleto,
        email: datos.email,
        contrasena: datos.contrasena,
        areaPrincipal: datos.areaPrincipal,
        linkedin: datos.linkedin || undefined,
        // Queda registrado el momento exacto de la aceptación; la versión la agrega el servicio.
        consentimiento: true,
        consentimientoAceptadoEn: new Date().toISOString(),
      });
      navegar('/profesional', { replace: true, state: { recienRegistrado: true } });
    } catch (e) {
      setErrorServidor(mensajeParaUsuario(e));
    }
  });

  const linkedinRegistro = register('linkedin');

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-4 sm:py-8">
      <header>
        <p className="text-sm font-medium text-primario-700">Para profesionales independientes</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ofrece tus servicios en Skilly</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Empieza con tu cuenta. Después completas tu perfil con calma: nosotros revisamos tus antecedentes y te
          damos el distintivo <strong className="text-tinta">Validado por Skilly</strong>.
        </p>
      </header>

      <ol className="grid grid-cols-2 gap-2 text-xs" aria-label="Etapas del registro">
        <li className="rounded-xl border border-primario-300 bg-primario-50 px-3 py-2 text-primario-800">
          <span className="font-semibold">1. Tu cuenta</span>
          <span className="block text-primario-700">Ahora · 2 minutos</span>
        </li>
        <li className="rounded-xl border border-borde bg-superficie px-3 py-2 text-tinta-suave">
          <span className="font-semibold text-tinta">2. Tu perfil</span>
          <span className="block">Cuando quieras</span>
        </li>
      </ol>

      <Tarjeta relleno="lg">
        <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
          {errorServidor && <Alerta tono="peligro">{errorServidor}</Alerta>}

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold text-tinta">Tus datos</legend>

            <CampoTexto
              etiqueta="Nombre completo"
              autoComplete="name"
              placeholder="Ej: Camila Rojas Fuentes"
              error={errors.nombreCompleto?.message}
              {...register('nombreCompleto')}
            />
            <CampoTexto
              etiqueta="Correo"
              type="email"
              autoComplete="email"
              placeholder="tunombre@correo.cl"
              ayuda="Lo usarás para ingresar a Skilly. Las novedades de tus solicitudes las verás en tu panel."
              error={errors.email?.message}
              {...register('email')}
            />
            <CampoTexto
              etiqueta="Contraseña"
              type="password"
              autoComplete="new-password"
              ayuda="Al menos 8 caracteres, con letras y números."
              error={errors.contrasena?.message}
              {...register('contrasena')}
            />
            <CampoTexto
              etiqueta="Confirma tu contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.confirmarContrasena?.message}
              {...register('confirmarContrasena')}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4 border-t border-borde pt-5">
            <legend className="mb-1 text-sm font-semibold text-tinta">Tu trabajo</legend>

            <CampoSelect
              etiqueta="Área principal"
              placeholder="Elige un área"
              opciones={AREAS_PROFESIONAL}
              ayuda="Podrás publicar servicios en otras áreas también."
              error={errors.areaPrincipal?.message}
              {...register('areaPrincipal')}
            />
            <CampoTexto
              etiqueta="Perfil de LinkedIn"
              nota="Opcional"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="linkedin.com/in/tu-nombre"
              ayuda="Si lo agregas, las organizaciones podrán verlo en tu perfil. También puedes sumarlo después desde Mi perfil."
              error={errors.linkedin?.message}
              {...linkedinRegistro}
              onBlur={(e) => {
                // Se completa con https:// al salir del campo para guardar un enlace válido.
                const valor = e.target.value.trim();
                if (valor) setValue('linkedin', normalizarLinkedin(valor), { shouldValidate: true });
                void linkedinRegistro.onBlur(e);
              }}
            />
          </fieldset>

          <div className="border-t border-borde pt-5">
            <CampoCheckbox
              etiqueta={
                <>
                  Autorizo a Skilly a tratar mis datos personales para revisar mis antecedentes y publicar mi perfil,
                  según la{' '}
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
              Guardamos la fecha, la hora y la versión de la política que aceptas, para que quede registro.
            </p>
          </div>

          <Boton type="submit" bloque tamano="lg" cargando={isSubmitting}>
            Crear mi cuenta
          </Boton>
        </form>
      </Tarjeta>

      <div className="flex flex-col gap-2 text-center text-sm text-tinta-suave">
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/ingresar" className="font-medium text-primario-700 underline">
            Ingresa aquí
          </Link>
        </p>
        <p>
          ¿Buscas contratar a un profesional?{' '}
          <Link to="/registro" className="font-medium text-primario-700 underline">
            Crea la cuenta de tu organización
          </Link>
        </p>
      </div>
    </div>
  );
}

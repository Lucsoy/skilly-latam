import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { esquemaEmail } from '@/lib/validadores';
import { mensajeParaUsuario } from '@/services/errores';
import { rutaInicio, rutaPerteneceARol, useSesion } from './sesionStore';
import { Alerta, Boton, CampoTexto, Tarjeta } from '@/components/ui';
import { USE_API } from '@/config';

const esquema = z.object({
  email: esquemaEmail,
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});

type Formulario = z.infer<typeof esquema>;

export function PaginaIngresar() {
  const iniciarSesion = useSesion((s) => s.iniciarSesion);
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const destinoPedido = (ubicacion.state as { desde?: string } | null)?.desde;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<Formulario>({ resolver: zodResolver(esquema), mode: 'onTouched' });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      const sesion = await iniciarSesion(datos);
      // Cada rol tiene su inicio; solo se respeta la ruta pedida si corresponde al rol.
      const inicio = rutaInicio(sesion.usuario);
      const destino = destinoPedido && rutaPerteneceARol(destinoPedido, sesion.usuario.rol) ? destinoPedido : inicio;
      navegar(destino, { replace: true });
    } catch (e) {
      setErrorServidor(mensajeParaUsuario(e));
    }
  });

  return (
    <div className="pagina-ingresar mx-auto flex w-full max-w-md flex-col gap-6 py-4 sm:py-10">
      <div className="login-marca" aria-label="Skilly Latam">
        <img
          src="/images/skilly-latam.png"
          alt="Skilly Latam"
          width="1200"
          height="621"
          className="login-marca__imagen"
        />
      </div>

      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Hola de nuevo</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Ingresa para agendar profesionales o para gestionar los servicios que ofreces.
        </p>
      </header>

      <Tarjeta relleno="lg">
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          {errorServidor && <Alerta tono="peligro">{errorServidor}</Alerta>}

          <CampoTexto
            etiqueta="Correo"
            type="email"
            autoComplete="email"
            placeholder="tunombre@correo.cl"
            error={errors.email?.message}
            {...register('email')}
          />
          <CampoTexto
            etiqueta="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.contrasena?.message}
            {...register('contrasena')}
          />

          <Boton type="submit" bloque tamano="lg" cargando={isSubmitting}>
            Ingresar
          </Boton>
        </form>
      </Tarjeta>

      <div className="flex flex-col gap-2 text-center text-sm text-tinta-suave">
        <p>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-primario-700 underline">
            Crea la de tu organización
          </Link>
        </p>
        <p>
          ¿Eres profesional?{' '}
          <Link to="/registro/profesional" className="font-medium text-primario-700 underline">
            Crea tu cuenta aquí
          </Link>
        </p>
      </div>

      {/* Solo en el modo demostración (VITE_USE_API=false). Con la base de datos real esas
          cuentas no existen y no se debe publicar la contraseña inicial de la fundadora (INC-17). */}
      {!USE_API && (
      <section className="login-demo" aria-labelledby="login-demo-titulo">
        <div className="login-demo__encabezado">
          <span className="login-demo__orb" aria-hidden="true">✦</span>
          <div>
            <p className="login-demo__eyebrow">Modo demostración</p>
            <h2 id="login-demo-titulo">Explora Skilly con una cuenta de prueba</h2>
          </div>
        </div>
        <p className="login-demo__descripcion">
          Elige un perfil y completaremos el acceso por ti. Puedes cambiar de cuenta cuando quieras.
        </p>
        <div className="login-demo__cuentas">
          {[
            { id: 'empresa', etiqueta: 'Empresa', detalle: 'Bloom Tecnología', email: 'contacto@bloom.cl', password: 'skilly2026', tono: 'azul' },
            { id: 'profesional', etiqueta: 'Profesional', detalle: 'Cuenta validada', email: 'camila.rojas@ejemplo.cl', password: 'camila2026', tono: 'verde' },
            { id: 'nuevo', etiqueta: 'Profesional nueva', detalle: 'Cuenta reciente', email: 'valentina.munoz@ejemplo.cl', password: 'valentina2026', tono: 'coral' },
            { id: 'admin', etiqueta: 'Administración', detalle: 'Cuenta operativa', email: 'admin@skilly.cl', password: 'admin2026', tono: 'grafito' },
            { id: 'fundadora', etiqueta: 'Fundadora', detalle: 'Acceso total', email: 'fundadora@skilly.cl', password: 'Skilly#Fundadora2026', tono: 'dorado' },
          ].map((cuenta) => (
            <button
              key={cuenta.id}
              type="button"
              className={`login-demo__cuenta login-demo__cuenta--${cuenta.tono}`}
              onClick={() => {
                setValue('email', cuenta.email, { shouldValidate: true, shouldDirty: true });
                setValue('contrasena', cuenta.password, { shouldValidate: true, shouldDirty: true });
              }}
            >
              <span className="login-demo__cuenta-icono" aria-hidden="true">{cuenta.id === 'fundadora' ? '✦' : '•'}</span>
              <span className="login-demo__cuenta-texto">
                <strong>{cuenta.etiqueta}</strong>
                <small>{cuenta.detalle}</small>
              </span>
              <span className="login-demo__cuenta-flecha" aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
        <p className="login-demo__ayuda">Haz clic en una cuenta para completar correo y contraseña automáticamente.</p>
      </section>
      )}
    </div>
  );
}

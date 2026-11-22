import { useState } from 'react';
import { crearAdministradorAdmin, eliminarAdministradorAdmin, listarAdministradoresAdmin } from '@/services/admin';
import { useRecurso } from '@/lib/useRecurso';
import { mensajeParaUsuario } from '@/services/errores';
import { Alerta, Boton, CampoSelect, CampoTexto, Esqueleto, EstadoError, EstadoVacio, Insignia, Tarjeta } from '@/components/ui';

export function PaginaAdministradoresAdmin() {
  const lista = useRecurso(() => listarAdministradoresAdmin(), []);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState<'administrador' | 'fundador'>('administrador');
  const [ocupada, setOcupada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    setError(null);
    if (!nombre.trim() || !email.trim() || contrasena.length < 8) {
      setError('Completa nombre, correo y una contraseña de al menos 8 caracteres.');
      return;
    }
    setOcupada(true);
    try {
      await crearAdministradorAdmin({ nombre, email, contrasena, rol });
      setNombre(''); setEmail(''); setContrasena(''); setRol('administrador');
      lista.recargar();
    } catch (e) { setError(mensajeParaUsuario(e)); }
    finally { setOcupada(false); }
  };

  const eliminar = async (id: string) => {
    setError(null); setOcupada(true);
    try { await eliminarAdministradorAdmin(id); lista.recargar(); }
    catch (e) { setError(mensajeParaUsuario(e)); }
    finally { setOcupada(false); }
  };

  if (lista.error) return <EstadoError mensaje={lista.error} reintentar={lista.recargar} />;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Administradores de Skilly</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">Solo las cuentas fundadoras pueden crear o eliminar administradores y administrar la estructura interna del equipo.</p>
      </header>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      <Tarjeta className="flex flex-col gap-4">
        <div><h2 className="text-base font-semibold">Crear cuenta administrativa</h2><p className="mt-1 text-sm text-tinta-suave">Un administrador operativo puede gestionar la plataforma y las cuentas, pero no modificar la configuración sensible ni administrar fundadores.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <CampoTexto etiqueta="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <CampoTexto etiqueta="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
          <CampoSelect etiqueta="Perfil" value={rol} onChange={(e) => setRol(e.target.value as 'administrador' | 'fundador')} opciones={[{ valor: 'administrador', etiqueta: 'Administrador operativo' }, { valor: 'fundador', etiqueta: 'Fundador/a' }]} />
        </div>
        <div className="flex justify-end"><Boton onClick={() => void crear()} cargando={ocupada}>Crear cuenta</Boton></div>
      </Tarjeta>

      <Tarjeta>
        <h2 className="text-base font-semibold">Equipo actual</h2>
        {lista.cargando ? <div className="mt-4 flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Esqueleto key={i} className="h-16 w-full rounded-xl" />)}</div> : (lista.datos ?? []).length === 0 ? <EstadoVacio titulo="No hay cuentas administrativas" /> : (
          <ul className="mt-4 flex flex-col gap-2">
            {(lista.datos ?? []).map((admin) => (
              <li key={admin.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-4 py-3">
                <div><p className="font-medium">{admin.nombre}</p><p className="text-xs text-tinta-suave">{admin.email}</p></div>
                <div className="flex items-center gap-2"><Insignia tono={admin.rol === 'fundador' ? 'primario' : 'neutro'}>{admin.rol === 'fundador' ? 'Fundador/a' : 'Administrador'}</Insignia><Boton tamano="sm" variante="peligro" onClick={() => void eliminar(admin.id)}>Eliminar</Boton></div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

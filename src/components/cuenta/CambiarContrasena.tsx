import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { cambiarContrasena } from '@/services/auth';
import { mensajeParaUsuario } from '@/services/errores';
import { Alerta, Boton, CampoTexto, Tarjeta } from '@/components/ui';
import { useSesion } from '@/modules/auth/sesionStore';

/** Formulario para cambiar la contraseña de la cuenta en sesión. Se usa en los tres perfiles. */
export function CambiarContrasena() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ tono: 'exito' | 'peligro'; texto: string } | null>(null);

  const guardar = async () => {
    setResultado(null);
    if (nueva !== repetir) {
      setResultado({ tono: 'peligro', texto: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setGuardando(true);
    try {
      await cambiarContrasena(actual, nueva);
      // Quita el aviso de contraseña inicial sin obligar a volver a ingresar.
      useSesion.setState((e) => ({ usuario: e.usuario ? { ...e.usuario, debeCambiarContrasena: false } : null }));
      setActual('');
      setNueva('');
      setRepetir('');
      setResultado({ tono: 'exito', texto: 'Contraseña actualizada. Se cerraron tus otras sesiones abiertas.' });
    } catch (e) {
      setResultado({ tono: 'peligro', texto: mensajeParaUsuario(e) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Tarjeta className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <KeyRound className="h-5 w-5 text-primario-700" />
        <div>
          <h2 className="font-semibold">Cambiar contraseña</h2>
          <p className="text-sm text-tinta-suave">Al menos 8 caracteres, con letras y números.</p>
        </div>
      </div>
      <form
        className="grid gap-3 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void guardar();
        }}
      >
        <CampoTexto etiqueta="Contraseña actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
        <CampoTexto etiqueta="Nueva contraseña" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <CampoTexto etiqueta="Repite la nueva" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
        <div className="md:col-span-3 flex justify-end">
          <Boton type="submit" variante="secundario" cargando={guardando} disabled={!actual || !nueva || !repetir}>Actualizar contraseña</Boton>
        </div>
      </form>
      {resultado && <Alerta tono={resultado.tono}>{resultado.texto}</Alerta>}
    </Tarjeta>
  );
}

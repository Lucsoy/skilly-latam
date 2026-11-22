import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecurso } from '@/lib/useRecurso';
import { obtenerReserva } from '@/services/reservas';
import { pagarSolicitud } from '@/services/solicitudes';
import { mensajeParaUsuario } from '@/services/errores';
import { formatearCLP, formatearRangoBloque } from '@/lib/formato';
import { Alerta, Boton, CampoTexto, EstadoError, Esqueleto, Tarjeta } from '@/components/ui';

export function PaginaPago() {
  const { reservaId = '' } = useParams();
  const navegar = useNavigate();
  const reserva = useRecurso(() => obtenerReserva(reservaId), [reservaId]);
  const [numero, setNumero] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);

  if (reserva.error) return <EstadoError titulo="No encontramos la contratación" mensaje={reserva.error} reintentar={reserva.recargar} />;
  if (reserva.cargando || !reserva.datos) return <Esqueleto className="h-96 w-full rounded-2xl" />;
  const r = reserva.datos;
  if (r.estado !== 'PENDIENTE_PAGO') return <Alerta tono="aviso" titulo="El pago todavía no está disponible">El profesional debe aceptar la solicitud antes de habilitar el pago.</Alerta>;

  const pagar = async () => {
    if (numero.replace(/\s/g, '').length < 12 || !vencimiento || cvv.length < 3 || !nombre.trim()) {
      setError('Completa los datos de pago para continuar.');
      return;
    }
    setPagando(true); setError(null);
    try {
      await pagarSolicitud(r.id);
      navegar(`/mis-servicios/${r.id}`, { replace: true });
    } catch (e) { setError(mensajeParaUsuario(e)); }
    finally { setPagando(false); }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-5">
        <header><p className="text-sm font-medium text-primario-700">Contratación aprobada</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Completa el pago</h1><p className="mt-1 text-sm text-tinta-suave">El profesional aceptó realizar el trabajo. El pago confirma la contratación.</p></header>
        <Alerta tono="aviso" titulo="Pago simulado">
          Skilly LATAM no está conectado a una pasarela de pago: no se realiza ningún cobro y los datos de la tarjeta no
          se envían ni se guardan. No ingreses datos de una tarjeta real.
        </Alerta>
        {error && <Alerta tono="peligro">{error}</Alerta>}
        <Tarjeta className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Datos de pago (prueba)</h2>
            <Boton variante="secundario" tamano="sm" onClick={() => { setNombre('Titular de prueba'); setNumero('4111 1111 1111 1111'); setVencimiento('12/30'); setCvv('123'); }}>
              Usar datos de prueba
            </Boton>
          </div>
          <CampoTexto etiqueta="Nombre del titular" autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <CampoTexto etiqueta="Número de tarjeta" autoComplete="off" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value.replace(/[^0-9 ]/g, '').slice(0, 19))} placeholder="0000 0000 0000 0000" />
          <div className="grid gap-4 sm:grid-cols-2"><CampoTexto etiqueta="Vencimiento" value={vencimiento} onChange={(e) => setVencimiento(e.target.value.slice(0, 5))} placeholder="MM/AA" /><CampoTexto etiqueta="CVV" autoComplete="off" inputMode="numeric" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} /></div>
          <p className="text-xs text-tinta-tenue">En producción este formulario se reemplaza por el formulario alojado de la pasarela de pago (Webpay, Mercado Pago u otra), de modo que Skilly nunca maneje datos de tarjetas.</p>
          <Boton tamano="lg" bloque cargando={pagando} onClick={() => void pagar()}>Confirmar pago simulado de {formatearCLP(r.total)}</Boton>
        </Tarjeta>
      </section>
      <aside className="lg:sticky lg:top-24 lg:self-start"><Tarjeta className="flex flex-col gap-3"><p className="text-xs text-tinta-tenue">Resumen</p><h2 className="font-semibold">Solicitud {r.codigo}</h2><p className="text-sm text-tinta-suave">{formatearRangoBloque(r.inicio, r.fin)}</p><div className="border-t border-borde pt-3"><div className="flex justify-between text-sm"><span>Total</span><strong>{formatearCLP(r.total)}</strong></div></div></Tarjeta></aside>
    </div>
  );
}

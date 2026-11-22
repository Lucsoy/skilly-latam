import { useState } from 'react';
import { CircleDollarSign, Clock3, ReceiptText, TrendingUp } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import { obtenerConfiguracion } from '@/services/configuracion';
import { listarReservasProfesional } from '@/services/reservas';
import { formatearCLP } from '@/lib/formato';
import { Alerta, EstadoError, Esqueleto, Insignia, Pestanas, Tarjeta } from '@/components/ui';

export function MisIngresos() {
  const reservas = useRecurso(listarReservasProfesional, []);
  const config = useRecurso(obtenerConfiguracion, []);
  const [periodo,setPeriodo]=useState<'todos'|'90'>('90');
  if(reservas.error)return <EstadoError mensaje={reservas.error} reintentar={reservas.recargar}/>;
  if(config.error)return <EstadoError mensaje={config.error} reintentar={config.recargar}/>;
  if(reservas.cargando||!reservas.datos||config.cargando||!config.datos)return <Esqueleto className="h-[600px] w-full rounded-2xl"/>;
  const ahora=Date.now();
  const elegibles=reservas.datos.filter(r=>r.estadoPago==='confirmado' && ['CONFIRMADA','EN_CURSO','ENTREGADA','EVALUADA'].includes(r.estado));
  const filtradas=periodo==='90'?elegibles.filter(r=>ahora-new Date(r.creadaEn).getTime()<=90*86400000):elegibles;
  const bruto=filtradas.reduce((a,r)=>a+r.precio,0);
  const comision=filtradas.reduce((a,r)=>a+Math.round(r.precio*(config.datos?.comisionProfesionalPorcentaje ?? 0)/100),0);
  const neto=bruto-comision;
  const pendientes=reservas.datos.filter(r=>r.estado==='PENDIENTE_PAGO').reduce((a,r)=>a+r.precio,0);
  const mapaMeses=new Map<string,{bruto:number,neto:number,cantidad:number}>();
  for(const r of filtradas){const d=new Date(r.creadaEn);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const prev=mapaMeses.get(key)??{bruto:0,neto:0,cantidad:0};const c=Math.round(r.precio*(config.datos?.comisionProfesionalPorcentaje??0)/100);mapaMeses.set(key,{bruto:prev.bruto+r.precio,neto:prev.neto+r.precio-c,cantidad:prev.cantidad+1});}
  const meses=[...mapaMeses.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
  return <div className="flex flex-col gap-6"><header><p className="text-sm font-medium text-primario-700">Tus resultados</p><h1 className="text-2xl font-semibold tracking-tight">Ingresos</h1><p className="mt-1 text-sm text-tinta-suave">Consulta lo cobrado, la comisión de Skilly y el monto neto estimado para ti.</p></header>{pendientes>0&&<Alerta tono="aviso" titulo="Hay trabajos esperando pago">{formatearCLP(pendientes)} corresponden a trabajos aceptados por ti que todavía no están confirmados como pagados.</Alerta>}<Pestanas pestanas={[{valor:'90',etiqueta:'Últimos 90 días'},{valor:'todos',etiqueta:'Histórico'}]} activa={periodo} onCambiar={setPeriodo} etiquetaGrupo="Periodo de ingresos"/><div className="grid gap-4 md:grid-cols-3"><Tarjeta><div className="flex items-center gap-3"><CircleDollarSign className="h-5 w-5 text-primario-700"/><span className="text-sm text-tinta-suave">Neto estimado</span></div><p className="mt-3 text-2xl font-semibold">{formatearCLP(neto)}</p></Tarjeta><Tarjeta><div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-tinta-suave"/><span className="text-sm text-tinta-suave">Bruto contratado</span></div><p className="mt-3 text-2xl font-semibold">{formatearCLP(bruto)}</p></Tarjeta><Tarjeta><div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-tinta-suave"/><span className="text-sm text-tinta-suave">Comisión profesional</span></div><p className="mt-3 text-2xl font-semibold">{formatearCLP(comision)}</p><p className="mt-1 text-xs text-tinta-tenue">{config.datos?.comisionProfesionalPorcentaje}% sobre el valor del servicio</p></Tarjeta></div><Tarjeta><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-primario-700"/><div><h2 className="font-semibold">Desglose mensual</h2><p className="text-sm text-tinta-suave">Monto neto después de la comisión configurada.</p></div></div><div className="mt-4 flex flex-col gap-2">{meses.length?meses.map(([mes,d])=><div key={mes} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl border border-borde px-4 py-3 text-sm"><div><p className="font-medium">{mes}</p><p className="text-xs text-tinta-tenue">{d.cantidad} contratación{d.cantidad===1?'':'es'}</p></div><span className="text-tinta-suave">Bruto {formatearCLP(d.bruto)}</span><strong>{formatearCLP(d.neto)}</strong></div>):<p className="py-6 text-center text-sm text-tinta-tenue">Todavía no hay ingresos confirmados en este periodo.</p>}</div></Tarjeta><Tarjeta><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Movimientos</h2><p className="text-sm text-tinta-suave">Contrataciones consideradas para este cálculo.</p></div><Insignia tono="info">Datos actuales</Insignia></div><ul className="mt-4 flex flex-col gap-2">{filtradas.map(r=><li key={r.id} className="flex flex-col gap-2 rounded-xl border border-borde px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><span className="font-mono text-xs text-tinta-tenue">{r.codigo}</span><p className="mt-1 font-medium">{formatearCLP(r.precio)}</p></div><span className="text-xs text-tinta-suave">Neto estimado {formatearCLP(r.precio-Math.round(r.precio*(config.datos?.comisionProfesionalPorcentaje??0)/100))}</span></li>)}</ul></Tarjeta></div>;
}


'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Clock, AlertCircle, Plus, Trash2, Bell, Calendar } from 'lucide-react';

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_recordatorio: string;
  urgente: boolean;
  completado: boolean;
  notificado: boolean;
}

const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

export default function Home() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('09');
  const [minuto, setMinuto] = useState('00');
  const [periodo, setPeriodo] = useState<'AM' | 'PM'>('AM');
  const [urgente, setUrgente] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [ahoraMs, setAhoraMs] = useState<number>(0);

  const cargarTareas = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('tareas')
      .select('*')
      .eq('completado', false)
      .order('fecha_recordatorio', { ascending: true });

    if (!error && data) setTareas(data);
    setAhoraMs(Date.now());
    setCargando(false);
  };

  useEffect(() => {
    setFecha(obtenerFechaHoyLocal());
    setAhoraMs(Date.now());
    cargarTareas();
  }, []);

  const agregarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;

    let hora24 = parseInt(hora, 10);
    if (periodo === 'PM' && hora24 !== 12) hora24 += 12;
    if (periodo === 'AM' && hora24 === 12) hora24 = 0;

    const fechaLocal = new Date(
      `${fecha}T${String(hora24).padStart(2, '0')}:${minuto}:00`
    );

    if (isNaN(fechaLocal.getTime())) {
      alert('Selecciona una fecha y hora válidas.');
      return;
    }

    const { error } = await supabase.from('tareas').insert([
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha_recordatorio: fechaLocal.toISOString(),
        urgente,
      },
    ]);

    if (!error) {
      setTitulo('');
      setDescripcion('');
      setFecha(obtenerFechaHoyLocal());
      setUrgente(false);
      cargarTareas();
    } else {
      alert('Error al guardar: ' + error.message);
    }
  };

  const marcarCompletada = async (id: string) => {
    await supabase.from('tareas').update({ completado: true }).eq('id', id);
    cargarTareas();
  };

  const posponerUnaHora = async (tarea: Tarea) => {
    const nuevaFecha = new Date(
      Math.max(new Date(tarea.fecha_recordatorio).getTime(), Date.now()) +
        60 * 60 * 1000
    ).toISOString();

    await supabase
      .from('tareas')
      .update({ fecha_recordatorio: nuevaFecha, notificado: false })
      .eq('id', tarea.id);

    cargarTareas();
  };

  const eliminarTarea = async (id: string) => {
    await supabase.from('tareas').delete().eq('id', id);
    cargarTareas();
  };

  const formatearFecha = (iso: string) => {
    return new Date(iso).toLocaleString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const horas = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );
  const minutos = Array.from({ length: 12 }, (_, i) =>
    String(i * 5).padStart(2, '0')
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="text-amber-400" /> Mis Pendientes
            </h1>
            <p className="text-sm text-zinc-400">
              Anótalo antes de que se te olvide
            </p>
          </div>
          <span className="text-xs bg-zinc-800 px-3 py-1 rounded-full text-zinc-300">
            {tareas.length} pendientes
          </span>
        </header>

        <form
          onSubmit={agregarTarea}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 shadow-lg"
        >
          <input
            type="text"
            placeholder="¿Qué tienes que hacer?"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />

          <input
            type="text"
            placeholder="Detalles extra (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-400"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Calendario */}
            <div className="relative flex items-center">
              <Calendar
                size={16}
                className="text-amber-400 absolute left-3 pointer-events-none"
              />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                style={{ colorScheme: 'dark' }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              />
            </div>

            {/* Selector limpio de Hora, Minutos y AM/PM */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 flex-1 justify-center">
                <Clock size={15} className="text-amber-400 mr-1.5 shrink-0" />
                <select
                  aria-label="Hora"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="bg-transparent text-sm text-zinc-100 focus:outline-none cursor-pointer"
                >
                  {horas.map((h) => (
                    <option key={h} value={h} className="bg-zinc-900">
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-zinc-500 mx-1 font-bold">:</span>
                <select
                  aria-label="Minutos"
                  value={minuto}
                  onChange={(e) => setMinuto(e.target.value)}
                  className="bg-transparent text-sm text-zinc-100 focus:outline-none cursor-pointer"
                >
                  {minutos.map((m) => (
                    <option key={m} value={m} className="bg-zinc-900">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 shrink-0">
                {(['AM', 'PM'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodo(p)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                      periodo === p
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={urgente}
                onChange={(e) => setUrgente(e.target.checked)}
                className="accent-red-500 w-4 h-4"
              />
              <span className={urgente ? 'text-red-400 font-medium' : 'text-zinc-400'}>
                Urgente
              </span>
            </label>

            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={18} /> Guardar
            </button>
          </div>
        </form>

        <section className="space-y-3">
          {cargando ? (
            <p className="text-center text-zinc-500 py-8">Cargando pendientes...</p>
          ) : tareas.length === 0 ? (
            <p className="text-center text-zinc-500 py-8 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
              No tienes pendientes activos. ¡Todo al día!
            </p>
          ) : (
            tareas.map((tarea) => {
              const vencida =
                ahoraMs > 0 && new Date(tarea.fecha_recordatorio).getTime() < ahoraMs;
              return (
                <div
                  key={tarea.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    tarea.urgente
                      ? 'bg-red-950/20 border-red-900/60'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {tarea.urgente && (
                        <AlertCircle size={16} className="text-red-400 shrink-0" />
                      )}
                      <h2 className="font-medium text-zinc-100">{tarea.titulo}</h2>
                    </div>
                    {tarea.descripcion && (
                      <p className="text-sm text-zinc-400">{tarea.descripcion}</p>
                    )}
                    <p
                      className={`text-xs flex items-center gap-1 ${
                        vencida ? 'text-red-400 font-medium' : 'text-zinc-500'
                      }`}
                    >
                      <Clock size={12} /> {formatearFecha(tarea.fecha_recordatorio)}
                      {vencida && ' (Vencido)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => posponerUnaHora(tarea)}
                      title="Posponer 1 hora"
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      +1h
                    </button>
                    <button
                      onClick={() => marcarCompletada(tarea.id)}
                      title="Marcar como hecho"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition cursor-pointer"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => eliminarTarea(tarea.id)}
                      title="Eliminar"
                      className="text-zinc-500 hover:text-red-400 p-2 transition cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
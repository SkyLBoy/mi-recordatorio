'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Clock, AlertCircle, Plus, Trash2, Bell } from 'lucide-react';

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_recordatorio: string;
  urgente: boolean;
  completado: boolean;
  notificado: boolean;
}

export default function Home() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargarTareas = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('tareas')
      .select('*')
      .eq('completado', false)
      .order('fecha_recordatorio', { ascending: true });

    if (!error && data) setTareas(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarTareas();
  }, []);

  const agregarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;

    const fechaISO = new Date(fecha).toISOString();

    const { error } = await supabase.from('tareas').insert([
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha_recordatorio: fechaISO,
        urgente,
      },
    ]);

    if (!error) {
      setTitulo('');
      setDescripcion('');
      setFecha('');
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
    });
  };

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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400"
            />

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
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer ml-auto"
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
              const vencida = new Date(tarea.fecha_recordatorio) < new Date();
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
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('No autorizado', { status: 401 });
  }

  const ahora = new Date().toISOString();

  const { data: tareas, error } = await supabaseAdmin
    .from('tareas')
    .select('*')
    .eq('completado', false)
    .eq('notificado', false)
    .lte('fecha_recordatorio', ahora);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const tarea of tareas || []) {
    const etiqueta = tarea.urgente ? '🚨 *URGENTE*' : '📌 *Recordatorio*';
    const mensaje = `${etiqueta}\n\n*${tarea.titulo}*${
      tarea.descripcion ? `\n_${tarea.descripcion}_` : ''
    }`;

    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: mensaje,
          parse_mode: 'Markdown',
        }),
      }
    );

    await supabaseAdmin
      .from('tareas')
      .update({ notificado: true })
      .eq('id', tarea.id);
  }

  return NextResponse.json({ ok: true, procesadas: tareas?.length || 0 });
}
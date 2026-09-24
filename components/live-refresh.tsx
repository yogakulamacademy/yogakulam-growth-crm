'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const watchedTables = ['leads', 'tasks', 'messages', 'activities', 'lead_stage_history', 'conversations'];

export function LiveRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase.channel('crm-live-refresh');

    for (const table of watchedTables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 250);
        },
      );
    }

    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [enabled, router]);

  if (!enabled) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 hidden items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur lg:flex">
      <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      {connected ? 'Live sync' : 'Connecting…'}
    </div>
  );
}

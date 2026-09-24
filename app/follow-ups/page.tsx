import Link from 'next/link';
import { Check, Clock, RotateCcw } from 'lucide-react';
import { completeFollowUpAction, snoozeFollowUpAction } from '@/app/actions/crm';
import { ChannelBadge, PageHeader, StageBadge } from '@/components/ui';
import { getFollowUps, isMockMode } from '@/lib/data';
import { formatDateTime } from '@/lib/format';

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [tasks, query] = await Promise.all([getFollowUps(), searchParams]);
  const mock = isMockMode();

  return (
    <>
      <PageHeader
        eyebrow="Task queue"
        title="Follow-ups"
        description="Track every promised response, payment check and scheduled lead touch so no enquiry disappears from the funnel."
        actions={<span className={`rounded-xl px-3 py-2 text-xs font-bold ${mock ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>{mock ? 'Mock mode' : 'Live task queue'}</span>}
      />

      {query.error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{query.error}</div>}
      {query.notice && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${query.notice.startsWith('mock-') ? 'border-orange-100 bg-orange-50 text-orange-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {noticeText(query.notice)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-pad"><div className="text-sm text-slate-500">Due now</div><div className="mt-2 text-3xl font-bold text-slate-950">{tasks.length}</div><div className="mt-2 text-xs text-orange-600">Open or snoozed tasks at/after due time</div></div>
        <div className="card-pad"><div className="text-sm text-slate-500">High-intent queue</div><div className="mt-2 text-3xl font-bold text-slate-950">{tasks.filter((t) => ['high_intent', 'payment_pending'].includes(t.stage)).length}</div><div className="mt-2 text-xs text-slate-400">Needs admissions attention</div></div>
        <div className="card-pad"><div className="text-sm text-slate-500">System state</div><div className="mt-2 text-lg font-bold text-slate-950">{mock ? 'Testing' : 'Persistent + live'}</div><div className="mt-2 text-xs text-emerald-600">Follow-ups are {mock ? 'fictional' : 'stored in Supabase and live-refreshed'}</div></div>
      </div>

      <div className="mt-4 card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><div className="eyebrow">Priority queue</div><div className="section-title mt-1">Scheduled actions</div></div>
        <div className="divide-y divide-slate-100">
          {tasks.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No due follow-ups.</div>}
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-col gap-4 p-4 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <form action={completeFollowUpAction}>
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="lead_id" value={task.leadId} />
                  <button type="submit" title="Complete follow-up" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600"><Check size={16} /></button>
                </form>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/leads/${task.leadId}`} className="font-semibold text-slate-900 hover:text-brand">{task.leadName}</Link>
                    <span className="text-xs text-slate-400">{task.leadCode}</span>
                    <StageBadge stage={task.stage} />
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{task.title}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ChannelBadge channel={task.channel} />
                  <div className="flex min-w-[170px] items-center gap-2 text-sm font-medium text-slate-600"><Clock size={15} className="text-slate-400" />{formatDateTime(task.dueAt)}</div>
                </div>
              </div>

              <form action={snoozeFollowUpAction} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center">
                <input type="hidden" name="task_id" value={task.id} />
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><RotateCcw size={14} /> Reschedule</div>
                <input className="input sm:ml-auto sm:max-w-[250px]" type="datetime-local" name="due_at" required />
                <button type="submit" className="btn-secondary">Snooze</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function noticeText(notice: string) {
  const messages: Record<string, string> = {
    completed: 'Follow-up completed.',
    snoozed: 'Follow-up rescheduled.',
    'mock-complete': 'Mock mode: task was not changed.',
    'mock-snooze': 'Mock mode: task was not changed.',
  };
  return messages[notice] ?? notice;
}

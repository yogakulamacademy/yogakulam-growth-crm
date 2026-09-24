import Link from 'next/link';
import { PageHeader, StageBadge } from '@/components/ui';
import { getLeads } from '@/lib/data';
import { LeadStage } from '@/types/crm';

const columns: Array<{ stage: LeadStage; label: string }> = [
  { stage: 'new', label: 'New' },
  { stage: 'contacted', label: 'Contacted' },
  { stage: 'engaged', label: 'Engaged' },
  { stage: 'qualified', label: 'Qualified' },
  { stage: 'high_intent', label: 'High Intent' },
  { stage: 'payment_pending', label: 'Payment Pending' },
];

export default async function PipelinePage() {
  const leads = await getLeads();
  return <>
    <PageHeader eyebrow="Admissions funnel" title="Pipeline" description="A stage-based view of active leads. Open a lead to move stages through the audited Supabase stage function." actions={<button className="btn-secondary">Active leads only</button>} />
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-[1420px] grid-cols-6 gap-3">
        {columns.map(({ stage, label }) => {
          const items = leads.filter((l) => l.stage === stage);
          return <div key={stage} className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
            <div className="mb-3 flex items-center justify-between"><div className="text-sm font-bold text-slate-800">{label}</div><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{items.length}</span></div>
            <div className="space-y-2.5">
              {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-xs text-slate-400">No lead</div>}
              {items.map((lead) => <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-2"><div className="font-semibold text-slate-900">{lead.name}</div><div className="h-2 w-2 shrink-0 rounded-full bg-orange-400" /></div><div className="mt-1 text-xs text-slate-400">{lead.country} · {lead.location}</div><div className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-slate-600">{lead.course}</div><div className="mt-3 flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-400">{lead.currentContactChannel}</span><StageBadge stage={lead.stage} /></div></Link>)}
            </div>
          </div>;
        })}
      </div>
    </div>
  </>;
}

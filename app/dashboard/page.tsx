import Link from 'next/link';
import { ArrowRight, ContactRound, Flame, ListTodo, MessageSquareMore, UserCheck } from 'lucide-react';
import { FunnelCard } from '@/components/funnel-card';
import { LeadsTable } from '@/components/leads-table';
import { PageHeader, ProgressBar, StatCard } from '@/components/ui';
import { getDashboardSourceBreakdown, getFollowUps, getLeads, getPipelineCounts, isMockMode } from '@/lib/data';

export default async function DashboardPage() {
  const [leads, counts, sources, followups] = await Promise.all([getLeads(), getPipelineCounts(), getDashboardSourceBreakdown(), getFollowUps()]);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const qualified = counts.qualified + counts.high_intent + counts.payment_pending + counts.enrolled;
  const unanswered = leads.filter((lead) => !lead.lastContactedAt && lead.stage === 'new').length;
  const mock = isMockMode();
  return (
    <>
      <PageHeader eyebrow="Growth command center" title="Admissions at a glance" description="One view of lead volume, funnel movement, acquisition source, contact channel and the leads that need attention now." actions={<><span className={`rounded-xl px-3 py-2 text-xs font-bold ${mock ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>{mock ? 'Mock data' : 'Supabase live'}</span><Link className="btn-primary" href="/leads">View all leads <ArrowRight size={15} /></Link></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total leads" value={total.toLocaleString()} note="active + historical funnel" icon={<ContactRound size={19} />} />
        <StatCard label="Qualified+" value={qualified.toLocaleString()} note={total ? `${Math.round((qualified/total)*100)}% of leads` : 'No leads yet'} icon={<UserCheck size={19} />} />
        <StatCard label="High intent" value={counts.high_intent.toLocaleString()} note="active high-intent stage" icon={<Flame size={19} />} />
        <StatCard label="Follow-ups due" value={followups.length.toLocaleString()} note="open tasks due now" icon={<ListTodo size={19} />} />
        <StatCard label="Uncontacted" value={unanswered.toLocaleString()} note="new leads in loaded set" icon={<MessageSquareMore size={19} />} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <FunnelCard counts={counts} />
        <div className="card-pad">
          <div className="mb-5 flex items-center justify-between"><div><div className="eyebrow">Acquisition</div><div className="section-title mt-1">Lead sources</div></div><Link href="/attribution" className="text-xs font-semibold text-brand">View attribution →</Link></div>
          <div className="space-y-5">{sources.length === 0 && <div className="text-sm text-slate-400">No attribution data yet.</div>}{sources.map((item) => <div key={item.source}><div className="mb-2 flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-800">{item.source}</div><div className="text-xs text-slate-400">{item.leads} leads · {item.qualified} qualified+</div></div><div className="text-sm font-bold text-slate-900">{item.share}%</div></div><ProgressBar value={item.share} /></div>)}</div>
          {!mock && <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">Live source breakdown currently uses the most recent 500 loaded leads. Full date-range attribution will be added with the GTM/UTM reporting layer.</p>}
        </div>
      </div>
      <div className="mt-4 card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><div className="eyebrow">Priority</div><div className="section-title mt-1">Leads needing attention</div></div><Link className="text-sm font-semibold text-brand" href="/leads">All leads →</Link></div><LeadsTable leads={leads.filter((lead) => ['high_intent', 'payment_pending', 'qualified'].includes(lead.stage)).slice(0, 6)} compact /></div>
    </>
  );
}

import { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Channel, IntentLevel, LeadStage } from '@/types/crm';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, delta, note, icon }: { label: string; value: string; delta?: number; note?: string; icon?: ReactNode }) {
  const positive = typeof delta === 'number' && delta > 0;
  const negative = typeof delta === 'number' && delta < 0;
  return (
    <div className="card-pad">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</div>
        </div>
        {icon && <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-brand">{icon}</div>}
      </div>
      {(delta !== undefined || note) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span className={`inline-flex items-center gap-1 font-semibold ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-slate-500'}`}>
              {positive ? <ArrowUpRight size={13} /> : negative ? <ArrowDownRight size={13} /> : <Minus size={13} />}
              {Math.abs(delta)}%
            </span>
          )}
          {note && <span className="text-slate-400">{note}</span>}
        </div>
      )}
    </div>
  );
}

const stageStyles: Record<LeadStage, string> = {
  new: 'bg-sky-50 text-sky-700 ring-sky-200',
  contacted: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  engaged: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  qualified: 'bg-violet-50 text-violet-700 ring-violet-200',
  high_intent: 'bg-orange-50 text-orange-700 ring-orange-200',
  payment_pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  enrolled: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  nurture: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  not_now: 'bg-slate-100 text-slate-600 ring-slate-200',
  lost: 'bg-rose-50 text-rose-700 ring-rose-200',
  unqualified: 'bg-slate-100 text-slate-500 ring-slate-200',
  duplicate: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${stageStyles[stage]}`}>{stage.replaceAll('_', ' ')}</span>;
}

const intentStyles: Record<IntentLevel, string> = {
  unknown: 'text-slate-400', low: 'text-slate-500', medium: 'text-blue-600', high: 'text-orange-600', very_high: 'text-rose-600'
};
export function IntentLabel({ intent }: { intent: IntentLevel }) {
  return <span className={`text-xs font-bold capitalize ${intentStyles[intent]}`}>{intent.replace('_', ' ')}</span>;
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  const names: Record<Channel, string> = {
    website: 'Website', instagram: 'Instagram', whatsapp: 'WhatsApp', email: 'Email', phone: 'Phone', meta_lead_form: 'Meta Form', other: 'Other'
  };
  return <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{names[channel]}</span>;
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const width = Math.max(3, Math.min(100, (value / max) * 100));
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} /></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="card-pad text-center"><div className="text-sm font-semibold text-slate-800">{title}</div><div className="mt-1 text-sm text-slate-500">{description}</div></div>;
}

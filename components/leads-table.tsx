import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LeadOverview } from '@/types/crm';
import { ChannelBadge, IntentLabel, StageBadge } from './ui';
import { formatDateTime } from '@/lib/format';

export function LeadsTable({ leads, compact = false }: { leads: LeadOverview[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.1em] text-slate-400">
            <th className="px-4 py-3 font-bold">Lead</th>
            <th className="px-4 py-3 font-bold">Course</th>
            <th className="px-4 py-3 font-bold">Stage</th>
            {!compact && <th className="px-4 py-3 font-bold">First touch</th>}
            <th className="px-4 py-3 font-bold">Current channel</th>
            {!compact && <th className="px-4 py-3 font-bold">Next follow-up</th>}
            <th className="px-4 py-3 font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
              <td className="px-4 py-3.5">
                <div className="font-semibold text-slate-900">{lead.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400"><span>{lead.leadCode}</span><span>•</span><span>{lead.country}</span></div>
              </td>
              <td className="max-w-[280px] px-4 py-3.5">
                <div className="truncate text-sm font-medium text-slate-700">{lead.course}</div>
                <div className="mt-0.5 text-xs text-slate-400">{lead.location}</div>
              </td>
              <td className="px-4 py-3.5"><StageBadge stage={lead.stage} /><div className="mt-1"><IntentLabel intent={lead.intent} /></div></td>
              {!compact && <td className="px-4 py-3.5"><div className="text-sm font-medium text-slate-700">{lead.firstTouchSource}</div><div className="text-xs text-slate-400">{lead.firstTouchCampaign}</div></td>}
              <td className="px-4 py-3.5"><ChannelBadge channel={lead.currentContactChannel} /></td>
              {!compact && <td className="px-4 py-3.5 text-sm text-slate-600">{formatDateTime(lead.nextFollowupAt)}</td>}
              <td className="px-4 py-3.5 text-right"><Link href={`/leads/${lead.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-brand"><ArrowUpRight size={15} /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

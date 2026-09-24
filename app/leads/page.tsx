import Link from 'next/link';
import { Filter, Plus, Search } from 'lucide-react';
import { LeadsTable } from '@/components/leads-table';
import { PageHeader } from '@/components/ui';
import { getLeads, isMockMode } from '@/lib/data';

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [leads, params] = await Promise.all([getLeads(), searchParams]);
  const mock = isMockMode();
  return <>
    <PageHeader eyebrow="CRM" title="Leads" description="Every prospect across website, Instagram, WhatsApp and paid media in one place." actions={<Link href="/leads/new" className="btn-primary"><Plus size={16} /> Add lead</Link>} />
    {params.notice === 'mock-create' && <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">Mock mode is active, so the test lead was not saved. Switch to Supabase mode when you are ready for persistence.</div>}
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center"><div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-3"><Search size={16} className="text-slate-400" /><input className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" placeholder="Search by name, country, course or lead ID" /></div><select className="input lg:w-44"><option>All stages</option><option>Qualified</option><option>High intent</option><option>Payment pending</option></select><select className="input lg:w-44"><option>All sources</option><option>Instagram</option><option>Google Ads</option><option>Meta Ads</option><option>Website / SEO</option></select><button className="btn-secondary"><Filter size={15} /> More filters</button></div>
      <div className="flex items-center justify-between bg-slate-50/60 px-5 py-3 text-xs text-slate-500"><span><strong className="text-slate-700">{leads.length}</strong> {mock ? 'sample' : 'loaded'} leads</span><span>{mock ? 'Mock-data mode' : 'Supabase live mode'}</span></div>
      <LeadsTable leads={leads} />
    </div>
  </>;
}

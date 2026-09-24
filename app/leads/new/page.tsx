import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { createLeadAction } from '@/app/actions/crm';
import { LeadForm } from '@/components/forms/lead-form';
import { PageHeader } from '@/components/ui';
import { getCourseBatches, getCourses, isMockMode } from '@/lib/data';

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const [courses, batches] = await Promise.all([getCourses(), getCourseBatches()]);
  const mock = isMockMode();
  return <>
    <Link href="/leads" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Back to leads</Link>
    <PageHeader eyebrow="CRM" title="Add lead" description="Create a manual lead while keeping acquisition source, contact channel and admissions context separate." />
    {params.error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{params.error}</div>}
    {mock && <div className="mb-4 flex gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700"><Database size={17} className="mt-0.5 shrink-0" /> Mock mode is active. The form is visible for testing but records will not persist until Supabase mode is enabled.</div>}
    <LeadForm courses={courses} batches={batches} action={createLeadAction} submitLabel="Create lead" />
  </>;
}

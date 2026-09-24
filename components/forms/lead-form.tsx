'use client';

import { useMemo, useState } from 'react';
import type { LeadDetail } from '@/types/crm';
import type { CourseBatchOption, CourseOption } from '@/lib/data';

const channels = [
  ['website', 'Website'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['email', 'Email'],
  ['phone', 'Phone'], ['meta_lead_form', 'Meta Lead Form'], ['other', 'Other'],
] as const;

function dateLabel(value?: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function batchLabel(batch: CourseBatchOption) {
  const dates = batch.startDate
    ? `${dateLabel(batch.startDate)}${batch.endDate ? ` – ${dateLabel(batch.endDate)}` : ''}`
    : 'Dates TBA';
  const place = batch.location || (batch.mode === 'online' ? 'Online' : 'Location TBA');
  const time = batch.startTime && batch.endTime ? ` · ${batch.startTime.slice(0, 5)}–${batch.endTime.slice(0, 5)}` : '';
  return `${dates} · ${place}${time}`;
}

export function LeadForm({ courses, batches, lead, action, submitLabel = 'Save lead' }: {
  courses: CourseOption[];
  batches: CourseBatchOption[];
  lead?: LeadDetail;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}) {
  const [courseId, setCourseId] = useState(lead?.interestedCourseId ?? '');
  const [batchId, setBatchId] = useState(lead?.preferredBatchId ?? '');
  const [location, setLocation] = useState(lead?.location === '—' ? '' : lead?.location ?? '');
  const [month, setMonth] = useState(lead?.preferredMonthRaw ?? '');
  const [mode, setMode] = useState(lead?.preferredMode?.toLowerCase() ?? '');
  const [timezone, setTimezone] = useState(lead?.timezone ?? '');

  const courseBatches = useMemo(
    () => batches.filter((batch) => !courseId || batch.courseId === courseId),
    [batches, courseId],
  );

  function selectCourse(nextCourseId: string) {
    setCourseId(nextCourseId);
    const existingBatch = batches.find((batch) => batch.id === batchId);
    if (existingBatch && existingBatch.courseId !== nextCourseId) setBatchId('');
  }

  function selectBatch(nextBatchId: string) {
    setBatchId(nextBatchId);
    if (!nextBatchId) return;
    const batch = batches.find((item) => item.id === nextBatchId);
    if (!batch) return;
    setCourseId(batch.courseId);
    if (batch.location) setLocation(batch.location);
    if (batch.startDate) setMonth(batch.startDate.slice(0, 7));
    if (batch.mode) setMode(batch.mode);
    if (batch.timezone) setTimezone(batch.timezone);
  }

  const selectedBatch = batches.find((batch) => batch.id === batchId);

  return (
    <form action={action} className="space-y-5">
      <section className="card-pad">
        <div className="eyebrow">Lead identity</div><div className="section-title mt-1">Contact details</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="First name" name="first_name" required defaultValue={lead?.firstName ?? lead?.name.split(' ')[0] ?? ''} />
          <Field label="Last name" name="last_name" defaultValue={lead?.lastName ?? lead?.name.split(' ').slice(1).join(' ')} />
          <Field label="Email" name="email" type="email" defaultValue={lead?.email} disabled={Boolean(lead)} note={lead ? 'Contact editing will be added with identity deduplication.' : undefined} />
          <Field label="Phone / WhatsApp" name="phone" defaultValue={lead?.phone} disabled={Boolean(lead)} />
        </div>
      </section>

      <section className="card-pad">
        <div className="eyebrow">Admissions</div><div className="section-title mt-1">Course & qualification</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="field-label">Course</span>
            <select className="input" name="course_id" value={courseId} onChange={(e) => selectCourse(e.target.value)}>
              <option value="">Not selected</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Upcoming batch</span>
            <select className="input" name="preferred_batch_id" value={batchId} onChange={(e) => selectBatch(e.target.value)} disabled={!courseId}>
              <option value="">{courseId ? 'Not selected / custom dates' : 'Select a course first'}</option>
              {courseBatches.map((batch) => <option key={batch.id} value={batch.id}>{batchLabel(batch)}</option>)}
            </select>
            {courseId && courseBatches.length === 0 && <span className="mt-1 block text-xs text-slate-400">No active batches are stored for this course yet. You can still enter the preference manually.</span>}
            {selectedBatch && <span className="mt-1 block text-xs font-medium text-emerald-700">Batch selected: {selectedBatch.batchCode}</span>}
          </label>

          <label className="block"><span className="field-label">Preferred location</span><input className="input" name="preferred_location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mysore, Varkala, Online…" /></label>
          <label className="block"><span className="field-label">Preferred month</span><input className="input" name="preferred_month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>

          <label className="block">
            <span className="field-label">Preferred mode</span>
            <select className="input" name="preferred_mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">Not selected</option><option value="residential">Residential</option><option value="online">Online</option><option value="non_residential">Non-residential</option><option value="hybrid">Hybrid</option>
            </select>
          </label>
          <Field label="Country" name="country" defaultValue={lead?.country === '—' ? '' : lead?.country} />
          <label className="block"><span className="field-label">Timezone</span><input className="input" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Berlin" /></label>
          {lead && <label className="block"><span className="field-label">Intent</span><select className="input" name="intent" defaultValue={lead.intent}><option value="unknown">Unknown</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very high</option></select></label>}
          <label className="block"><span className="field-label">Current contact channel</span><select className="input" name="current_contact_channel" defaultValue={lead?.currentContactChannel ?? 'website'}>{channels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
      </section>

      {!lead && <section className="card-pad">
        <div className="eyebrow">Attribution</div><div className="section-title mt-1">First touch</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="field-label">Lead created through</span><select className="input" name="lead_creation_channel" defaultValue="website">{channels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <Field label="First-touch source" name="first_touch_source" placeholder="Google Ads / Instagram Organic" />
          <Field label="First-touch medium" name="first_touch_medium" placeholder="CPC / Organic / Referral" />
          <Field label="First-touch campaign" name="first_touch_campaign" placeholder="200H Europe Search" />
        </div>
      </section>}

      <section className="card-pad">
        <div className="eyebrow">Internal context</div><div className="section-title mt-1">Notes</div>
        {lead && <label className="mt-5 block"><span className="field-label">CRM summary</span><textarea className="input min-h-28 resize-y" name="summary" defaultValue={lead.summary} /></label>}
        <label className="mt-4 block"><span className="field-label">Internal notes</span><textarea className="input min-h-28 resize-y" name="notes" defaultValue={lead?.notes} placeholder="Context the admissions team should know…" /></label>
      </section>

      <div className="flex justify-end"><button className="btn-primary" type="submit">{submitLabel}</button></div>
    </form>
  );
}

function Field({ label, name, type = 'text', defaultValue, placeholder, required, disabled, note }: { label: string; name: string; type?: string; defaultValue?: string; placeholder?: string; required?: boolean; disabled?: boolean; note?: string }) {
  return <label className="block"><span className="field-label">{label}</span><input className="input" name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} disabled={disabled} />{note && <span className="mt-1 block text-xs text-slate-400">{note}</span>}</label>;
}

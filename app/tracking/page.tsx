import { Activity, CheckCircle2, Cookie, Fingerprint, MousePointerClick, ShieldCheck, Tags } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/ui';
import { getTrackingHealth, isMockMode } from '@/lib/data';

export default async function TrackingPage() {
  const health = await getTrackingHealth();
  const mock = isMockMode();
  const identifiedShare = health.events24h ? Math.round((health.identifiedEvents24h / health.events24h) * 100) : 0;

  return <>
    <PageHeader eyebrow="First-party measurement" title="Tracking" description="Capture the marketing journey before a person becomes a lead, then attach those anonymous sessions and touchpoints to the CRM lead after identification." />

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Events · 24h" value={health.events24h.toLocaleString()} note={mock ? 'Mock tracking data' : 'Website touchpoints received'} icon={<Activity size={18}/>} />
      <StatCard label="Visitors · 24h" value={health.visitors24h.toLocaleString()} note="Anonymous first-party visitor IDs" icon={<Fingerprint size={18}/>} />
      <StatCard label="Identified events" value={`${identifiedShare}%`} note="Already attached to CRM leads" icon={<CheckCircle2 size={18}/>} />
      <StatCard label="Ad click IDs · 7d" value={(health.gclidEvents7d + health.fbclidEvents7d).toLocaleString()} note="Google + Meta click identifiers" icon={<Tags size={18}/>} />
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
      <div className="card-pad">
        <div className="eyebrow">Website installation</div>
        <div className="section-title mt-1">Tracker snippet</div>
        <p className="mt-2 text-sm leading-6 text-slate-500">Host the CRM, then add this script to Yogakulam pages directly or through Google Tag Manager. Replace the CRM domain with the actual deployment URL.</p>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{`<script\n  src="https://crm.yourdomain.com/yogakulam-tracker.js"\n  data-endpoint="https://crm.yourdomain.com/api/tracking/collect"\n  data-site="yogakulamacademy.com"\n  data-consent-mode="required"\n  defer>\n</script>`}</code></pre>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Mini icon={<Cookie size={16}/>} title="First touch" text="Preserved locally instead of being overwritten by later visits."/>
          <Mini icon={<MousePointerClick size={16}/>} title="Click IDs" text="Captures GCLID, GBRAID, WBRAID and FBCLID when present."/>
          <Mini icon={<ShieldCheck size={16}/>} title="Consent gate" text="Tracking waits for analytics consent by default."/>
        </div>
      </div>

      <div className="card-pad">
        <div className="eyebrow">Capture model</div>
        <div className="section-title mt-1">What gets recorded</div>
        <div className="mt-5 space-y-3">
          {[
            ['Acquisition', 'UTM source / medium / campaign / content / term + utm_id'],
            ['Google Ads', 'gclid, gbraid, wbraid, campaignid, adgroupid, creative'],
            ['Meta', 'fbclid plus campaign/ad-set/ad IDs when passed in the URL'],
            ['Journey', 'Landing page, referrer, page views and tagged CTA clicks'],
            ['Identity', 'Anonymous visitor ID + per-tab/session ID; no lead PII in tracking events'],
            ['Linking', 'When a lead is created, historical visitor touchpoints can be attached to that CRM lead'],
          ].map(([title,text]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><div className="text-sm font-bold text-slate-800">{title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{text}</div></div>)}
        </div>
      </div>
    </div>

    <div className="mt-4 card-pad">
      <div className="eyebrow">Tagged actions</div>
      <div className="section-title mt-1">Track important CTA clicks without custom JavaScript</div>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">Add data attributes to important links. The tracker records the click and keeps the destination/contact channel in metadata.</p>
      <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{`<a href="https://wa.me/..."\n   data-yk-event="whatsapp_click"\n   data-yk-channel="whatsapp"\n   data-yk-label="200H Course WhatsApp">\n  Enquire on WhatsApp\n</a>`}</code></pre>
    </div>
  </>;
}

function Mini({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) {
  return <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-slate-800">{icon}{title}</div><p className="mt-1.5 text-xs leading-5 text-slate-500">{text}</p></div>;
}

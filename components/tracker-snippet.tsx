'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export function TrackerSnippet() {
  const [origin, setOrigin] = useState('https://your-crm-domain.com');
  const [copied, setCopied] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const snippet = useMemo(() => `<script\n  src="${origin}/yogakulam-tracker.js"\n  data-endpoint="${origin}/api/tracking/collect"\n  data-site="yogakulamacademy.com"\n  data-consent-mode="required"\n  defer>\n</script>`, [origin]);

  const testSnippet = useMemo(() => `<script\n  src="${origin}/yogakulam-tracker.js"\n  data-endpoint="${origin}/api/tracking/collect"\n  data-site="yogakulamacademy.com"\n  data-consent-mode="granted"\n  data-debug="true"\n  defer>\n</script>`, [origin]);

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }

  return (
    <div className="mt-5 space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-400">Production snippet — consent required</div>
          <button type="button" onClick={() => copy(snippet)} className="btn-secondary !px-3 !py-2 text-xs">
            {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{snippet}</code></pre>
      </div>
      <div>
        <div className="mb-2 text-xs font-medium text-amber-600">Temporary testing snippet — use in GTM while diagnosing</div>
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{testSnippet}</code></pre>
      </div>
    </div>
  );
}

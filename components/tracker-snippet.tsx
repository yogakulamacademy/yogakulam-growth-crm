'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export function TrackerSnippet() {
  const [origin, setOrigin] = useState('https://your-crm-domain.com');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const snippet = useMemo(() => `<script\n  src="${origin}/yogakulam-tracker.js"\n  data-endpoint="${origin}/api/tracking/collect"\n  data-site="yogakulamacademy.com"\n  data-consent-mode="required"\n  defer>\n</script>`, [origin]);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-slate-400">Using this CRM deployment automatically</div>
        <button type="button" onClick={copySnippet} className="btn-secondary !px-3 !py-2 text-xs">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy snippet'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{snippet}</code></pre>
    </div>
  );
}

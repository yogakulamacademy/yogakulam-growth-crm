import Link from 'next/link';



import { notFound } from 'next/navigation';



import {



  ArrowLeft,



  CalendarClock,



  CircleDollarSign,



  Clock3,



  ExternalLink,



  Globe2,



  Mail,



  MapPin,



  MessageCircle,



  MessageSquarePlus,



  MousePointerClick,



  Pencil,



  Phone,



  Send,



  UserRound,



} from 'lucide-react';







import {



  createFollowUpAction,



  logLeadInteractionAction,



  recordPaymentAction,



  updateLeadStageAction,



} from '@/app/actions/crm';







import {

  PaymentCard,

} from '@/components/payment-card';



import {

  LeadJourneyIntelligence,

} from '@/components/lead-journey-intelligence';

import {
  PaidMediaAcquisition,
} from '@/components/paid-media-acquisition';







import {



  ChannelBadge,



  IntentLabel,



  PageHeader,



  StageBadge,



} from '@/components/ui';







import {



  getLead,



  getLeadPayments,



  isMockMode,



} from '@/lib/data';







import {



  formatDateTime,



} from '@/lib/format';







import type {



  Channel,



  LeadStage,



} from '@/types/crm';







const kindDot: Record<string, string> = {



  marketing: 'bg-violet-500',



  website: 'bg-sky-500',



  message: 'bg-emerald-500',



  stage: 'bg-orange-500',



  payment: 'bg-amber-500',



  system: 'bg-slate-400',



};







const stages: Array<[



  LeadStage,



  string,



]> = [



  ['new', 'New'],



  ['contacted', 'Contacted'],



  ['engaged', 'Engaged'],



  ['qualified', 'Qualified'],



  ['high_intent', 'High Intent'],



  ['payment_pending', 'Payment Pending'],



  ['enrolled', 'Enrolled'],



  ['nurture', 'Nurture'],



  ['not_now', 'Not Now'],



  ['lost', 'Lost'],



  ['unqualified', 'Unqualified'],



  ['duplicate', 'Duplicate'],



];







const channels: Array<[



  Channel,



  string,



]> = [



  ['instagram', 'Instagram'],



  ['whatsapp', 'WhatsApp'],



  ['website', 'Website'],



  ['email', 'Email'],



  ['phone', 'Phone'],



  ['meta_lead_form', 'Meta Lead Form'],



  ['other', 'Other'],



];







export default async function LeadDetailPage({



  params,



  searchParams,



}: {



  params: Promise<{ id: string }>;



  searchParams: Promise<{



    notice?: string;



    error?: string;



  }>;



}) {



  const [



    { id },



    query,



  ] = await Promise.all([



    params,



    searchParams,



  ]);







  const [



    lead,



    payments,



  ] = await Promise.all([



    getLead(id),



    getLeadPayments(id),



  ]);







  if (!lead) {



    notFound();



  }







  const stageAction =



    updateLeadStageAction.bind(



      null,



      id



    );







  const followUpAction =



    createFollowUpAction.bind(



      null,



      id



    );







  const interactionAction =



    logLeadInteractionAction.bind(



      null,



      id



    );







  const paymentAction =



    recordPaymentAction.bind(



      null,



      id



    );







  const mock =



    isMockMode();







  const visitorLocation = [



    lead.geoCity,



    lead.geoRegion,



    lead.geoCountry,



  ]



    .filter(Boolean)



    .join(', ') ||



    '—';







  const normalizedPoints =



    lead.touchpoints.map(



      (point) => ({



        point,



        haystack: [



          point.label,



          point.source,



          point.medium,



          point.detail,



        ]



          .filter(Boolean)



          .join(' ')



          .toLowerCase(),



      })



    );







  const pageViews =



    normalizedPoints.filter(



      ({ haystack }) =>



        haystack.includes('page view') ||



        haystack.includes('page_view') ||



        haystack.includes('pageview')



    ).length;







  const whatsappClicks =



    normalizedPoints.filter(



      ({ haystack }) =>



        haystack.includes('whatsapp') &&



        (



          haystack.includes('click') ||



          haystack.includes('cta')



        )



    ).length;







  const formStarts =



    normalizedPoints.filter(



      ({ haystack }) =>



        haystack.includes('form start') ||



        haystack.includes('form_start')



    ).length;







  const submissions =



    normalizedPoints.filter(



      ({ haystack }) =>



        haystack.includes('form submit') ||



        haystack.includes('form_submit') ||



        haystack.includes('lead form submit') ||



        haystack.includes('lead_form_submit')



    ).length;







  const whatsappPoints =



    normalizedPoints.filter(



      ({ haystack }) =>



        haystack.includes('whatsapp')



    );







  const latestWhatsapp =



    whatsappPoints.length > 0



      ? whatsappPoints[



          whatsappPoints.length - 1



        ].point



      : null;







  return (



    <>



      <Link



        href="/leads"



        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand"



      >



        <ArrowLeft size={15} />



        Back to leads



      </Link>







      <PageHeader



        title={lead.name}



        description={`${lead.leadCode} · ${lead.country} · ${lead.course}`}



        actions={



          <>



            <Link



              href={`/leads/${id}/edit`}



              className="btn-secondary"



            >



              <Pencil size={16} />



              Edit lead



            </Link>







            <Link



              href={`/conversations?lead=${id}`}



              className="btn-primary"



            >



              <MessageCircle size={16} />



              Open conversation



            </Link>



          </>



        }



      />







      {query.error && (



        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">



          {query.error}



        </div>



      )}







      {query.notice && (



        <div



          className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${



            query.notice.startsWith('mock-')



              ? 'border-orange-100 bg-orange-50 text-orange-700'



              : 'border-emerald-100 bg-emerald-50 text-emerald-700'



          }`}



        >



          {noticeText(



            query.notice



          )}



        </div>



      )}







      <div className="mb-4 flex flex-wrap gap-2">



        <StageBadge stage={lead.stage} />



        <IntentLabel intent={lead.intent} />



        <ChannelBadge channel={lead.currentContactChannel} />







        {mock && (



          <span className="inline-flex rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">



            Mock mode



          </span>



        )}



      </div>







      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">







        <div className="space-y-4">







          {/* =================================================



              LEAD INTELLIGENCE



          ================================================= */}







          <div className="card-pad">







            <div className="eyebrow">



              Lead intelligence



            </div>







            <div className="section-title mt-1">



              Overview



            </div>







            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">







              <Info



                icon={<MapPin size={16} />}



                label="Preferred location"



                value={lead.location}



              />







              <Info



                icon={<CalendarClock size={16} />}



                label="Preferred month"



                value={



                  lead.preferredMonth ??



                  '—'



                }



              />







              <Info



                icon={<UserRound size={16} />}



                label="Mode"



                value={



                  lead.preferredMode ??



                  '—'



                }



              />







              <Info



                icon={<CircleDollarSign size={16} />}



                label="Potential value"



                value={



                  lead.potentialValue != null &&



                  lead.potentialCurrency



                    ? formatMoney(



                        lead.potentialValue,



                        lead.potentialCurrency



                      )



                    : lead.value != null &&



                      lead.currency



                      ? formatMoney(



                          lead.value,



                          lead.currency



                        )



                      : '—'



                }



              />







            </div>











            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">







              <Info



                icon={<Globe2 size={16} />}



                label="Visitor location"



                value={visitorLocation}



              />







              <Info



                icon={<Clock3 size={16} />}



                label="Visitor timezone"



                value={



                  lead.geoTimezone ??



                  '—'



                }



              />







              <Info



                icon={<Send size={16} />}



                label="Lead origin"



                value={



                  prettyOptional(



                    lead.leadOrigin



                  )



                }



              />







              <Info



                icon={<ExternalLink size={16} />}



                label="Landing page"



                value={



                  lead.landingPage ??



                  '—'



                }



              />







            </div>











            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">







              <div>



                <div className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">



                  AI/CRM summary



                </div>







                <p className="mt-2 text-sm leading-6 text-slate-600">



                  {lead.summary}



                </p>



              </div>







              <div>



                <div className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">



                  Internal notes



                </div>







                <p className="mt-2 text-sm leading-6 text-slate-600">



                  {lead.notes}



                </p>



              </div>







            </div>







          </div>



          {/* =================================================

              WEBSITE JOURNEY INTELLIGENCE

          ================================================= */}



          <LeadJourneyIntelligence

            leadId={id}

          />



          {/* =================================================
              PAID MEDIA ACQUISITION
          ================================================= */}

          <PaidMediaAcquisition
            leadId={id}
          />





          {/* =================================================

              PAYMENT MODULE

          ================================================= */}



          <PaymentCard



            potentialValue={



              lead.potentialValue ??



              lead.value



            }



            potentialCurrency={



              lead.potentialCurrency ??



              lead.currency



            }



            payments={payments}



            action={paymentAction}



          />











          {/* =================================================



              ENGAGEMENT



          ================================================= */}







          <div className="card-pad">







            <div className="flex items-center justify-between gap-3">



              <div>



                <div className="eyebrow">



                  Website engagement



                </div>







                <div className="section-title mt-1">



                  Lead activity



                </div>



              </div>







              <MousePointerClick



                size={20}



                className="text-slate-400"



              />



            </div>







            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">



              <Metric



                label="Page views"



                value={pageViews}



              />







              <Metric



                label="WhatsApp clicks"



                value={whatsappClicks}



              />







              <Metric



                label="Form starts"



                value={formStarts}



              />







              <Metric



                label="Submissions"



                value={submissions}



              />



            </div>







            <div className="mt-4 rounded-xl bg-slate-50 p-4">



              <div className="text-xs font-semibold text-slate-400">



                Latest WhatsApp interaction



              </div>







              <div className="mt-2 text-sm font-semibold text-slate-700">



                {latestWhatsapp



                  ? `${latestWhatsapp.label} · ${formatDateTime(latestWhatsapp.timestamp)}`



                  : 'No WhatsApp interaction tracked yet.'}



              </div>







              {latestWhatsapp?.detail && (



                <div className="mt-1 text-xs leading-5 text-slate-500">



                  {latestWhatsapp.detail}



                </div>



              )}



            </div>







          </div>











          {/* =================================================



              TIMELINE



          ================================================= */}







          <div className="card-pad">







            <div className="flex items-center justify-between">



              <div>



                <div className="eyebrow">



                  Journey



                </div>







                <div className="section-title mt-1">



                  Lead timeline



                </div>



              </div>







              <span className="text-xs text-slate-400">



                {lead.touchpoints.length}{' '}



                events



              </span>



            </div>











            <div className="mt-6 space-y-0">







              {lead.touchpoints.length === 0 && (



                <div className="text-sm text-slate-400">



                  No timeline events yet.



                </div>



              )}











              {lead.touchpoints.map(



                (



                  point,



                  idx



                ) => (



                  <div



                    key={point.id}



                    className="relative flex gap-4 pb-6 last:pb-0"



                  >







                    {idx !==



                      lead.touchpoints.length - 1 && (



                        <div className="absolute left-[7px] top-4 h-[calc(100%-4px)] w-px bg-slate-200" />



                      )}







                    <div



                      className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white shadow ${



                        kindDot[point.kind] ??



                        'bg-slate-400'



                      }`}



                    />







                    <div className="min-w-0 flex-1">







                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">



                        <div className="text-sm font-semibold capitalize text-slate-800">



                          {point.label}



                        </div>







                        <div className="text-xs text-slate-400">



                          {formatDateTime(



                            point.timestamp



                          )}



                        </div>



                      </div>







                      <div className="mt-1 text-xs text-slate-500">



                        {point.source}



                        {point.medium



                          ? ` · ${point.medium}`



                          : ''}



                      </div>







                      {point.detail && (



                        <div className="mt-1.5 text-sm text-slate-600">



                          {point.detail}



                        </div>



                      )}







                    </div>







                  </div>



                )



              )}







            </div>







          </div>











          {/* =================================================



              RECENT INTERACTIONS



          ================================================= */}







          <div className="card-pad">







            <div className="flex items-center justify-between gap-3">



              <div>



                <div className="eyebrow">



                  Conversation



                </div>







                <div className="section-title mt-1">



                  Recent interactions



                </div>



              </div>







              <Link



                href={`/conversations?lead=${id}`}



                className="text-xs font-semibold text-brand"



              >



                Open inbox →



              </Link>



            </div>











            <div className="mt-5 space-y-3">







              {lead.lastMessages.length === 0 && (



                <div className="text-sm text-slate-400">



                  No interactions stored yet. Use “Log interaction” to test the workflow.



                </div>



              )}











              {lead.lastMessages.map(



                (msg) => (



                  <div



                    key={msg.id}



                    className={`flex ${



                      msg.direction === 'outbound'



                        ? 'justify-end'



                        : 'justify-start'



                    }`}



                  >







                    <div



                      className={`max-w-[82%] rounded-2xl px-4 py-3 ${



                        msg.direction === 'outbound'



                          ? 'bg-brand text-white'



                          : 'border border-slate-200 bg-slate-50 text-slate-700'



                      }`}



                    >







                      <div



                        className={`mb-1 text-[11px] font-semibold ${



                          msg.direction === 'outbound'



                            ? 'text-white/65'



                            : 'text-slate-400'



                        }`}



                      >



                        {msg.sender} · {msg.channel}



                      </div>







                      <div className="text-sm leading-6">



                        {msg.body}



                      </div>







                      <div



                        className={`mt-1 text-right text-[10px] ${



                          msg.direction === 'outbound'



                            ? 'text-white/55'



                            : 'text-slate-400'



                        }`}



                      >



                        {formatDateTime(



                          msg.timestamp



                        )}



                      </div>







                    </div>







                  </div>



                )



              )}







            </div>







          </div>







        </div>











        {/* ===================================================



            RIGHT SIDEBAR



        =================================================== */}







        <aside className="space-y-4">







          <div className="card-pad">







            <div className="eyebrow">



              Attribution



            </div>







            <div className="section-title mt-1">



              Acquisition path



            </div>







            <div className="mt-5 space-y-4">







              <KeyValue



                label="First touch"



                value={



                  lead.firstTouchSource



                }



                sub={



                  lead.firstTouchCampaign



                }



              />







              <KeyValue



                label="First touch medium"



                value={



                  lead.firstTouchMedium



                }



              />







              <KeyValue



                label="Last touch"



                value={



                  lead.lastTouchSource



                }



                sub={



                  lead.lastTouchCampaign



                }



              />







              <KeyValue



                label="Last touch medium"



                value={



                  lead.lastTouchMedium



                }



              />







              <KeyValue



                label="Lead created via"



                value={



                  lead.leadCreationChannel



                }



              />







              <KeyValue



                label="Current channel"



                value={



                  lead.currentContactChannel



                }



              />







            </div>







          </div>











          <div className="card-pad">







            <div className="eyebrow">



              Contact



            </div>







            <div className="section-title mt-1">



              Contact details



            </div>







            <div className="mt-4 space-y-3 text-sm text-slate-600">







              <div className="flex items-center gap-2">



                <Mail



                  size={15}



                  className="text-slate-400"



                />



                {lead.email ??



                  'Email not captured'}



              </div>







              <div className="flex items-center gap-2">



                <Phone



                  size={15}



                  className="text-slate-400"



                />



                {lead.phone ??



                  'Phone not captured'}



              </div>







              <div className="flex items-center gap-2">



                <Clock3



                  size={15}



                  className="text-slate-400"



                />



                Last contact:{' '}



                {formatDateTime(



                  lead.lastContactedAt



                )}



              </div>







            </div>







          </div>











          <div className="card-pad">







            <div className="eyebrow">



              Real-time testing



            </div>







            <div className="section-title mt-1">



              Log interaction



            </div>







            <p className="mt-2 text-xs leading-5 text-slate-400">



              Use this before Instagram/WhatsApp APIs are connected. It writes a real conversation + message to Supabase and updates contact timestamps.



            </p>







            <form



              action={interactionAction}



              className="mt-4 space-y-3"



            >







              <div className="grid grid-cols-2 gap-2">







                <select



                  className="input"



                  name="direction"



                  defaultValue="outbound"



                >



                  <option value="outbound">



                    Outbound



                  </option>



                  <option value="inbound">



                    Inbound



                  </option>



                </select>







                <select



                  className="input"



                  name="channel"



                  defaultValue={



                    lead.currentContactChannel ||



                    'whatsapp'



                  }



                >



                  {channels.map(



                    ([



                      value,



                      label,



                    ]) => (



                      <option



                        key={value}



                        value={value}



                      >



                        {label}



                      </option>



                    )



                  )}



                </select>







              </div>







              <textarea



                className="input min-h-24 resize-y"



                name="body"



                required



                placeholder="Paste or type the interaction here…"



              />







              <button



                className="btn-secondary w-full"



                type="submit"



              >



                <MessageSquarePlus size={15} />



                Log interaction



              </button>







            </form>







          </div>











          <div className="card-pad">







            <div className="eyebrow">



              Funnel



            </div>







            <div className="section-title mt-1">



              Change stage



            </div>







            <form



              action={stageAction}



              className="mt-4 space-y-3"



            >







              <select



                className="input"



                name="stage"



                defaultValue={lead.stage}



              >



                {stages.map(



                  ([



                    value,



                    label,



                  ]) => (



                    <option



                      key={value}



                      value={value}



                    >



                      {label}



                    </option>



                  )



                )}



              </select>







              <input



                className="input"



                name="reason"



                placeholder="Reason / context (optional)"



              />







              <button



                className="btn-secondary w-full"



                type="submit"



              >



                Update stage



              </button>







            </form>







          </div>











          <div className="card-pad">







            <div className="eyebrow">



              Next action



            </div>







            <div className="section-title mt-1">



              Schedule follow-up



            </div>







            <form



              action={followUpAction}



              className="mt-4 space-y-3"



            >







              <input



                className="input"



                name="title"



                required



                placeholder="e.g. Check deposit payment"



              />







              <input



                className="input"



                name="due_at"



                type="datetime-local"



                required



              />







              <textarea



                className="input min-h-20 resize-y"



                name="description"



                placeholder="Optional note"



              />







              <button



                className="btn-primary w-full"



                type="submit"



              >



                <CalendarClock size={15} />



                Create follow-up



              </button>







            </form>







            {lead.nextFollowupAt && (



              <div className="mt-3 text-xs text-slate-400">



                Current next follow-up:{' '}



                {formatDateTime(



                  lead.nextFollowupAt



                )}



              </div>



            )}







          </div>











          <div className="rounded-2xl bg-brand p-5 text-white shadow-card">







            <div className="text-xs font-bold uppercase tracking-[.14em] text-white/60">



              Agent layer later



            </div>







            <div className="mt-2 text-lg font-bold">



              Human-controlled first



            </div>







            <p className="mt-2 text-sm leading-6 text-white/70">



              Claude will later recommend the next action and draft replies here, while these CRM controls remain the source of truth.



            </p>







            <Link



              href="/follow-ups"



              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-brand"



            >



              View task queue



              <ExternalLink size={14} />



            </Link>







          </div>







        </aside>







      </div>



    </>



  );



}







function noticeText(



  notice: string



) {



  const messages: Record<



    string,



    string



  > = {



    updated:



      'Lead updated.',







    'stage-updated':



      'Funnel stage updated and recorded in stage history.',







    'followup-created':



      'Follow-up scheduled.',







    'interaction-logged':



      'Interaction logged. Contact timestamps, conversation history and funnel assistance were updated.',







    'payment-recorded':



      'Payment recorded successfully.',







    'mock-update':



      'Mock mode: changes were not persisted.',







    'mock-stage':



      'Mock mode: stage change was not persisted.',







    'mock-followup':



      'Mock mode: follow-up was not persisted.',







    'mock-interaction':



      'Mock mode: interaction was not persisted.',







    'mock-payment':



      'Mock mode: payment was not persisted.',



  };







  return (



    messages[notice] ??



    notice



  );



}







function Info({



  icon,



  label,



  value,



}: {



  icon: React.ReactNode;



  label: string;



  value: string;



}) {



  return (



    <div className="rounded-xl bg-slate-50 p-4">



      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">



        {icon}



        {label}



      </div>







      <div className="mt-2 break-words text-sm font-bold text-slate-800">



        {value}



      </div>



    </div>



  );



}







function Metric({



  label,



  value,



}: {



  label: string;



  value: number;



}) {



  return (



    <div className="rounded-xl bg-slate-50 p-4">



      <div className="text-xs font-semibold text-slate-400">



        {label}



      </div>







      <div className="mt-2 text-xl font-bold text-slate-800">



        {value}



      </div>



    </div>



  );



}







function KeyValue({



  label,



  value,



  sub,



}: {



  label: string;



  value?: string;



  sub?: string;



}) {



  const renderedValue =



    value



      ? value.replaceAll(



          '_',



          ' '



        )



      : '—';







  return (



    <div>



      <div className="text-xs font-semibold text-slate-400">



        {label}



      </div>







      <div className="mt-1 text-sm font-bold capitalize text-slate-800">



        {renderedValue}



      </div>







      {sub && (



        <div className="mt-0.5 text-xs text-slate-500">



          {sub}



        </div>



      )}



    </div>



  );



}







function prettyOptional(



  value?: string



) {



  if (!value) {



    return '—';



  }







  return value



    .replaceAll('_', ' ')



    .replace(



      /\b\w/g,



      (letter) =>



        letter.toUpperCase()



    );



}







function formatMoney(



  value: number,



  currency: string



) {



  const code =



    currency.toUpperCase();







  try {



    return new Intl.NumberFormat(



      code === 'INR'



        ? 'en-IN'



        : 'en-US',



      {



        style: 'currency',



        currency: code,



        maximumFractionDigits: 0,



      }



    ).format(value);



  } catch {



    return `${code} ${value}`;



  }



}

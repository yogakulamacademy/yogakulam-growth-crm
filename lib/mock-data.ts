import { CampaignPerformance, FollowUp, LeadDetail, LeadOverview, LeadStage } from '@/types/crm';

export const mockLeads: LeadOverview[] = [
  {
    id: 'lead-001', leadCode: 'LD-000184', name: 'Maya Keller', email: 'maya@example.com', course: '200-Hour Yoga Teacher Training', location: 'Mysore', country: 'Germany', stage: 'qualified', intent: 'medium', firstTouchSource: 'Google Ads', firstTouchMedium: 'CPC', firstTouchCampaign: '200H Europe Search', leadCreationChannel: 'instagram', currentContactChannel: 'instagram', owner: 'Admissions Team', lastContactedAt: '2026-09-24T08:24:00+05:30', nextFollowupAt: '2026-09-25T10:00:00+05:30', createdAt: '2026-09-22T14:10:00+05:30', value: 1750, currency: 'USD'
  },
  {
    id: 'lead-002', leadCode: 'LD-000185', name: 'Daniel Reed', phone: '+44 7700 900321', course: '200-Hour Yoga Teacher Training', location: 'Mysore', country: 'United Kingdom', stage: 'high_intent', intent: 'high', firstTouchSource: 'Instagram', firstTouchMedium: 'Organic', firstTouchCampaign: 'Student Story Reel', leadCreationChannel: 'instagram', currentContactChannel: 'whatsapp', owner: 'Arun', lastContactedAt: '2026-09-24T12:12:00+05:30', nextFollowupAt: '2026-09-24T17:00:00+05:30', createdAt: '2026-09-21T19:20:00+05:30', value: 2000, currency: 'USD'
  },
  {
    id: 'lead-003', leadCode: 'LD-000186', name: 'Sofia Martin', email: 'sofia@example.com', course: '300-Hour Yoga Teacher Training', location: 'Varkala', country: 'France', stage: 'payment_pending', intent: 'very_high', firstTouchSource: 'Meta Ads', firstTouchMedium: 'Paid Social', firstTouchCampaign: 'Kerala YTT Testimonials', leadCreationChannel: 'website', currentContactChannel: 'whatsapp', owner: 'Arun', lastContactedAt: '2026-09-24T11:40:00+05:30', nextFollowupAt: '2026-09-24T15:30:00+05:30', createdAt: '2026-09-20T10:03:00+05:30', value: 1750, currency: 'USD'
  },
  {
    id: 'lead-004', leadCode: 'LD-000187', name: 'Ava Thompson', course: '85-Hour Prenatal & Postnatal TTC', location: 'Online', country: 'Australia', stage: 'engaged', intent: 'medium', firstTouchSource: 'Instagram', firstTouchMedium: 'Organic', firstTouchCampaign: 'Prenatal Carousel', leadCreationChannel: 'instagram', currentContactChannel: 'instagram', owner: 'Admissions Team', lastContactedAt: '2026-09-24T09:05:00+05:30', nextFollowupAt: '2026-09-26T11:00:00+05:30', createdAt: '2026-09-23T07:43:00+05:30', value: 25000, currency: 'INR'
  },
  {
    id: 'lead-005', leadCode: 'LD-000188', name: 'Noah Wilson', course: 'Sound Healing Teacher Training - Level 1', location: 'Mysore', country: 'United States', stage: 'new', intent: 'unknown', firstTouchSource: 'Google Ads', firstTouchMedium: 'CPC', firstTouchCampaign: 'Sound Healing Search', leadCreationChannel: 'website', currentContactChannel: 'email', owner: 'Unassigned', createdAt: '2026-09-24T13:46:00+05:30', value: 40000, currency: 'INR'
  },
  {
    id: 'lead-006', leadCode: 'LD-000189', name: 'Isabella Rossi', course: '200-Hour Yoga Teacher Training', location: 'Varkala', country: 'Italy', stage: 'contacted', intent: 'low', firstTouchSource: 'SEO', firstTouchMedium: 'Organic Search', firstTouchCampaign: '200H Kerala Organic', leadCreationChannel: 'website', currentContactChannel: 'whatsapp', owner: 'Admissions Team', lastContactedAt: '2026-09-24T12:40:00+05:30', nextFollowupAt: '2026-09-27T10:00:00+05:30', createdAt: '2026-09-24T10:12:00+05:30', value: 1550, currency: 'USD'
  },
  {
    id: 'lead-007', leadCode: 'LD-000190', name: 'Emma Brooks', course: '200-Hour Yoga Teacher Training', location: 'Mysore', country: 'Canada', stage: 'nurture', intent: 'medium', firstTouchSource: 'Meta Ads', firstTouchMedium: 'Paid Social', firstTouchCampaign: 'October Scholarship', leadCreationChannel: 'instagram', currentContactChannel: 'instagram', owner: 'Arun', lastContactedAt: '2026-09-22T17:00:00+05:30', nextFollowupAt: '2026-10-05T10:00:00+05:30', createdAt: '2026-09-18T21:30:00+05:30', value: 1500, currency: 'USD'
  },
  {
    id: 'lead-008', leadCode: 'LD-000191', name: 'Liam Carter', course: '200-Hour Yoga Teacher Training', location: 'Mysore', country: 'Singapore', stage: 'enrolled', intent: 'very_high', firstTouchSource: 'Referral', firstTouchMedium: 'Word of Mouth', firstTouchCampaign: 'Alumni Referral', leadCreationChannel: 'whatsapp', currentContactChannel: 'whatsapp', owner: 'Arun', lastContactedAt: '2026-09-23T16:52:00+05:30', createdAt: '2026-09-15T09:16:00+05:30', value: 1750, currency: 'USD'
  },
  {
    id: 'lead-009', leadCode: 'LD-000192', name: 'Chloe Dubois', course: '300-Hour Yoga Teacher Training', location: 'Varkala', country: 'Belgium', stage: 'qualified', intent: 'high', firstTouchSource: 'Instagram', firstTouchMedium: 'Organic', firstTouchCampaign: 'Teacher Interview Reel', leadCreationChannel: 'instagram', currentContactChannel: 'whatsapp', owner: 'Admissions Team', lastContactedAt: '2026-09-24T10:14:00+05:30', nextFollowupAt: '2026-09-25T09:30:00+05:30', createdAt: '2026-09-22T20:11:00+05:30', value: 1550, currency: 'USD'
  },
  {
    id: 'lead-010', leadCode: 'LD-000193', name: 'Ethan Brown', course: '200-Hour Yoga Teacher Training', location: 'Online', country: 'United Arab Emirates', stage: 'lost', intent: 'low', firstTouchSource: 'Google Ads', firstTouchMedium: 'CPC', firstTouchCampaign: 'Online 200H International', leadCreationChannel: 'website', currentContactChannel: 'email', owner: 'Admissions Team', lastContactedAt: '2026-09-20T17:02:00+05:30', createdAt: '2026-09-17T08:40:00+05:30', value: 399, currency: 'USD'
  },
  {
    id: 'lead-011', leadCode: 'LD-000194', name: 'Mia Tan', course: 'Face Yoga Teacher Training', location: 'Online', country: 'Malaysia', stage: 'high_intent', intent: 'high', firstTouchSource: 'Instagram', firstTouchMedium: 'Organic', firstTouchCampaign: 'Face Yoga Before After', leadCreationChannel: 'instagram', currentContactChannel: 'instagram', owner: 'Arun', lastContactedAt: '2026-09-24T13:02:00+05:30', nextFollowupAt: '2026-09-25T12:00:00+05:30', createdAt: '2026-09-23T18:30:00+05:30', value: 15000, currency: 'INR'
  },
  {
    id: 'lead-012', leadCode: 'LD-000195', name: 'Lucas Meyer', course: '200-Hour Yoga Teacher Training', location: 'Mysore', country: 'Switzerland', stage: 'payment_pending', intent: 'very_high', firstTouchSource: 'Google Ads', firstTouchMedium: 'CPC', firstTouchCampaign: '200H Europe Search', leadCreationChannel: 'website', currentContactChannel: 'whatsapp', owner: 'Arun', lastContactedAt: '2026-09-24T13:18:00+05:30', nextFollowupAt: '2026-09-24T18:00:00+05:30', createdAt: '2026-09-19T12:25:00+05:30', value: 2000, currency: 'USD'
  },
];

const maya: LeadDetail = {
  ...mockLeads[0],
  preferredMonth: 'December 2026',
  preferredMode: 'Residential',
  timezone: 'Europe/Berlin',
  summary: 'Interested in December 200H residential training in Mysore. Beginner level. Asked about Yoga Alliance certification and private accommodation.',
  notes: 'Keep the next reply concise. She is comparing private-room options and likely to decide after checking flights.',
  touchpoints: [
    { id: 't1', kind: 'marketing', label: 'Google Ads click', source: 'Google Ads', medium: 'CPC', timestamp: '2026-09-20T09:20:00+05:30', detail: '200H Europe Search · “yoga teacher training india”' },
    { id: 't2', kind: 'website', label: 'Viewed 200H Mysore page', source: 'Website', timestamp: '2026-09-20T09:21:00+05:30', detail: '/200-hour-yoga-teacher-training-mysore' },
    { id: 't3', kind: 'website', label: 'Viewed accommodation', source: 'Website', timestamp: '2026-09-20T09:27:00+05:30', detail: 'Private room section' },
    { id: 't4', kind: 'message', label: 'Instagram DM received', source: 'Instagram', timestamp: '2026-09-22T14:10:00+05:30', detail: 'Asked about December 200H course.' },
    { id: 't5', kind: 'stage', label: 'Lead qualified', source: 'CRM', timestamp: '2026-09-22T14:24:00+05:30', detail: 'Course, month and residential preference confirmed.' },
    { id: 't6', kind: 'message', label: 'Accommodation question', source: 'Instagram', timestamp: '2026-09-24T08:24:00+05:30', detail: 'Asked whether a private room is available.' },
  ],
  lastMessages: [
    { id: 'm1', direction: 'inbound', sender: 'Maya', body: 'Hi, I am looking for a 200 hour course in December. I am still a beginner.', timestamp: '2026-09-22T14:10:00+05:30', channel: 'instagram' },
    { id: 'm2', direction: 'outbound', sender: 'Admissions', body: 'Yes 😊 Our 200H training is beginner-friendly. Are you looking for Mysore or Kerala?', timestamp: '2026-09-22T14:12:00+05:30', channel: 'instagram' },
    { id: 'm3', direction: 'inbound', sender: 'Maya', body: 'Mysore. Is it Yoga Alliance certified and do you have private accommodation?', timestamp: '2026-09-24T08:22:00+05:30', channel: 'instagram' },
    { id: 'm4', direction: 'outbound', sender: 'Admissions', body: 'Yes, the training is Yoga Alliance accredited, and private-room options are available. I can share the December fee options.', timestamp: '2026-09-24T08:24:00+05:30', channel: 'instagram' },
  ],
};

export const mockLeadDetails: Record<string, LeadDetail> = Object.fromEntries(
  mockLeads.map((lead) => [lead.id, lead.id === maya.id ? maya : {
    ...lead,
    preferredMonth: lead.stage === 'enrolled' ? 'October 2026' : 'December 2026',
    preferredMode: lead.location === 'Online' ? 'Online' : 'Residential',
    summary: `${lead.name} is interested in ${lead.course}. Current stage is ${lead.stage.replaceAll('_', ' ')}.`,
    notes: 'Fictional development record.',
    touchpoints: [
      { id: `${lead.id}-t1`, kind: 'marketing', label: `${lead.firstTouchSource} first touch`, source: lead.firstTouchSource, medium: lead.firstTouchMedium, timestamp: lead.createdAt, detail: lead.firstTouchCampaign },
      { id: `${lead.id}-t2`, kind: 'message', label: `Lead created via ${lead.leadCreationChannel}`, source: lead.leadCreationChannel, timestamp: lead.createdAt },
      { id: `${lead.id}-t3`, kind: 'stage', label: `Moved to ${lead.stage.replaceAll('_', ' ')}`, source: 'CRM', timestamp: lead.lastContactedAt ?? lead.createdAt },
    ],
    lastMessages: [
      { id: `${lead.id}-m1`, direction: 'inbound', sender: lead.name, body: `Hi, I would like more details about ${lead.course}.`, timestamp: lead.createdAt, channel: lead.leadCreationChannel },
      { id: `${lead.id}-m2`, direction: 'outbound', sender: 'Admissions', body: 'Thank you for reaching out. Which month are you considering?', timestamp: lead.lastContactedAt ?? lead.createdAt, channel: lead.currentContactChannel },
    ],
  } as LeadDetail])
);

export const mockFollowUps: FollowUp[] = [
  { id: 'fu-1', leadId: 'lead-003', leadCode: 'LD-000186', leadName: 'Sofia Martin', title: 'Check deposit payment', dueAt: '2026-09-24T15:30:00+05:30', stage: 'payment_pending', intent: 'very_high', channel: 'whatsapp' },
  { id: 'fu-2', leadId: 'lead-002', leadCode: 'LD-000185', leadName: 'Daniel Reed', title: 'Follow up on private room', dueAt: '2026-09-24T17:00:00+05:30', stage: 'high_intent', intent: 'high', channel: 'whatsapp' },
  { id: 'fu-3', leadId: 'lead-012', leadCode: 'LD-000195', leadName: 'Lucas Meyer', title: 'Payment link follow-up', dueAt: '2026-09-24T18:00:00+05:30', stage: 'payment_pending', intent: 'very_high', channel: 'whatsapp' },
  { id: 'fu-4', leadId: 'lead-001', leadCode: 'LD-000184', leadName: 'Maya Keller', title: 'Share December room options', dueAt: '2026-09-25T10:00:00+05:30', stage: 'qualified', intent: 'medium', channel: 'instagram' },
  { id: 'fu-5', leadId: 'lead-009', leadCode: 'LD-000192', leadName: 'Chloe Dubois', title: 'Confirm preferred December location', dueAt: '2026-09-25T09:30:00+05:30', stage: 'qualified', intent: 'high', channel: 'whatsapp' },
];

export const mockCampaigns: CampaignPerformance[] = [
  { id: 'c1', name: '200H Europe Search', platform: 'Google Ads', spend: 124000, leads: 436, qualified: 139, highIntent: 62, enrolled: 22, revenue: 3314000 },
  { id: 'c2', name: 'Kerala YTT Testimonials', platform: 'Meta Ads', spend: 98000, leads: 612, qualified: 143, highIntent: 55, enrolled: 18, revenue: 2480000 },
  { id: 'c3', name: 'October Scholarship', platform: 'Meta Ads', spend: 76000, leads: 824, qualified: 91, highIntent: 29, enrolled: 8, revenue: 984000 },
  { id: 'c4', name: 'Sound Healing Search', platform: 'Google Ads', spend: 42000, leads: 165, qualified: 58, highIntent: 24, enrolled: 11, revenue: 396000 },
  { id: 'c5', name: 'Online 200H International', platform: 'Google Ads', spend: 53000, leads: 284, qualified: 74, highIntent: 31, enrolled: 14, revenue: 536000 },
];

export const stageOrder: LeadStage[] = ['new', 'contacted', 'engaged', 'qualified', 'high_intent', 'payment_pending', 'enrolled'];

export const dashboardStageCounts: Record<LeadStage, number> = {
  new: 2086,
  contacted: 1967,
  engaged: 1421,
  qualified: 523,
  high_intent: 214,
  payment_pending: 121,
  enrolled: 86,
  nurture: 73,
  not_now: 31,
  lost: 44,
  unqualified: 12,
  duplicate: 4,
};

export const sourceBreakdown = [
  { source: 'Instagram Organic', leads: 718, share: 34, qualified: 162 },
  { source: 'Meta Ads', leads: 581, share: 28, qualified: 119 },
  { source: 'Google Ads', leads: 412, share: 20, qualified: 132 },
  { source: 'Website / SEO', leads: 249, share: 12, qualified: 71 },
  { source: 'Referral / Other', leads: 126, share: 6, qualified: 39 },
];

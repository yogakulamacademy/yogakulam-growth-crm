-- Optional development seed data. Uses fictional leads only.

insert into public.courses (code, name, category, hours)
values
  ('YTT-200', '200-Hour Yoga Teacher Training', 'Yoga Teacher Training', 200),
  ('YTT-300', '300-Hour Yoga Teacher Training', 'Yoga Teacher Training', 300),
  ('PRENATAL-85', '85-Hour Prenatal & Postnatal Yoga Teacher Training', 'Prenatal', 85),
  ('SOUND-L1', 'Sound Healing Teacher Training - Level 1', 'Sound Healing', null)
on conflict (code) do nothing;

insert into public.campaigns (platform, external_campaign_id, name, source, medium, objective)
values
  ('google_ads', 'demo-google-001', 'Demo 200H Search', 'google', 'cpc', 'lead_generation'),
  ('meta_ads', 'demo-meta-001', 'Demo Instagram Testimonials', 'instagram', 'paid_social', 'messages')
on conflict (platform, external_campaign_id) do nothing;

-- Add fictional leads
with course_200 as (
  select id from public.courses where code = 'YTT-200'
)
insert into public.leads (
  first_name, last_name, display_name, current_stage, intent,
  interested_course_id, preferred_location, country,
  lead_creation_channel, current_contact_channel, next_followup_at
)
select * from (
  values
    ('Maya','Keller','Maya Keller','qualified'::public.lead_stage,'medium'::public.intent_level,(select id from course_200),'Mysore','Germany','instagram'::public.contact_channel,'instagram'::public.contact_channel, now() + interval '1 day'),
    ('Daniel','Reed','Daniel Reed','high_intent'::public.lead_stage,'high'::public.intent_level,(select id from course_200),'Mysore','United Kingdom','whatsapp'::public.contact_channel,'whatsapp'::public.contact_channel, now() + interval '4 hours'),
    ('Sofia','Martin','Sofia Martin','payment_pending'::public.lead_stage,'very_high'::public.intent_level,(select id from course_200),'Kerala','France','website'::public.contact_channel,'whatsapp'::public.contact_channel, now() + interval '2 hours')
) as v(first_name,last_name,display_name,current_stage,intent,interested_course_id,preferred_location,country,lead_creation_channel,current_contact_channel,next_followup_at);


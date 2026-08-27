-- ============================================================
-- Seed: Villa Dunes — run AFTER 001_initial_schema.sql
-- ============================================================

insert into properties (
  slug, name, name_ar, city, address,
  lat, lng, map_pin_lat, map_pin_lng,
  bedrooms, max_guests,
  wifi_ssid,
  checkin_time, checkout_time,
  requires_code_second_factor,
  on_call_phone
) values (
  'villa-dunes',
  'Villa Dunes',
  'فيلا ديونز',
  'North Coast',
  'Sidi Heneish, North Coast, Egypt',
  31.100, 27.480,   -- replace with real coordinates
  31.100, 27.480,   -- replace with the gate pin, not address centroid
  4, 8,
  'JOOD_Dunes_5G',  -- real SSID — wifi password set via admin or encrypted insert below
  '15:00', '11:00',
  false,            -- set true to require phone last-4 for door code
  '201XXXXXXXXX'    -- replace with your on-call WhatsApp number (no +)
);

-- ────────────────────────────────────────────────────────────
-- House manual entries for Villa Dunes
-- Add/edit these in the admin content editor (Phase 1 admin)
-- or directly here for the initial seed.
-- ────────────────────────────────────────────────────────────
-- Example wifi entry (wifi_ssid/password is shown from properties row,
-- but a manual card gives the full join instructions):
insert into property_content (
  property_id, section, sort_order,
  title_en, title_ar,
  body_en, body_ar,
  is_published
) values (
  (select id from properties where slug = 'villa-dunes'),
  'wifi', 1,
  'Wi-Fi',
  'الواي فاي',
  'Network: JOOD_Dunes_5G — password shown on your app home screen. If you have trouble connecting, try forgetting the network and reconnecting.',
  'الشبكة: JOOD_Dunes_5G — كلمة المرور موضحة في الشاشة الرئيسية للتطبيق. إذا واجهتَ صعوبة في الاتصال، جرّب نسيان الشبكة وإعادة الاتصال.',
  true
),
(
  (select id from properties where slug = 'villa-dunes'),
  'ac', 2,
  'AC & Heating',
  'التكييف والتدفئة',
  'Each room has its own split unit. Turn the dial to your desired temperature and press the snowflake button for cooling. The pool area has no AC — a fan is in the outdoor storage.',
  'كل غرفة لديها وحدة تكييف مستقلة. أدر المقبض على درجة الحرارة المطلوبة واضغط زر الثلجة للتبريد. منطقة المسبح ليس فيها تكييف — مروحة متاحة في مخزن الخارج.',
  true
),
(
  (select id from properties where slug = 'villa-dunes'),
  'pool', 3,
  'Pool & Outdoor',
  'المسبح والخارج',
  'The pool is heated to 28°C. Towels are in the outdoor storage cabinet. Please shower before entering. The pool lights turn on automatically at dusk.',
  'المسبح مدفأ على ٢٨ درجة. المناشف في خزانة التخزين الخارجية. الرجاء الاستحمام قبل الدخول. تضيء أنوار المسبح تلقائيًا عند الغسق.',
  true
),
(
  (select id from properties where slug = 'villa-dunes'),
  'rules', 4,
  'House Rules',
  'قواعد المنزل',
  'No shoes inside. No smoking indoors — there is an outdoor ashtray. Keep music at a considerate level after 11pm. Maximum 8 guests.',
  'لا أحذية داخل المنزل. لا تدخين داخل المنزل — يوجد طفاية سجائر خارجية. الرجاء خفض الموسيقى بعد الساعة ١١ مساءً. الحد الأقصى ٨ ضيوف.',
  true
),
(
  (select id from properties where slug = 'villa-dunes'),
  'emergency', 5,
  'Emergency Contacts',
  'جهات الطوارئ',
  'On-call: WhatsApp the help button in this app. Nearest hospital: Sidi Heneish Hospital, 15 min drive. Ambulance: 123. Police: 122. Fire: 180.',
  'للطوارئ: واتساب من خلال زر المساعدة في التطبيق. أقرب مستشفى: مستشفى سيدي حنيش، ١٥ دقيقة بالسيارة. إسعاف: ١٢٣. شرطة: ١٢٢. حرائق: ١٨٠.',
  true
);

-- ============================================================
-- Seed: Recommendations for Villa Dunes — North Coast
-- Run AFTER 001_villa_dunes.sql
-- ============================================================

insert into recommendations (
  scope, property_id, category,
  name, blurb_en, blurb_ar,
  lat, lng, price_band, jood_can_arrange, sort_order
) values

-- ─── RESTAURANTS ──────────────────────────────────────────────
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'restaurants',
  'Kiki Beachside',
  'The best seafood on the strip. Sit on the sand, order the grilled sea bass and the saganaki. No reservations — arrive before sunset.',
  'أفضل مأكولات بحرية على الشريط. اجلس على الرمال واطلب السيباس المشوي والساجاناكي. بدون حجز — تعال قبل الغروب.',
  31.085, 27.452,
  3, false, 1
),
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'restaurants',
  'Azzurra',
  'Italian-Mediterranean spot inside Marassi. Great pasta, solid wine list. Gets crowded after 9 PM — book ahead.',
  'مطعم إيطالي-متوسطي داخل مراسي. باستا ممتازة وقائمة نبيذ جيدة. يزدحم بعد التاسعة — احجز مسبقاً.',
  31.030, 27.540,
  3, false, 2
),
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'restaurants',
  'El Dabaa Fish Market',
  'Locals-only spot 10 minutes west. Pick your fish by the kilo, they grill it in front of you. Absurdly cheap and completely delicious.',
  'مطعم السكان المحليين على بُعد ١٠ دقائق غرباً. اختر سمكتك بالكيلو وسيشووها أمامك. رخيص بشكل مجنون ولذيذ تماماً.',
  31.020, 27.380,
  1, false, 3
),

-- ─── CAFES ────────────────────────────────────────────────────
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'cafes',
  'Mocha Mia',
  'Espresso bar tucked inside Hacienda Bay. Cold brew, açaí bowls, decent pastries. Opens at 8 AM — perfect for an early-morning run finish.',
  'بار إسبريسو داخل هاسيندا باي. كولد برو وأوعية أساي وحلويات لائقة. يفتح في الثامنة صباحاً — مثالي بعد ركض الصباح.',
  31.055, 27.490,
  2, false, 1
),

-- ─── BEACH & CLUBS ────────────────────────────────────────────
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'beach',
  'Hacienda Bay Beach Club',
  'Full-service beach club 15 minutes away. Sun loungers, waiter service, water sports rental. Day passes available — JOOD can reserve for you.',
  'نادي شاطئي متكامل على بُعد ١٥ دقيقة. مقاعد شمس، خدمة على الطاولة، تأجير رياضات مائية. تصاريح يومية متاحة — جود تحجز لك.',
  31.060, 27.500,
  3, true, 1
),
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'beach',
  'Sidi Heneish Public Beach',
  'Free public beach 5 minutes by car. Calmer waters than the open sea, good for young kids. Gets busy on Fridays.',
  'شاطئ عام مجاني على بُعد ٥ دقائق بالسيارة. مياه أهدأ من البحر المفتوح، مناسب للأطفال الصغار. يزدحم الجمعة.',
  31.098, 27.476,
  1, false, 2
),

-- ─── GROCERIES ────────────────────────────────────────────────
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'groceries',
  'Sidi Heneish Market',
  'Nearest produce market. Fresh vegetables and fruit every morning. Basic pantry staples too — olive oil, pasta, eggs.',
  'أقرب سوق خضار وفاكهة. منتجات طازجة كل صباح. أساسيات المطبخ أيضاً — زيت زيتون، معكرونة، بيض.',
  31.102, 27.478,
  1, false, 1
),
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'groceries',
  'Carrefour Express — Hacienda Bay',
  'Supermarket inside the compound. Pre-stocked trolley option: tell JOOD what you need and it will be waiting in the villa on arrival.',
  'سوبر ماركت داخل الكمبوند. خيار التعبئة المسبقة: أخبر جود بما تحتاج وستجده في الفيلا عند وصولك.',
  31.058, 27.497,
  2, true, 2
),

-- ─── ACTIVITIES ───────────────────────────────────────────────
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'activities',
  'Kite Surfing — Ras El Hekma',
  'Consistent wind corridor 20 minutes east makes this one of the best kite spots in Egypt. Equipment rental and lessons available on-site.',
  'ممر رياح ثابت على بُعد ٢٠ دقيقة شرقاً، يجعل هذا من أفضل مواقع الكايت في مصر. تأجير معدات ودروس متاحة.',
  31.085, 27.640,
  2, true, 1
),
(
  'property',
  (select id from properties where slug = 'villa-dunes'),
  'activities',
  'Quad Biking — Sidi Heneish Desert',
  'Desert quad tours leaving from near the highway. 90-minute circuit through dunes. Wear closed shoes and bring a buff for dust.',
  'جولات كوادات في الصحراء تنطلق بالقرب من الطريق السريع. جولة ٩٠ دقيقة عبر الكثبان. ارتدِ حذاءً مغلقاً.',
  31.090, 27.460,
  2, false, 2
);

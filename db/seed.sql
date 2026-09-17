-- Curriculum-only demo seed. No real learner or personal data.

insert into books (code, title_en, title_vi, description_en, description_vi, level_label, age_band, version, status)
values (
  'CCJ-MASTERY-BEGINNER',
  'Career Compass Junior Mastery — Beginner',
  'Career Compass Junior Mastery — Sơ cấp',
  'English communication, life skills and career discovery for young learners.',
  'Giao tiếp tiếng Anh, kỹ năng sống và khám phá nghề nghiệp dành cho học sinh nhỏ tuổi.',
  'Beginner / A1 pathway',
  '7-12',
  '1.0',
  'published'
)
on conflict (code) do update set
  title_en = excluded.title_en,
  title_vi = excluded.title_vi,
  description_en = excluded.description_en,
  description_vi = excluded.description_vi,
  level_label = excluded.level_label,
  age_band = excluded.age_band,
  version = excluded.version,
  status = excluded.status;

with book as (
  select id from books where code = 'CCJ-MASTERY-BEGINNER'
)
insert into book_units (
  book_id, unit_number, code, title_en, title_vi, objective_en, objective_vi,
  career_compass_focus, mastery_english_focus, sort_order, status
)
select book.id, 1, 'U01', 'My Voice & Strengths', 'Tiếng nói và điểm mạnh của em',
  'Introduce yourself with simple, confident English and identify personal interests.',
  'Giới thiệu bản thân bằng tiếng Anh đơn giản, tự tin và nhận biết sở thích cá nhân.',
  'Identity, confidence and self-awareness', 'Greetings, introductions, classroom language and first speaking confidence', 1, 'published'
from book
on conflict (book_id, unit_number) do update set
  code = excluded.code,
  title_en = excluded.title_en,
  title_vi = excluded.title_vi,
  objective_en = excluded.objective_en,
  objective_vi = excluded.objective_vi,
  career_compass_focus = excluded.career_compass_focus,
  mastery_english_focus = excluded.mastery_english_focus,
  status = excluded.status;

with unit as (
  select bu.id
  from book_units bu
  join books b on b.id = bu.book_id
  where b.code = 'CCJ-MASTERY-BEGINNER' and bu.code = 'U01'
)
insert into activities (
  unit_id, code, activity_type, title_en, title_vi, instructions_en, instructions_vi,
  content, evidence_eligible, sort_order, status
)
select unit.id, 'U01-A01', 'look_listen_say', 'Look, Listen & Say', 'Nhìn, Nghe & Nói',
  'Look at each picture, listen, then say the word aloud.',
  'Nhìn từng hình, nghe, sau đó nói to từ đó.',
  '{"items":[{"word":"curious","vi":"tò mò"},{"word":"kind","vi":"tử tế"},{"word":"creative","vi":"sáng tạo"}]}'::jsonb,
  false, 1, 'published'
from unit
on conflict (unit_id, code) do update set
  title_en = excluded.title_en,
  title_vi = excluded.title_vi,
  instructions_en = excluded.instructions_en,
  instructions_vi = excluded.instructions_vi,
  content = excluded.content,
  status = excluded.status;

with unit as (
  select bu.id
  from book_units bu
  join books b on b.id = bu.book_id
  where b.code = 'CCJ-MASTERY-BEGINNER' and bu.code = 'U01'
)
insert into activities (
  unit_id, code, activity_type, title_en, title_vi, instructions_en, instructions_vi,
  content, evidence_eligible, sort_order, status
)
select unit.id, 'U01-A02', 'speaking_model', 'My Speaking Model', 'Mẫu nói của em',
  'Use the model, then record or present your own short introduction.',
  'Dùng mẫu câu, sau đó ghi âm hoặc trình bày phần giới thiệu ngắn của em.',
  '{"model":"Hi! My name is ____. I am __ years old. I like ____. I am good at ____."}'::jsonb,
  true, 2, 'published'
from unit
on conflict (unit_id, code) do update set
  title_en = excluded.title_en,
  title_vi = excluded.title_vi,
  instructions_en = excluded.instructions_en,
  instructions_vi = excluded.instructions_vi,
  content = excluded.content,
  evidence_eligible = excluded.evidence_eligible,
  status = excluded.status;

-- One persistence anchor per interactive lesson. The renderer can evolve independently;
-- attempts and progress always reference stable activity codes.
with unit as (
  select bu.id
  from book_units bu
  join books b on b.id = bu.book_id
  where b.code = 'CCJ-MASTERY-BEGINNER' and bu.code = 'U01'
), lesson_seed(code, title_en, title_vi, kind, lesson_id, evidence_eligible, sort_order) as (
  values
    ('U01-L01','Hello team','Xin chào các bạn','choice',1,false,11),
    ('U01-L02','My age and my voice','Tuổi của em','age',2,false,12),
    ('U01-L03','Listen and move','Lắng nghe và làm theo','sequence',3,false,13),
    ('U01-L04','Please help me','Nhờ giúp đỡ một cách lịch sự','build',4,false,14),
    ('U01-L05','Colors around me','Màu sắc quanh em','color',5,false,15),
    ('U01-L06','Feelings and choices','Cảm xúc và sở thích','pair',6,false,16),
    ('U01-L07','My first introduction','Lời giới thiệu đầu tiên','sequence',7,true,17),
    ('U01-L08','Checkpoint one welcome club','Trạm ôn tập một','checkpoint',8,true,18)
)
insert into activities (
  unit_id, code, activity_type, title_en, title_vi,
  instructions_en, instructions_vi, content, max_score,
  evidence_eligible, sort_order, status
)
select
  unit.id,
  lesson_seed.code,
  'self_check',
  lesson_seed.title_en,
  lesson_seed.title_vi,
  'Complete the interactive lesson check. Retry is allowed.',
  'Hoàn thành phần kiểm tra tương tác. Có thể thử lại.',
  jsonb_build_object('kind', lesson_seed.kind, 'lessonId', lesson_seed.lesson_id),
  1,
  lesson_seed.evidence_eligible,
  lesson_seed.sort_order,
  'published'
from unit cross join lesson_seed
on conflict (unit_id, code) do update set
  title_en = excluded.title_en,
  title_vi = excluded.title_vi,
  content = excluded.content,
  max_score = excluded.max_score,
  evidence_eligible = excluded.evidence_eligible,
  sort_order = excluded.sort_order,
  status = excluded.status;

-- Interactive starter seed for the three catalog books that are not yet persisted.
-- This is intentionally limited to the catalog starter units; full publisher-approved
-- book content should be imported separately rather than invented here.

insert into books (code, title_en, title_vi, description_en, description_vi, level_label, age_band, version, status)
values
  ('CCJ-BIG-IDEAS', 'Career Compass Junior — Big Ideas, Bright Futures', 'Career Compass Junior — Big Ideas, Bright Futures', 'English + skills adventure for curious minds, projects, communication and future readiness.', 'Hành trình tiếng Anh và kỹ năng cho tư duy tò mò, dự án, giao tiếp và sẵn sàng cho tương lai.', 'A0–A2', '7–12', 'starter-1', 'published'),
  ('MY-COMPASS', 'MY COMPASS — English + Life Skills + Career Discovery', 'MY COMPASS — Tiếng Anh + Kỹ năng sống + Khám phá nghề nghiệp', 'Teen learning journey for English, life skills, self-awareness and early career discovery.', 'Hành trình dành cho tuổi teen về tiếng Anh, kỹ năng sống, tự nhận thức và khám phá nghề nghiệp ban đầu.', 'A0–A1', '13–18', 'starter-1', 'published'),
  ('EERS-ACTION-CITY', 'EERS Action City — My First Sound Adventures', 'EERS Action City — Cuộc phiêu lưu âm thanh đầu tiên', 'Listen, move, trace, play and build early English sound confidence through action-based learning.', 'Nghe, vận động, tô nét, chơi và xây dựng sự tự tin với âm tiếng Anh qua học tập bằng hành động.', 'Pre-A1', '4–6', 'starter-1', 'published')
on conflict (code) do update set
  title_en=excluded.title_en,
  title_vi=excluded.title_vi,
  description_en=excluded.description_en,
  description_vi=excluded.description_vi,
  level_label=excluded.level_label,
  age_band=excluded.age_band,
  updated_at=now();

insert into book_units (book_id, unit_number, code, title_en, title_vi, objective_en, objective_vi, career_compass_focus, mastery_english_focus, sort_order, status)
select b.id, v.unit_number, v.code, v.title_en, v.title_vi, v.objective_en, v.objective_vi, v.career_focus, v.mastery_focus, v.unit_number, 'published'
from (values
  ('CCJ-BIG-IDEAS',1,'U01','My Big Idea','Ý tưởng lớn của em','Introduce an idea and explain one reason it matters.','Giới thiệu một ý tưởng và giải thích một lý do vì sao ý tưởng đó quan trọng.','Curiosity, idea formation and confident sharing','I think… / My idea is… / It matters because…'),
  ('CCJ-BIG-IDEAS',2,'U02','People Who Help','Những người giúp đỡ','Describe how people use skills to help others.','Mô tả cách mọi người dùng kỹ năng để giúp người khác.','Roles, contribution and community awareness','He/She helps by… / They are good at…'),
  ('MY-COMPASS',1,'U01','My Direction','Hướng đi của tôi','Express one interest, one strength and one goal.','Diễn đạt một sở thích, một điểm mạnh và một mục tiêu.','Identity, agency and direction','I am interested in… / I am good at… / I want to…'),
  ('MY-COMPASS',2,'U02','Choices & Reasons','Lựa chọn & Lý do','Compare choices and explain a reason.','So sánh lựa chọn và giải thích một lý do.','Decision-making and reflection','I prefer… because… / Another choice is…'),
  ('EERS-ACTION-CITY',1,'U01','Hello, Action City!','Xin chào Action City!','Hear, repeat and respond to simple classroom action words.','Nghe, lặp lại và phản hồi các từ hành động đơn giản trong lớp học.','Confidence, participation and playful discovery','Listen · Move · Say · Play'),
  ('EERS-ACTION-CITY',2,'U02','Sounds Around Me','Âm thanh quanh em','Notice and repeat early English sounds through movement and pictures.','Nhận biết và lặp lại âm tiếng Anh đầu đời qua vận động và hình ảnh.','Attention and sensory learning','Sound imitation, rhythm and simple words')
) as v(book_code,unit_number,code,title_en,title_vi,objective_en,objective_vi,career_focus,mastery_focus)
join books b on b.code=v.book_code
on conflict (book_id, code) do update set
  unit_number=excluded.unit_number,
  title_en=excluded.title_en,
  title_vi=excluded.title_vi,
  objective_en=excluded.objective_en,
  objective_vi=excluded.objective_vi,
  career_compass_focus=excluded.career_compass_focus,
  mastery_english_focus=excluded.mastery_english_focus,
  sort_order=excluded.sort_order,
  status='published';

insert into activities (unit_id, code, activity_type, title_en, title_vi, instructions_en, instructions_vi, content, max_score, evidence_eligible, sort_order, status)
select bu.id, v.activity_code, v.activity_type, v.title_en, v.title_vi, v.instructions_en, v.instructions_vi, v.content::jsonb, 1, v.evidence_eligible, v.sort_order, 'published'
from (values
  ('CCJ-BIG-IDEAS','U01','A01','look_listen_say','Look · Listen · Say','Nhìn · Nghe · Nói','Tap each word to hear it, then say it aloud.','Chạm vào từng từ để nghe, sau đó nói thành tiếng.','{"items":[{"word":"idea","vi":"ý tưởng"},{"word":"skill","vi":"kỹ năng"},{"word":"help","vi":"giúp đỡ"},{"word":"future","vi":"tương lai"}],"skillTags":["english-communication","curiosity"]}',false,1),
  ('CCJ-BIG-IDEAS','U01','A02','speaking_model','Speaking model','Mẫu nói','Listen, repeat, then personalize the sentence.','Nghe, lặp lại, sau đó thay đổi câu theo ý của em.','{"model":"My idea is important because it can help people.","skillTags":["speaking","idea-sharing"]}',true,2),
  ('CCJ-BIG-IDEAS','U01','A03','self_check','Quick check','Kiểm tra nhanh','Choose the phrase that gives a reason.','Chọn cụm từ dùng để đưa ra lý do.','{"options":["because","hello","blue"],"answer":"because"}',false,3),
  ('CCJ-BIG-IDEAS','U02','A01','look_listen_say','People & skills','Con người & kỹ năng','Tap each word, listen and repeat.','Chạm vào từng từ, nghe và lặp lại.','{"items":[{"word":"teacher","vi":"giáo viên"},{"word":"doctor","vi":"bác sĩ"},{"word":"builder","vi":"thợ xây"},{"word":"helper","vi":"người giúp đỡ"}],"skillTags":["community-awareness"]}',false,1),
  ('CCJ-BIG-IDEAS','U02','A02','speaking_model','Speaking model','Mẫu nói','Listen and say who helps and how.','Nghe và nói ai giúp đỡ và giúp bằng cách nào.','{"model":"A teacher helps people by teaching.","skillTags":["speaking","community-awareness"]}',true,2),
  ('CCJ-BIG-IDEAS','U02','A03','self_check','Quick check','Kiểm tra nhanh','Choose the helping action.','Chọn hành động giúp đỡ.','{"options":["teaches","purple","yesterday"],"answer":"teaches"}',false,3),
  ('MY-COMPASS','U01','A01','look_listen_say','Direction words','Từ vựng định hướng','Tap each word to hear it, then say it aloud.','Chạm vào từng từ để nghe, sau đó nói thành tiếng.','{"items":[{"word":"interest","vi":"sở thích"},{"word":"strength","vi":"điểm mạnh"},{"word":"goal","vi":"mục tiêu"},{"word":"direction","vi":"hướng đi"}],"skillTags":["self-awareness"]}',false,1),
  ('MY-COMPASS','U01','A02','speaking_model','Speaking model','Mẫu nói','Listen, repeat, then personalize the sentence.','Nghe, lặp lại, sau đó thay đổi câu theo bản thân.','{"model":"I am interested in technology. I am good at solving problems. I want to learn more.","skillTags":["speaking","self-awareness"]}',true,2),
  ('MY-COMPASS','U01','A03','self_check','Quick check','Kiểm tra nhanh','Choose the phrase that expresses a goal.','Chọn cụm từ diễn đạt mục tiêu.','{"options":["I want to…","It is blue.","Good morning."],"answer":"I want to…"}',false,3),
  ('MY-COMPASS','U02','A01','look_listen_say','Choice words','Từ vựng lựa chọn','Tap each word to hear it, then say it aloud.','Chạm vào từng từ để nghe, sau đó nói thành tiếng.','{"items":[{"word":"choice","vi":"lựa chọn"},{"word":"reason","vi":"lý do"},{"word":"prefer","vi":"thích hơn"},{"word":"compare","vi":"so sánh"}],"skillTags":["decision-making"]}',false,1),
  ('MY-COMPASS','U02','A02','speaking_model','Speaking model','Mẫu nói','Listen and explain a preference.','Nghe và giải thích một lựa chọn.','{"model":"I prefer this choice because it matches my strengths.","skillTags":["speaking","decision-making"]}',true,2),
  ('MY-COMPASS','U02','A03','self_check','Quick check','Kiểm tra nhanh','Choose the phrase that explains a reason.','Chọn cụm từ giải thích lý do.','{"options":["because","maybe blue","hello"],"answer":"because"}',false,3),
  ('EERS-ACTION-CITY','U01','A01','look_listen_say','Action words','Từ hành động','Tap, listen, move and say.','Chạm, nghe, vận động và nói.','{"items":[{"word":"listen","vi":"nghe"},{"word":"move","vi":"di chuyển"},{"word":"say","vi":"nói"},{"word":"play","vi":"chơi"}],"skillTags":["early-english","participation"]}',false,1),
  ('EERS-ACTION-CITY','U01','A02','speaking_model','Sound & movement model','Mẫu âm thanh & vận động','Listen and copy the rhythm.','Nghe và bắt chước nhịp điệu.','{"model":"Listen, move, say, play!","skillTags":["speaking","rhythm"]}',true,2),
  ('EERS-ACTION-CITY','U01','A03','self_check','Quick check','Kiểm tra nhanh','Choose the word for using your ears.','Chọn từ chỉ hành động dùng tai.','{"options":["listen","jump","red"],"answer":"listen"}',false,3),
  ('EERS-ACTION-CITY','U02','A01','look_listen_say','Sounds around me','Âm thanh quanh em','Tap, listen and copy each sound word.','Chạm, nghe và bắt chước từng từ âm thanh.','{"items":[{"word":"beep","vi":"bíp"},{"word":"buzz","vi":"vo ve"},{"word":"tap","vi":"gõ nhẹ"},{"word":"pop","vi":"bốp"}],"skillTags":["phonological-awareness"]}',false,1),
  ('EERS-ACTION-CITY','U02','A02','speaking_model','Sound model','Mẫu âm thanh','Listen and copy the sound pattern.','Nghe và bắt chước mẫu âm thanh.','{"model":"Beep, buzz, tap, pop!","skillTags":["sound-imitation","rhythm"]}',true,2),
  ('EERS-ACTION-CITY','U02','A03','self_check','Quick check','Kiểm tra nhanh','Choose the sound word.','Chọn từ mô phỏng âm thanh.','{"options":["buzz","table","sleep"],"answer":"buzz"}',false,3)
) as v(book_code,unit_code,activity_code,activity_type,title_en,title_vi,instructions_en,instructions_vi,content,evidence_eligible,sort_order)
join books b on b.code=v.book_code
join book_units bu on bu.book_id=b.id and bu.code=v.unit_code
on conflict (unit_id, code) do update set
  activity_type=excluded.activity_type,
  title_en=excluded.title_en,
  title_vi=excluded.title_vi,
  instructions_en=excluded.instructions_en,
  instructions_vi=excluded.instructions_vi,
  content=excluded.content,
  max_score=excluded.max_score,
  evidence_eligible=excluded.evidence_eligible,
  sort_order=excluded.sort_order,
  status='published',
  updated_at=now();

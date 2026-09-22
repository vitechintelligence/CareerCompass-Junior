
(function(){
"use strict";

const root=document.getElementById("learningLibrary");
if(!root) return;

const items=[
  {
    id:"mastery-book",category:"books",audiences:["parent","partner","solo","teacher"],ages:["7-9","10-13"],
    kind:{en:"Book",vi:"Sách"},status:{en:"Complete book",vi:"Sách hoàn chỉnh"},visual:"book",cover:"--bk2",
    title:"Career Compass Junior — Mastery Beginner",
    short:{en:"A bilingual beginner program book connecting English practice, confidence and real-life learning.",vi:"Sách chương trình song ngữ dành cho người mới bắt đầu, kết nối tiếng Anh, sự tự tin và học tập thực tế."},
    objectives:{
      en:["Build beginner English confidence through structured progression.","Support Vietnamese learners with bilingual scaffolding.","Develop speaking, listening, reading and guided communication habits."],
      vi:["Xây dựng sự tự tin tiếng Anh qua lộ trình có cấu trúc.","Hỗ trợ học sinh Việt Nam bằng giàn giáo song ngữ.","Phát triển nghe, nói, đọc và thói quen giao tiếp có hướng dẫn."]
    },
    duration:{en:"96 beginner lessons",vi:"96 bài học cơ bản"},language:{en:"English + Vietnamese",vi:"Anh + Việt"},age:{en:"Ages 7–12",vi:"7–12 tuổi"},grade:{en:"Approx. Grades 1–6",vi:"Khoảng lớp 1–6"},hard:{en:"Yes* · print format",vi:"Có* · định dạng in"},
    features:{en:["Bilingual scaffolding","96-lesson pathway","Interactive companion","Audio-supported practice"],vi:["Hỗ trợ song ngữ","Lộ trình 96 bài","Bản tương tác đi kèm","Luyện tập có âm thanh"]},
    primary:{href:"/learn/CCJ-MASTERY-BEGINNER",en:"Open interactive edition",vi:"Mở bản tương tác"},secondary:{href:"/books",en:"View books",vi:"Xem bộ sách"}
  },
  {
    id:"big-ideas",category:"books",audiences:["parent","partner","teacher"],ages:["7-9","10-13"],
    kind:{en:"Book",vi:"Sách"},status:{en:"Core program title",vi:"Sách chương trình cốt lõi"},visual:"book",cover:"--bk1",
    title:"Big Ideas, Bright Futures",
    short:{en:"An English + skills adventure that develops curiosity, communication and future awareness.",vi:"Hành trình tiếng Anh + kỹ năng phát triển sự tò mò, giao tiếp và nhận thức về tương lai."},
    objectives:{en:["Use English for meaningful ideas and discussion.","Develop curiosity, creativity and future awareness.","Connect communication with life and career exploration."],vi:["Dùng tiếng Anh để trao đổi ý tưởng có ý nghĩa.","Phát triển tò mò, sáng tạo và nhận thức tương lai.","Kết nối giao tiếp với kỹ năng sống và khám phá nghề nghiệp."]},
    duration:{en:"40-page learner journey",vi:"Hành trình 40 trang"},language:{en:"English + Vietnamese support",vi:"Tiếng Anh + hỗ trợ tiếng Việt"},age:{en:"Ages 7–12",vi:"7–12 tuổi"},grade:{en:"Approx. Grades 2–6",vi:"Khoảng lớp 2–6"},hard:{en:"Yes* · print format",vi:"Có* · định dạng in"},
    features:{en:["Skills discovery","Creative prompts","Reflection","Digital companion preview"],vi:["Khám phá kỹ năng","Gợi ý sáng tạo","Phản tư","Bản xem trước số"]},
    primary:{href:"/books",en:"Explore the book",vi:"Khám phá sách"},secondary:{href:"/portal/student",en:"Preview student space",vi:"Xem cổng học viên"}
  },
  {
    id:"my-compass-book",category:"books",audiences:["parent","partner","student","teacher"],ages:["14-16","17-18"],
    kind:{en:"Teen book",vi:"Sách tuổi teen"},status:{en:"Complete book",vi:"Sách hoàn chỉnh"},visual:"book",cover:"--bk3",
    title:"MY COMPASS — English + Life Skills + Career Discovery",
    short:{en:"A teen-centered bilingual journey combining beginner English, life skills and career exploration.",vi:"Hành trình song ngữ dành cho tuổi teen, kết hợp tiếng Anh cơ bản, kỹ năng sống và khám phá nghề nghiệp."},
    objectives:{en:["Build practical English for teen communication.","Strengthen reflection, collaboration and self-direction.","Explore broad career possibilities without fixed predictions."],vi:["Xây dựng tiếng Anh thực tế cho giao tiếp tuổi teen.","Phát triển phản tư, hợp tác và tự chủ.","Khám phá nghề nghiệp rộng mở, không áp đặt dự đoán."]},
    duration:{en:"24 lessons + capstone",vi:"24 bài + dự án capstone"},language:{en:"English + Vietnamese-first support",vi:"Anh + hỗ trợ Việt trước"},age:{en:"Ages 13–18",vi:"13–18 tuổi"},grade:{en:"Approx. Grades 7–12",vi:"Khoảng lớp 7–12"},hard:{en:"Yes* · print format",vi:"Có* · định dạng in"},
    features:{en:["Teen-friendly design","Life skills","Career discovery","Complete interactive edition"],vi:["Thiết kế phù hợp tuổi teen","Kỹ năng sống","Khám phá nghề","Bản tương tác hoàn chỉnh"]},
    primary:{href:"/learn/MY-COMPASS",en:"Open interactive edition",vi:"Mở bản tương tác"},secondary:{href:"/books",en:"View book library",vi:"Xem thư viện sách"}
  },
  {
    id:"action-city",category:"books",audiences:["parent","partner","teacher"],ages:["4-6"],
    kind:{en:"Early years book",vi:"Sách mầm non"},status:{en:"Complete workbook",vi:"Workbook hoàn chỉnh"},visual:"book",cover:"--bk4",
    title:"My First Sound Adventures — Action City",
    short:{en:"A playful early-English workbook built around sound, movement, tracing and age-appropriate action.",vi:"Workbook tiếng Anh đầu đời qua âm thanh, vận động, tô chữ và hoạt động phù hợp lứa tuổi."},
    objectives:{en:["Build early phonics and sound awareness.","Encourage listening, movement and confident participation.","Support early vocabulary through visual, physical activities."],vi:["Phát triển nhận biết âm và phonics sớm.","Khuyến khích nghe, vận động và tham gia tự tin.","Phát triển từ vựng sớm qua hoạt động trực quan và vận động."]},
    duration:{en:"24-page foundation workbook",vi:"Workbook nền tảng 24 trang"},language:{en:"English + Vietnamese guidance",vi:"Anh + hướng dẫn tiếng Việt"},age:{en:"Ages 4–6",vi:"4–6 tuổi"},grade:{en:"Preschool / Kindergarten",vi:"Mầm non / Mẫu giáo"},hard:{en:"Yes* · print format",vi:"Có* · định dạng in"},
    features:{en:["Phonics","Tracing","Movement","Audio-friendly activities"],vi:["Phonics","Tô chữ","Vận động","Hoạt động hỗ trợ âm thanh"]},
    primary:{href:"/books",en:"Explore the workbook",vi:"Khám phá workbook"},secondary:{href:"/portal/student",en:"Preview learning space",vi:"Xem không gian học"}
  },
  {
    id:"mastery-interactive",category:"interactive",audiences:["parent","partner","student","teacher"],ages:["7-9","10-13"],
    kind:{en:"Interactive e-learning",vi:"E-learning tương tác"},status:{en:"Complete interactive edition",vi:"Bản tương tác hoàn chỉnh"},visual:"device",theme:"mastery",
    title:"Career Compass Junior — 96-Lesson Interactive Edition",
    short:{en:"The full beginner book transformed into a connected digital learning experience with guided practice and audio support.",vi:"Toàn bộ sách Beginner được chuyển thành trải nghiệm học số liên kết với luyện tập có hướng dẫn và hỗ trợ âm thanh."},
    objectives:{en:["Extend book learning into interactive practice.","Support independent and teacher-guided study.","Capture progress through connected learning activities."],vi:["Mở rộng nội dung sách thành luyện tập tương tác.","Hỗ trợ tự học và học có giáo viên hướng dẫn.","Ghi nhận tiến độ qua hoạt động học tập liên kết."]},
    duration:{en:"96 lessons",vi:"96 bài học"},language:{en:"English + Vietnamese",vi:"Anh + Việt"},age:{en:"Ages 7–12",vi:"7–12 tuổi"},grade:{en:"Approx. Grades 1–6",vi:"Khoảng lớp 1–6"},hard:{en:"No · digital module",vi:"Không · học phần số"},
    features:{en:["Interactive activities","Conversational audio options","Progress flow","Book-linked practice"],vi:["Hoạt động tương tác","Tùy chọn âm thanh hội thoại","Luồng tiến độ","Luyện tập gắn với sách"]},
    primary:{href:"/learn/CCJ-MASTERY-BEGINNER",en:"Launch module",vi:"Mở học phần"},secondary:{href:"/books",en:"View source book",vi:"Xem sách gốc"}
  },
  {
    id:"my-compass-interactive",category:"interactive",audiences:["parent","partner","student","teacher"],ages:["14-16","17-18"],
    kind:{en:"Interactive e-learning",vi:"E-learning tương tác"},status:{en:"Complete interactive edition",vi:"Bản tương tác hoàn chỉnh"},visual:"device",theme:"teen",
    title:"MY COMPASS — Interactive Teen Experience",
    short:{en:"A complete interactive companion for teen English, life skills, reflection and career discovery.",vi:"Bản tương tác hoàn chỉnh cho tiếng Anh tuổi teen, kỹ năng sống, phản tư và khám phá nghề nghiệp."},
    objectives:{en:["Turn reflection and career exploration into guided interactions.","Support natural English listening and speaking practice.","Help teens build evidence of learning and improvement."],vi:["Biến phản tư và khám phá nghề thành tương tác có hướng dẫn.","Hỗ trợ luyện nghe nói tiếng Anh tự nhiên.","Giúp tuổi teen tạo minh chứng học tập và tiến bộ."]},
    duration:{en:"24 lessons + capstone",vi:"24 bài + capstone"},language:{en:"English + Vietnamese support",vi:"Anh + hỗ trợ Việt"},age:{en:"Ages 13–18",vi:"13–18 tuổi"},grade:{en:"Approx. Grades 7–12",vi:"Khoảng lớp 7–12"},hard:{en:"No · digital module",vi:"Không · học phần số"},
    features:{en:["Interactive reflection","Audio practice","Career exploration","Capstone journey"],vi:["Phản tư tương tác","Luyện âm thanh","Khám phá nghề","Hành trình capstone"]},
    primary:{href:"/learn/MY-COMPASS",en:"Launch module",vi:"Mở học phần"},secondary:{href:"/books",en:"View source book",vi:"Xem sách gốc"}
  },
  {
    id:"bridge-designer",category:"interactive",audiences:["parent","partner","student","teacher"],ages:["7-9","10-13","14-16","17-18"],
    kind:{en:"STEAM simulation",vi:"Mô phỏng STEAM"},status:{en:"Live proof-of-concept",vi:"Bản thử nghiệm đang hoạt động"},visual:"bridge",
    title:"Community Bridge Designer",
    short:{en:"A reusable STEAM mission where learners design, test, observe consequences, improve and explain a bridge for their community.",vi:"Nhiệm vụ STEAM tái sử dụng: học sinh thiết kế, thử nghiệm, quan sát kết quả, cải tiến và giải thích cây cầu cho cộng đồng."},
    objectives:{en:["Combine science, technology, engineering, arts and mathematics in one mission.","Reward iteration and evidence instead of a single correct answer.","Generate skills evidence for Career Compass exploration."],vi:["Kết hợp khoa học, công nghệ, kỹ thuật, nghệ thuật và toán trong một nhiệm vụ.","Ghi nhận cải tiến và minh chứng thay vì chỉ đúng/sai.","Tạo minh chứng kỹ năng cho Career Compass."]},
    duration:{en:"Mission-based · repeatable",vi:"Theo nhiệm vụ · có thể lặp lại"},language:{en:"English-led + Vietnamese support",vi:"Tiếng Anh dẫn dắt + hỗ trợ Việt"},age:{en:"Ages 7–18 · 4 levels",vi:"7–18 tuổi · 4 cấp độ"},grade:{en:"Approx. Grades 1–12",vi:"Khoảng lớp 1–12"},hard:{en:"No · interactive simulation",vi:"Không · mô phỏng tương tác"},
    features:{en:["Visual bridge builder","Multiple valid solutions","Attempt → observe → improve","Skills evidence"],vi:["Thiết kế cầu trực quan","Nhiều lời giải hợp lệ","Thử → quan sát → cải tiến","Minh chứng kỹ năng"]},
    primary:{href:"/steam-lab/community-bridge?age=10-13",en:"Try the mission",vi:"Thử nhiệm vụ"},secondary:{href:"/steam-lab",en:"Explore STEAM Lab",vi:"Khám phá STEAM Lab"}
  },
  {
    id:"community-challenges",category:"interactive",audiences:["partner","student","teacher","solo"],ages:["7-9","10-13","14-16","17-18"],
    kind:{en:"Collaborative gamification",vi:"Gamification hợp tác"},status:{en:"Partner-controlled",vi:"Do đối tác kiểm soát"},visual:"community",
    title:"Quarterly Build Community & Challenges",
    short:{en:"A moderated developer-style community for individual builds, squads, large-group labs, advisor feedback and quarterly showcases.",vi:"Cộng đồng kiểu developer có kiểm duyệt cho dự án cá nhân, nhóm nhỏ, lab nhóm lớn, phản hồi cố vấn và showcase theo quý."},
    objectives:{en:["Build healthy competitiveness, resilience and confidence.","Let schools control rules, moderation, advisors and publication.","Make improvement and collaboration visible alongside results."],vi:["Phát triển cạnh tranh lành mạnh, bền bỉ và tự tin.","Cho trường kiểm soát luật, kiểm duyệt, cố vấn và công bố.","Làm rõ sự tiến bộ và hợp tác bên cạnh kết quả."]},
    duration:{en:"Quarterly · 12-week rhythm",vi:"Theo quý · nhịp 12 tuần"},language:{en:"English + Vietnamese",vi:"Anh + Việt"},age:{en:"Ages 7–18 · school enabled",vi:"7–18 tuổi · trường phê duyệt"},grade:{en:"Approx. Grades 1–12",vi:"Khoảng lớp 1–12"},hard:{en:"No · platform experience",vi:"Không · trải nghiệm nền tảng"},
    features:{en:["Individual / squad / large-group modes","Advisor feedback","Showcases","Kudos + recognition"],vi:["Cá nhân / nhóm nhỏ / nhóm lớn","Phản hồi cố vấn","Showcase","Kudos + ghi nhận"]},
    primary:{href:"/workspace/student/community",en:"Open learner community",vi:"Mở cộng đồng học viên"},secondary:{href:"/workspace/partner/community",en:"Partner controls",vi:"Điều khiển đối tác"}
  },
  {
    id:"steam-lab",category:"courses",audiences:["parent","partner","student","teacher","solo"],ages:["7-9","10-13","14-16","17-18"],
    kind:{en:"Future Skills",vi:"Kỹ năng tương lai"},status:{en:"Experiential learning",vi:"Học trải nghiệm"},visual:"bridge",
    title:"STEAM Lab — Creative Systems",
    short:{en:"Problem-based missions where science, technology, engineering, arts and mathematics work together rather than as isolated subjects.",vi:"Nhiệm vụ giải quyết vấn đề nơi khoa học, công nghệ, kỹ thuật, nghệ thuật và toán học phối hợp thay vì tách rời."},
    objectives:{en:["Discover → imagine → design → build → test → improve.","Use arts as real product, visual, UX, storytelling and human-centered design.","Connect practiced skills with broad career exploration."],vi:["Khám phá → tưởng tượng → thiết kế → xây → thử → cải tiến.","Dùng nghệ thuật như thiết kế sản phẩm, hình ảnh, UX, kể chuyện và lấy con người làm trung tâm.","Kết nối kỹ năng đã luyện với khám phá nghề nghiệp rộng mở."]},
    duration:{en:"12-session pathway framework",vi:"Khung lộ trình 12 buổi"},language:{en:"English-led + Vietnamese support",vi:"Tiếng Anh dẫn dắt + hỗ trợ Việt"},age:{en:"Ages 7–18 · 4 levels",vi:"7–18 tuổi · 4 cấp độ"},grade:{en:"Approx. Grades 1–12",vi:"Khoảng lớp 1–12"},hard:{en:"No · experiential course",vi:"Không · khóa trải nghiệm"},
    features:{en:["STEAM studios","Age-level missions","Iteration evidence","Career connections"],vi:["Các studio STEAM","Nhiệm vụ theo lứa tuổi","Minh chứng cải tiến","Kết nối nghề nghiệp"]},
    primary:{href:"/steam-lab",en:"Enter STEAM Lab",vi:"Vào STEAM Lab"},secondary:{href:"/steam-lab/community-bridge?age=10-13",en:"Preview a mission",vi:"Xem thử nhiệm vụ"}
  },
  {
    id:"ai-foundations",category:"courses",audiences:["parent","partner","student","teacher","solo"],ages:["7-9","10-13","14-16","17-18"],
    kind:{en:"AI course pathway",vi:"Lộ trình AI"},status:{en:"Curriculum built",vi:"Đã xây chương trình"},visual:"ai",
    title:"AI Foundations",
    short:{en:"Age-progressive AI literacy covering patterns, data, models, responsible use and human judgment.",vi:"Năng lực AI theo độ tuổi: mẫu, dữ liệu, mô hình, sử dụng có trách nhiệm và phán đoán của con người."},
    objectives:{en:["Understand what AI can and cannot do.","Practice data, pattern and evaluation thinking.","Develop safe and responsible AI habits."],vi:["Hiểu AI làm được và không làm được gì.","Luyện tư duy dữ liệu, mẫu và đánh giá.","Phát triển thói quen AI an toàn và có trách nhiệm."]},
    duration:{en:"12 sessions per age pathway",vi:"12 buổi cho mỗi cấp độ tuổi"},language:{en:"English-led + Vietnamese support",vi:"Tiếng Anh dẫn dắt + hỗ trợ Việt"},age:{en:"Ages 7–18 · 4 levels",vi:"7–18 tuổi · 4 cấp độ"},grade:{en:"Approx. Grades 1–12",vi:"Khoảng lớp 1–12"},hard:{en:"No · digital/course pathway",vi:"Không · lộ trình số"},
    features:{en:["AI literacy","Responsible AI","Data + patterns","Age-progressive language"],vi:["Hiểu biết AI","AI có trách nhiệm","Dữ liệu + mẫu","Ngôn ngữ theo độ tuổi"]},
    primary:{href:"/programs/future-skills",en:"View AI pathway",vi:"Xem lộ trình AI"},secondary:{href:"/portal/partner",en:"Partner access",vi:"Quyền đối tác"}
  },
  {
    id:"ai-level-2",category:"courses",audiences:["parent","partner","student","teacher","solo"],ages:["14-16","17-18"],
    kind:{en:"Advanced AI",vi:"AI nâng cao"},status:{en:"Curriculum built",vi:"Đã xây chương trình"},visual:"ai",
    title:"AI Level 2 — Creators & Systems",
    short:{en:"Advanced AI learning focused on systems, evaluation, prompting, retrieval, agents, safeguards and observable failure cases.",vi:"AI nâng cao tập trung vào hệ thống, đánh giá, prompting, retrieval, agents, bảo vệ và các trường hợp lỗi có thể quan sát."},
    objectives:{en:["Move from AI use to AI system thinking.","Evaluate quality, uncertainty and failure cases.","Design safer human-in-the-loop workflows."],vi:["Chuyển từ sử dụng AI sang tư duy hệ thống AI.","Đánh giá chất lượng, độ bất định và trường hợp lỗi.","Thiết kế quy trình có con người kiểm soát an toàn hơn."]},
    duration:{en:"12 sessions per age pathway",vi:"12 buổi cho mỗi cấp độ tuổi"},language:{en:"English-led + Vietnamese support",vi:"Tiếng Anh dẫn dắt + hỗ trợ Việt"},age:{en:"Ages 14–18",vi:"14–18 tuổi"},grade:{en:"Approx. Grades 7–12",vi:"Khoảng lớp 7–12"},hard:{en:"No · digital/course pathway",vi:"Không · lộ trình số"},
    features:{en:["AI systems","Evaluation","Prompt + retrieval concepts","Safety + human oversight"],vi:["Hệ thống AI","Đánh giá","Khái niệm prompt + retrieval","An toàn + con người giám sát"]},
    primary:{href:"/programs/future-skills",en:"View advanced AI",vi:"Xem AI nâng cao"},secondary:{href:"/portal/partner",en:"Partner access",vi:"Quyền đối tác"}
  },
  {
    id:"robotics",category:"courses",audiences:["parent","partner","student","teacher","solo"],ages:["7-9","10-13","14-16","17-18"],
    kind:{en:"Robotics pathway",vi:"Lộ trình Robotics"},status:{en:"4-level curriculum built",vi:"Đã xây 4 cấp độ"},visual:"robot",
    title:"Robotics & Intelligent Machines",
    short:{en:"A four-level robotics pathway progressing from sequencing and sensors to control systems, autonomy and industry-style robotics.",vi:"Lộ trình robotics 4 cấp độ từ trình tự và cảm biến đến điều khiển, tự chủ và robotics theo phong cách ngành nghề."},
    objectives:{en:["Develop sequencing, logical reasoning and debugging.","Progress into sensors, feedback control and autonomy.","Connect robotics builds with communication, safety and systems thinking."],vi:["Phát triển trình tự, logic và debugging.","Tiến tới cảm biến, điều khiển phản hồi và tự chủ.","Kết nối dự án robotics với giao tiếp, an toàn và tư duy hệ thống."]},
    duration:{en:"12 sessions per age pathway",vi:"12 buổi cho mỗi cấp độ tuổi"},language:{en:"English-led + Vietnamese support",vi:"Tiếng Anh dẫn dắt + hỗ trợ Việt"},age:{en:"Ages 7–18 · 4 levels",vi:"7–18 tuổi · 4 cấp độ"},grade:{en:"Approx. Grades 1–12",vi:"Khoảng lớp 1–12"},hard:{en:"No · course pathway",vi:"Không · lộ trình khóa học"},
    features:{en:["Sequencing + sensors","Loops + conditions","Control systems","Autonomy + capstones"],vi:["Trình tự + cảm biến","Vòng lặp + điều kiện","Hệ điều khiển","Tự chủ + capstone"]},
    primary:{href:"/programs/future-skills",en:"Explore Robotics",vi:"Khám phá Robotics"},secondary:{href:"/steam-lab",en:"See experiential missions",vi:"Xem nhiệm vụ trải nghiệm"}
  },
  {
    id:"teacher-upskill",category:"courses",audiences:["teacher","partner","solo"],ages:["adult"],
    kind:{en:"Teacher development",vi:"Phát triển giáo viên"},status:{en:"10 bilingual modules",vi:"10 học phần song ngữ"},visual:"dashboard",
    title:"Teacher Upskill Academy",
    short:{en:"Built-in professional learning modules helping teachers deliver stronger project, assessment, technology and future-skills experiences.",vi:"Các học phần phát triển chuyên môn giúp giáo viên triển khai dự án, đánh giá, công nghệ và kỹ năng tương lai hiệu quả hơn."},
    objectives:{en:["Support confident digital and future-skills delivery.","Develop practical classroom and assessment workflows.","Give teachers visible professional-learning progress."],vi:["Hỗ trợ dạy học số và kỹ năng tương lai tự tin hơn.","Phát triển quy trình lớp học và đánh giá thực tế.","Hiển thị tiến độ phát triển chuyên môn giáo viên."]},
    duration:{en:"10 bilingual professional modules",vi:"10 học phần chuyên môn song ngữ"},language:{en:"English + Vietnamese",vi:"Anh + Việt"},age:{en:"Adult educators",vi:"Giáo viên người lớn"},grade:{en:"Teacher / instructor development",vi:"Phát triển giáo viên / giảng viên"},hard:{en:"No · digital professional learning",vi:"Không · đào tạo chuyên môn số"},
    features:{en:["Professional learning","Progress tracking","Classroom practice","Partner-ready delivery"],vi:["Phát triển chuyên môn","Theo dõi tiến độ","Thực hành lớp học","Phù hợp đối tác"]},
    primary:{href:"/workspace/teacher/upskill",en:"Open teacher modules",vi:"Mở học phần giáo viên"},secondary:{href:"/portal/teacher",en:"Preview teacher space",vi:"Xem cổng giáo viên"}
  },
  {
    id:"student-space",category:"spaces",audiences:["parent","student","partner"],ages:["4-6","7-9","10-13","14-16","17-18"],
    kind:{en:"Learning space",vi:"Không gian học"},status:{en:"Connected portal",vi:"Cổng học liên kết"},visual:"dashboard",
    title:"Student Learning Space",
    short:{en:"One connected place for books, interactive lessons, STEAM missions, assessments, progress, community and career exploration.",vi:"Một nơi liên kết sách, bài học tương tác, nhiệm vụ STEAM, đánh giá, tiến độ, cộng đồng và khám phá nghề."},
    objectives:{en:["Reduce fragmentation between content and progress.","Give learners clear next steps and accessible resources.","Connect learning evidence across the platform."],vi:["Giảm phân mảnh giữa nội dung và tiến độ.","Cho học sinh bước tiếp theo rõ ràng và tài nguyên dễ truy cập.","Kết nối minh chứng học tập trên nền tảng."]},
    duration:{en:"Ongoing access",vi:"Truy cập liên tục"},language:{en:"English + Vietnamese",vi:"Anh + Việt"},age:{en:"Ages 4–18 by assigned content",vi:"4–18 tuổi theo nội dung được giao"},grade:{en:"Preschool–Grade 12",vi:"Mầm non–Lớp 12"},hard:{en:"No · portal",vi:"Không · cổng số"},
    features:{en:["Books","Interactive learning","STEAM","Progress + community"],vi:["Sách","Học tương tác","STEAM","Tiến độ + cộng đồng"]},
    primary:{href:"/portal/student",en:"Preview student space",vi:"Xem cổng học viên"},secondary:{href:"/auth/sign-in?callbackURL=%2Fworkspace%2Fstudent",en:"Student sign in",vi:"Đăng nhập học viên"}
  },
  {
    id:"teacher-space",category:"spaces",audiences:["teacher","partner","solo"],ages:["adult"],
    kind:{en:"Educator workspace",vi:"Không gian giáo viên"},status:{en:"Role-protected",vi:"Bảo vệ theo vai trò"},visual:"dashboard",
    title:"Teacher Workspace",
    short:{en:"Class management, assignments, assessments, My Classroom, professional learning and delegated community controls in one workspace.",vi:"Quản lý lớp, bài tập, đánh giá, My Classroom, phát triển chuyên môn và quyền cộng đồng được phân cấp trong một nơi."},
    objectives:{en:["Give teachers practical class-control tools.","Connect assessment, attendance and learning evidence.","Support school-delegated community and advisor workflows."],vi:["Cho giáo viên công cụ quản lý lớp thực tế.","Kết nối đánh giá, điểm danh và minh chứng học tập.","Hỗ trợ cộng đồng và cố vấn theo phân quyền của trường."]},
    duration:{en:"Ongoing educator access",vi:"Truy cập giáo viên liên tục"},language:{en:"English + Vietnamese-ready",vi:"Sẵn sàng Anh + Việt"},age:{en:"Adult educators",vi:"Giáo viên người lớn"},grade:{en:"Teacher / instructor use",vi:"Dùng cho giáo viên / giảng viên"},hard:{en:"No · workspace",vi:"Không · workspace"},
    features:{en:["My Classroom","Assessments","Teacher upskill","Community controls"],vi:["My Classroom","Đánh giá","Upskill giáo viên","Điều khiển cộng đồng"]},
    primary:{href:"/portal/teacher",en:"Preview teacher space",vi:"Xem cổng giáo viên"},secondary:{href:"/auth/sign-in?callbackURL=%2Fworkspace%2Fteacher",en:"Teacher sign in",vi:"Đăng nhập giáo viên"}
  },
  {
    id:"partner-space",category:"spaces",audiences:["partner","solo","teacher"],ages:["adult"],
    kind:{en:"Institution workspace",vi:"Không gian cơ sở"},status:{en:"Partner-controlled",vi:"Đối tác kiểm soát"},visual:"dashboard",
    title:"Partner Workspace",
    short:{en:"A control plane for schools, centers and solo instructors to manage access, programs, integrations, community and data/AI choices.",vi:"Không gian điều khiển cho trường, trung tâm và giảng viên độc lập quản lý quyền, chương trình, tích hợp, cộng đồng và lựa chọn dữ liệu/AI."},
    objectives:{en:["Manage teacher and learner access responsibly.","Control community rules, data modes and optional AI.","Bundle eligible learning content into partner delivery."],vi:["Quản lý quyền giáo viên và học sinh có trách nhiệm.","Kiểm soát quy tắc cộng đồng, chế độ dữ liệu và AI tùy chọn.","Gói nội dung học đủ điều kiện trong Partner Access."]},
    duration:{en:"Ongoing partner access",vi:"Truy cập đối tác liên tục"},language:{en:"English + Vietnamese-ready",vi:"Sẵn sàng Anh + Việt"},age:{en:"Adults / institutions",vi:"Người lớn / cơ sở"},grade:{en:"School / center / solo instructor",vi:"Trường / trung tâm / giảng viên độc lập"},hard:{en:"No · workspace",vi:"Không · workspace"},
    features:{en:["Institution controls","Community governance","Data + AI choices","Integrations"],vi:["Điều khiển cơ sở","Quản trị cộng đồng","Lựa chọn dữ liệu + AI","Tích hợp"]},
    primary:{href:"/portal/partner",en:"Preview Partner Access",vi:"Xem Partner Access"},secondary:{href:"/workspace/partner",en:"Open partner workspace",vi:"Mở workspace đối tác"}
  }
];

let currentFilter="all";
let visibleItems=[...items];
let activeId=items[0].id;
let featureDialog=null;

const track=root.querySelector("#llTrack");
const detail=root.querySelector("#llDetail");
const smartResult=root.querySelector("#llSmartResult");
const audienceSelect=root.querySelector("#llAudience");
const ageSelect=root.querySelector("#llAge");
const filterButtons=Array.from(root.querySelectorAll(".ll-filter"));
const prev=root.querySelector("#llPrev");
const next=root.querySelector("#llNext");

function lang(){return document.documentElement.lang==="en"?"en":"vi"}
function t(obj){return obj?.[lang()] ?? obj?.en ?? ""}
function byId(id){return items.find(item=>item.id===id)}
function categoryLabel(cat){
  const map={
    all:{en:"All",vi:"Tất cả"},books:{en:"Books",vi:"Sách"},interactive:{en:"Interactive",vi:"Tương tác"},
    courses:{en:"Courses & Future Skills",vi:"Khóa học & Kỹ năng tương lai"},spaces:{en:"Learning Spaces",vi:"Không gian học"}
  };
  return t(map[cat]);
}
function routeLink(link){
  if(!link) return "";
  return '<a class="primary" target="_top" href="'+link.href+'">'+(lang()==="en"?link.en:link.vi)+' →</a>';
}
function secondaryLink(link){
  if(!link) return "";
  return '<a class="secondary" target="_top" href="'+link.href+'">'+(lang()==="en"?link.en:link.vi)+'</a>';
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}

function moduleIcon(item){
  if(item.id.includes("ai")) return "AI";
  if(item.id.includes("robot")) return "BOT";
  if(item.id.includes("bridge") || item.id.includes("steam")) return "STEAM";
  if(item.id.includes("community")) return "TEAM";
  if(item.id.includes("teacher")) return "EDU";
  if(item.id.includes("compass")) return "COMPASS";
  return "LEARN";
}

function moduleVisual(item){
  const chips=(lang()==="en"?item.features.en:item.features.vi).slice(0,3).map(x=>'<span>'+escapeHtml(x)+'</span>').join("");
  return '<div class="ll-visual ll-module-visual ll-module-'+escapeHtml(item.visual||"course")+'">'+
    '<div class="ll-module-glow"></div>'+
    '<div class="ll-module-top"><span>'+escapeHtml(t(item.kind))+'</span><i>'+escapeHtml(t(item.status))+'</i></div>'+
    '<div class="ll-module-center"><div class="ll-module-icon">'+moduleIcon(item)+'</div><div><small>'+(lang()==="en"?"INTERACTIVE MODULE":"HỌC PHẦN TƯƠNG TÁC")+'</small><strong>'+escapeHtml(item.title)+'</strong></div></div>'+
    '<div class="ll-module-chips">'+chips+'</div>'+
    '<div class="ll-module-footer"><b>'+escapeHtml(t(item.age))+'</b><span>'+escapeHtml(t(item.duration))+'</span></div>'+
  '</div>';
}

function visual(item){
  if(item.category==="interactive" || item.category==="courses") return moduleVisual(item);
  if(item.visual==="book"){
    return '<div class="ll-visual ll-book-visual"><div class="ll-book-cover" style="background-image:var('+item.cover+')"></div><div class="ll-book-sheet"><i></i><i></i><i></i><i></i><i></i></div></div>';
  }
  if(item.visual==="device"){
    return '<div class="ll-visual"><div class="ll-device"><div class="ll-device-bar"><i></i><i></i><i></i></div><div class="ll-device-content"><div class="ll-device-hero"><b>'+(item.theme==="teen"?"MY COMPASS":"Interactive lesson")+'</b></div><div class="ll-device-row"><div class="ll-device-tile"><strong>'+(lang()==="en"?"Speak & listen":"Nghe & nói")+'</strong></div><div class="ll-device-tile"><strong>'+(lang()==="en"?"Try & reflect":"Thử & phản tư")+'</strong></div></div><div class="ll-audio-bar"><span class="ll-play">▶</span><span class="ll-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div></div></div></div>';
  }
  if(item.visual==="bridge"){
    return '<div class="ll-visual ll-bridge-scene"><div class="ll-bridge-deck"><i></i><i></i><i></i></div><div class="ll-sim-panel"><b>'+(lang()==="en"?"LIVE TEST":"THỬ NGHIỆM")+'</b><div class="ll-sim-meter"><i></i></div><div class="ll-sim-meter"><i></i></div></div></div>';
  }
  if(item.visual==="robot"){
    return '<div class="ll-visual ll-robot-scene"><span class="ll-target">★</span><div class="ll-robot"></div><div class="ll-blocks"><span>MOVE 2</span><span>IF SENSOR</span><span>REPEAT</span></div></div>';
  }
  if(item.visual==="ai"){
    return '<div class="ll-visual ll-ai-scene"><div class="ll-ai-lines"></div><div class="ll-ai-node a">DATA</div><div class="ll-ai-node b">EVAL</div><div class="ll-ai-node c">HUMAN</div><div class="ll-ai-node d">SAFE</div><div class="ll-ai-node main">AI<br>SYSTEM</div></div>';
  }
  if(item.visual==="community"){
    return '<div class="ll-visual ll-community-scene"><div class="ll-community-top"><b>'+(lang()==="en"?"QUARTERLY BUILD":"THỬ THÁCH QUÝ")+'</b><span>Build → Review → Improve → Showcase</span></div><div class="ll-community-grid"><div class="ll-community-project"><strong>'+(lang()==="en"?"PROJECT TEAMS":"ĐỘI DỰ ÁN")+'</strong><div class="ll-mini-team">Bridge Squad · v2</div><div class="ll-mini-team">Robot Crew · feedback</div><div class="ll-mini-team">Future Farm · showcase</div></div><div class="ll-community-board"><strong>'+(lang()==="en"?"RECOGNITION":"GHI NHẬN")+'</strong><div class="ll-mini-team">🔁 Resilience</div><div class="ll-mini-team">💡 Creative</div></div></div></div>';
  }
  return '<div class="ll-visual ll-dashboard-scene"><div class="ll-dash-top"></div><div class="ll-dash-grid"><div class="ll-dash-side"></div><div class="ll-dash-main"><div class="ll-dash-banner"></div><div class="ll-dash-cards"><i></i><i></i><i></i><i></i></div></div></div></div>';
}

function card(item){
  const statusClass=/complete|live|built|connected|partner/i.test(item.status.en)?"live":"";
  return '<article class="ll-card '+(item.id===activeId?"active":"")+'" tabindex="0" role="button" aria-label="'+escapeHtml(item.title)+'" data-id="'+item.id+'">'+
    '<div class="ll-card-top"><span class="ll-kind">'+escapeHtml(t(item.kind))+'</span><span class="ll-status '+statusClass+'">'+escapeHtml(t(item.status))+'</span></div>'+
    visual(item)+
    '<h3>'+escapeHtml(item.title)+'</h3>'+
    '<p>'+escapeHtml(t(item.short))+'</p>'+
    '<div class="ll-card-meta"><span>'+escapeHtml(t(item.age))+'</span><span>'+escapeHtml(t(item.language))+'</span></div>'+
    '<div class="ll-open-hint">'+(lang()==="en"?"Click for wide preview":"Chạm để xem rộng")+' ↗</div>'+
  '</article>';
}

function renderTrack(){
  track.innerHTML=visibleItems.length?visibleItems.map(card).join(""):'<div class="ll-empty">'+(lang()==="en"?"No items match this view yet.":"Chưa có nội dung phù hợp với bộ lọc này.")+'</div>';
  track.querySelectorAll(".ll-card").forEach(el=>{
    const activate=()=>{
      const item=byId(el.dataset.id);
      select(el.dataset.id,false);
      openFeature(item);
    };
    el.addEventListener("click",activate);
    el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate()}});
  });
}

function renderDetail(item){
  if(!item) return;
  detail.classList.add("swap");
  window.setTimeout(()=>{
    const objectives=(lang()==="en"?item.objectives.en:item.objectives.vi).map(x=>'<li>'+escapeHtml(x)+'</li>').join("");
    const features=(lang()==="en"?item.features.en:item.features.vi).map(x=>'<span>'+escapeHtml(x)+'</span>').join("");
    detail.innerHTML=
      '<div class="ll-detail-copy">'+
        '<div class="ll-detail-badges"><span>'+escapeHtml(t(item.kind))+'</span><span>'+escapeHtml(t(item.status))+'</span><span>'+escapeHtml(categoryLabel(item.category))+'</span></div>'+
        '<h3>'+escapeHtml(item.title)+'</h3>'+
        '<p>'+escapeHtml(t(item.short))+'</p>'+
        '<ul class="ll-detail-objectives">'+objectives+'</ul>'+
        '<div class="ll-detail-actions">'+routeLink(item.primary)+secondaryLink(item.secondary)+'</div>'+
      '</div>'+
      '<div>'+
        '<div class="ll-detail-meta">'+
          meta(lang()==="en"?"Duration / learning":"Thời lượng / học tập",t(item.duration))+
          meta(lang()==="en"?"Language":"Ngôn ngữ",t(item.language))+
          meta(lang()==="en"?"Age range":"Độ tuổi",t(item.age))+
          meta(lang()==="en"?"Recommended use":"Khuyến nghị sử dụng",t(item.grade))+
          meta(lang()==="en"?"Hard copy":"Bản in",t(item.hard))+
          meta(lang()==="en"?"Availability":"Trạng thái",t(item.status))+
        '</div>'+
        '<div class="ll-feature-title">'+(lang()==="en"?"Included features":"Tính năng bao gồm")+'</div>'+
        '<div class="ll-features">'+features+'</div>'+
      '</div>';
    detail.classList.remove("swap");
  },110);
}

function ensureFeatureDialog(){
  if(featureDialog) return featureDialog;
  featureDialog=document.createElement("dialog");
  featureDialog.className="ll-feature-dialog";
  featureDialog.setAttribute("aria-label",lang()==="en"?"Learning experience preview":"Xem trước trải nghiệm học tập");
  featureDialog.innerHTML='<div class="ll-feature-dialog-shell"><button class="ll-feature-close" type="button" aria-label="Close">×</button><div class="ll-feature-dialog-body"></div></div>';
  document.body.appendChild(featureDialog);
  featureDialog.querySelector(".ll-feature-close").addEventListener("click",()=>featureDialog.close());
  featureDialog.addEventListener("click",e=>{if(e.target===featureDialog) featureDialog.close()});
  return featureDialog;
}

function featureDialogHtml(item){
  const objectives=(lang()==="en"?item.objectives.en:item.objectives.vi).map(x=>'<li>'+escapeHtml(x)+'</li>').join("");
  const features=(lang()==="en"?item.features.en:item.features.vi).map(x=>'<span>'+escapeHtml(x)+'</span>').join("");
  return '<div class="ll-feature-dialog-visual">'+visual(item)+'</div>'+
    '<div class="ll-feature-dialog-copy">'+
      '<div class="ll-detail-badges"><span>'+escapeHtml(t(item.kind))+'</span><span>'+escapeHtml(t(item.status))+'</span><span>'+escapeHtml(categoryLabel(item.category))+'</span></div>'+
      '<h3>'+escapeHtml(item.title)+'</h3>'+
      '<p>'+escapeHtml(t(item.short))+'</p>'+
      '<ul class="ll-detail-objectives">'+objectives+'</ul>'+
      '<div class="ll-feature-title">'+(lang()==="en"?"Included":"Bao gồm")+'</div>'+
      '<div class="ll-features">'+features+'</div>'+
      '<div class="ll-feature-dialog-meta">'+
        meta(lang()==="en"?"Duration":"Thời lượng",t(item.duration))+
        meta(lang()==="en"?"Age / grade":"Độ tuổi / lớp",t(item.age)+" · "+t(item.grade))+
      '</div>'+
      '<div class="ll-detail-actions">'+routeLink(item.primary)+secondaryLink(item.secondary)+'</div>'+
    '</div>';
}

function openFeature(item){
  if(!item) return;
  const dialog=ensureFeatureDialog();
  dialog.querySelector(".ll-feature-dialog-body").innerHTML=featureDialogHtml(item);
  if(!dialog.open) dialog.showModal();
}

function meta(label,value){return '<div class="ll-meta-box"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(value)+'</strong></div>'}

function select(id,scroll){
  const item=byId(id);
  if(!item) return;
  activeId=id;
  root.querySelectorAll(".ll-card").forEach(el=>el.classList.toggle("active",el.dataset.id===id));
  renderDetail(item);
  if(scroll){
    const active=root.querySelector('.ll-card[data-id="'+CSS.escape(id)+'"]');
    if(active){
      const left=active.offsetLeft-(track.clientWidth-active.clientWidth)/2;
      track.scrollTo({left:Math.max(0,left),behavior:"smooth"});
    }
  }
}

function filter(category){
  currentFilter=category;
  visibleItems=category==="all"?[...items]:items.filter(item=>item.category===category);
  if(!visibleItems.some(item=>item.id===activeId)) activeId=visibleItems[0]?.id||items[0].id;
  filterButtons.forEach(btn=>btn.classList.toggle("active",btn.dataset.filter===category));
  renderTrack();
  renderDetail(byId(activeId));
  window.setTimeout(()=>select(activeId,true),20);
}

function step(direction){
  if(!visibleItems.length) return;
  let index=visibleItems.findIndex(item=>item.id===activeId);
  if(index<0) index=0;
  index=(index+direction+visibleItems.length)%visibleItems.length;
  select(visibleItems[index].id,true);
}

function recommendation(){
  const audience=audienceSelect.value;
  const age=ageSelect.value;
  let pool=items.filter(item=>item.audiences.includes(audience));
  if(age!=="any") pool=pool.filter(item=>item.ages.includes(age)||item.ages.includes("adult")&&age==="adult");
  let pick=null;
  if(audience==="partner") pick=pool.find(x=>x.id==="partner-space")||pool.find(x=>x.id==="community-challenges");
  else if(audience==="teacher"||audience==="solo") pick=pool.find(x=>x.id==="teacher-upskill")||pool.find(x=>x.id==="teacher-space");
  else if(age==="4-6") pick=pool.find(x=>x.id==="action-city");
  else if(age==="7-9"||age==="10-13") pick=pool.find(x=>x.id==="mastery-interactive")||pool.find(x=>x.id==="bridge-designer");
  else if(age==="14-16"||age==="17-18") pick=pool.find(x=>x.id==="my-compass-interactive")||pool.find(x=>x.id==="robotics");
  pick=pick||pool[0]||items[0];

  filter("all");
  activeId=pick.id;
  renderTrack();
  select(pick.id,true);
  smartResult.innerHTML=(lang()==="en"?
    '<strong>Suggested starting point:</strong> ':'<strong>Gợi ý bắt đầu:</strong> ')+
    escapeHtml(pick.title)+' · '+escapeHtml(t(pick.short));
}

function refreshLanguage(){
  renderTrack();
  renderDetail(byId(activeId));
  const current=byId(activeId);
  if(featureDialog?.open && current){
    featureDialog.querySelector(".ll-feature-dialog-body").innerHTML=featureDialogHtml(current);
  }
  if(current && smartResult.dataset.used==="1"){
    smartResult.innerHTML=(lang()==="en"?'<strong>Current selection:</strong> ':'<strong>Lựa chọn hiện tại:</strong> ')+escapeHtml(current.title)+' · '+escapeHtml(t(current.short));
  }
}

function restartAuto(){
  // Intentionally disabled. The learning library is user-controlled so it never
  // pulls the visitor back toward the carousel while they read lower sections.
}

filterButtons.forEach(btn=>btn.addEventListener("click",()=>filter(btn.dataset.filter||"all")));
prev?.addEventListener("click",()=>step(-1));
next?.addEventListener("click",()=>step(1));
root.querySelector("#llRecommend")?.addEventListener("click",()=>{smartResult.dataset.used="1";recommendation()});

const languageObserver=new MutationObserver(mutations=>{
  if(mutations.some(m=>m.attributeName==="lang")) refreshLanguage();
});
languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});

renderTrack();
renderDetail(byId(activeId));
})();

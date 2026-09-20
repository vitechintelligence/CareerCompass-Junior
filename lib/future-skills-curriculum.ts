export type FutureSkillsTrack = "stem" | "steam" | "ai-foundation" | "ai-level-2" | "robotics";
export type FutureSkillsAgeBand = "7-9" | "10-12" | "13-15" | "16-18";

export type FutureSkillsUnit = {
  code: string;
  titleEn: string;
  titleVi: string;
  objectiveEn: string;
  objectiveVi: string;
  buildEn: string;
  buildVi: string;
  englishFocus: string[];
};

export type FutureSkillsPathway = {
  track: FutureSkillsTrack;
  trackTitleEn: string;
  trackTitleVi: string;
  ageBand: FutureSkillsAgeBand;
  stageEn: string;
  stageVi: string;
  pedagogyEn: string;
  pedagogyVi: string;
  sessions: number;
  units: FutureSkillsUnit[];
};

export const FUTURE_SKILLS_TRACKS = [
  {
    key: "stem" as const,
    titleEn: "STEM Discovery & Engineering",
    titleVi: "Khám phá STEM & Kỹ thuật",
    summaryEn: "Science, technology, engineering and mathematics taught through investigation, design, measurement and evidence.",
    summaryVi: "Khoa học, công nghệ, kỹ thuật và toán học được học qua khám phá, thiết kế, đo lường và minh chứng.",
  },
  {
    key: "steam" as const,
    titleEn: "STEAM Creative Systems",
    titleVi: "Hệ thống sáng tạo STEAM",
    summaryEn: "STEM thinking combined with art, design, communication and human-centered problem solving.",
    summaryVi: "Tư duy STEM kết hợp nghệ thuật, thiết kế, giao tiếp và giải quyết vấn đề lấy con người làm trung tâm.",
  },
  {
    key: "ai-foundation" as const,
    titleEn: "AI Foundations",
    titleVi: "Nền tảng Trí tuệ nhân tạo",
    summaryEn: "Age-appropriate AI literacy: data, patterns, models, limitations, fairness, privacy and safe use.",
    summaryVi: "Hiểu biết AI phù hợp lứa tuổi: dữ liệu, mẫu, mô hình, giới hạn, công bằng, riêng tư và sử dụng an toàn.",
  },
  {
    key: "ai-level-2" as const,
    titleEn: "AI Level 2 — Creators & Systems",
    titleVi: "AI Cấp độ 2 — Sáng tạo & Hệ thống",
    summaryEn: "Move from AI literacy to building, evaluating and governing simple AI-enabled systems.",
    summaryVi: "Chuyển từ hiểu AI sang xây dựng, đánh giá và quản trị các hệ thống có hỗ trợ AI.",
  },
  {
    key: "robotics" as const,
    titleEn: "Robotics & Intelligent Machines",
    titleVi: "Robot & Máy móc thông minh",
    summaryEn: "Progress from sequence and sensors to control, autonomy, robotics systems and industry challenges.",
    summaryVi: "Tiến từ chuỗi lệnh và cảm biến đến điều khiển, tự động hóa, hệ thống robot và bài toán công nghiệp.",
  },
] as const;

const AGE_PEDAGOGY: Record<FutureSkillsAgeBand, { stageEn: string; stageVi: string; pedagogyEn: string; pedagogyVi: string }> = {
  "7-9": {
    stageEn: "Explore → Make → Explain",
    stageVi: "Khám phá → Làm → Giải thích",
    pedagogyEn: "Short challenges, concrete objects, visual models, pair talk and playful building. English is introduced through high-frequency classroom phrases and science/action vocabulary.",
    pedagogyVi: "Thử thách ngắn, vật thật, mô hình trực quan, trao đổi theo cặp và hoạt động chế tạo. Tiếng Anh được đưa vào bằng mẫu câu lớp học quen thuộc và từ vựng khoa học/hành động.",
  },
  "10-12": {
    stageEn: "Investigate → Design → Test → Improve",
    stageVi: "Khảo sát → Thiết kế → Thử nghiệm → Cải tiến",
    pedagogyEn: "Guided inquiry, measurement, diagrams, collaboration and structured reflection. Learners begin to justify choices with evidence in simple English.",
    pedagogyVi: "Khám phá có hướng dẫn, đo lường, sơ đồ, hợp tác và phản tư có cấu trúc. Học sinh bắt đầu giải thích lựa chọn bằng minh chứng với tiếng Anh đơn giản.",
  },
  "13-15": {
    stageEn: "Model → Build → Analyze → Iterate",
    stageVi: "Mô hình hóa → Xây dựng → Phân tích → Lặp cải tiến",
    pedagogyEn: "Problem-based learning, data interpretation, systems thinking, documentation and team roles. English shifts toward technical explanation and presentation.",
    pedagogyVi: "Học theo vấn đề, diễn giải dữ liệu, tư duy hệ thống, ghi chép kỹ thuật và vai trò nhóm. Tiếng Anh chuyển dần sang giải thích kỹ thuật và thuyết trình.",
  },
  "16-18": {
    stageEn: "Research → Engineer → Validate → Present",
    stageVi: "Nghiên cứu → Kỹ thuật hóa → Xác thực → Trình bày",
    pedagogyEn: "Industry-style briefs, constraints, prototyping, evidence, trade-offs, documentation and portfolio-ready outcomes. English is used for technical communication and career readiness.",
    pedagogyVi: "Đề bài theo phong cách công nghiệp, ràng buộc, tạo mẫu, minh chứng, đánh đổi kỹ thuật, tài liệu hóa và sản phẩm đưa vào portfolio. Tiếng Anh dùng cho giao tiếp kỹ thuật và sẵn sàng nghề nghiệp.",
  },
};

type RawUnit = [string, string, string, string, string, string, string[]];

const U = (
  code: string,
  titleEn: string,
  titleVi: string,
  objectiveEn: string,
  objectiveVi: string,
  buildEn: string,
  buildVi: string,
  englishFocus: string[],
): FutureSkillsUnit => ({ code, titleEn, titleVi, objectiveEn, objectiveVi, buildEn, buildVi, englishFocus });

const curriculum: Record<FutureSkillsTrack, Record<FutureSkillsAgeBand, FutureSkillsUnit[]>> = {
  stem: {
    "7-9": [
      U("STEM79-01","Patterns, Shapes & Measurement","Mẫu, Hình & Đo lường","Notice patterns and compare length, shape and quantity.","Nhận biết mẫu và so sánh độ dài, hình dạng, số lượng.","Build a measurement treasure hunt.","Tạo trò săn kho báu bằng đo lường.",["long/short","more/less","I measured…"]),
      U("STEM79-02","Push, Pull & Motion","Đẩy, Kéo & Chuyển động","Explore how pushes and pulls change movement.","Khám phá cách lực đẩy và kéo làm thay đổi chuyển động.","Create a ramp test for toy vehicles.","Tạo thử nghiệm đường dốc cho xe đồ chơi.",["fast/slow","push/pull","It moved because…"]),
      U("STEM79-03","Strong Structures","Kết cấu vững chắc","Compare shapes and materials for strength.","So sánh hình dạng và vật liệu về độ bền.","Build a paper bridge that holds a load.","Làm cầu giấy chịu được tải.",["strong/weak","hold/support","Our bridge can…"]),
      U("STEM79-04","Water, Materials & Change","Nước, Vật liệu & Biến đổi","Observe absorbency, floating and material change.","Quan sát khả năng thấm, nổi và biến đổi vật liệu.","Design a simple floating carrier.","Thiết kế vật nổi chở đồ đơn giản.",["float/sink","wet/dry","We observed…"]),
      U("STEM79-05","Coding Patterns","Mẫu lệnh Lập trình","Use sequence and repetition to solve movement tasks.","Dùng trình tự và lặp để giải bài toán di chuyển.","Program a human robot maze.","Lập trình robot người đi qua mê cung.",["first/next/then","repeat","My algorithm…"]),
      U("STEM79-06","Mini Eco Engineering","Kỹ thuật Xanh Nhỏ","Connect science observations to an environmental solution.","Kết nối quan sát khoa học với một giải pháp môi trường.","Build a model that saves water or sorts waste.","Làm mô hình tiết kiệm nước hoặc phân loại rác.",["save/reuse/sort","problem/solution","We designed…"]),
    ],
    "10-12": [
      U("STEM1012-01","Variables & Fair Tests","Biến số & Thử nghiệm công bằng","Identify variables and plan a fair investigation.","Xác định biến và lập kế hoạch thử nghiệm công bằng.","Run a paper helicopter investigation.","Thử nghiệm trực thăng giấy.",["variable","compare","Our evidence shows…"]),
      U("STEM1012-02","Energy in Systems","Năng lượng trong hệ thống","Trace energy transfers in simple systems.","Theo dõi sự truyền năng lượng trong hệ thống đơn giản.","Build and compare elastic-powered vehicles.","Làm và so sánh xe chạy bằng dây đàn hồi.",["energy","transfer","efficiency"]),
      U("STEM1012-03","Structures & Forces","Kết cấu & Lực","Use compression, tension and geometry in structures.","Dùng nén, kéo và hình học trong kết cấu.","Engineer a tower under material limits.","Thiết kế tháp với giới hạn vật liệu.",["force","load","constraint"]),
      U("STEM1012-04","Data & Decisions","Dữ liệu & Quyết định","Collect, graph and interpret data to make decisions.","Thu thập, vẽ biểu đồ và diễn giải dữ liệu để ra quyết định.","Create a class data dashboard poster.","Tạo bảng dữ liệu trực quan cho lớp.",["average","trend","evidence"]),
      U("STEM1012-05","Circuits & Control","Mạch điện & Điều khiển","Understand input-output relationships in circuits.","Hiểu quan hệ đầu vào-đầu ra trong mạch.","Build a simple warning circuit or simulator.","Làm mạch cảnh báo đơn giản hoặc mô phỏng.",["input/output","circuit","if…then"]),
      U("STEM1012-06","Sustainable Design Challenge","Thử thách Thiết kế Bền vững","Combine science, maths and engineering in a local problem.","Kết hợp khoa học, toán và kỹ thuật cho vấn đề địa phương.","Prototype a low-waste school solution.","Tạo mẫu giải pháp giảm rác cho trường.",["criteria","trade-off","recommend"]),
    ],
    "13-15": [
      U("STEM1315-01","Systems & Models","Hệ thống & Mô hình","Represent inputs, processes, outputs and feedback.","Biểu diễn đầu vào, quá trình, đầu ra và phản hồi.","Model a school energy or water system.","Mô hình hóa hệ thống năng lượng hoặc nước ở trường.",["system boundary","feedback","assumption"]),
      U("STEM1315-02","Mechanics & Optimization","Cơ học & Tối ưu hóa","Use force, motion and ratios to optimize a design.","Dùng lực, chuyển động và tỉ lệ để tối ưu thiết kế.","Optimize a launcher or vehicle under constraints.","Tối ưu cơ cấu phóng hoặc xe với ràng buộc.",["optimize","ratio","performance"]),
      U("STEM1315-03","Electronics & Sensors","Điện tử & Cảm biến","Connect sensors, thresholds and outputs.","Kết nối cảm biến, ngưỡng và đầu ra.","Prototype an environmental monitor.","Tạo mẫu thiết bị giám sát môi trường.",["sensor","threshold","calibrate"]),
      U("STEM1315-04","Statistics for Evidence","Thống kê cho Minh chứng","Use distributions, error and repeated trials.","Dùng phân bố, sai số và thử nghiệm lặp.","Compare two designs with repeatable data.","So sánh hai thiết kế bằng dữ liệu lặp lại.",["variation","reliability","claim"]),
      U("STEM1315-05","Environmental Engineering","Kỹ thuật Môi trường","Evaluate materials and processes for sustainability.","Đánh giá vật liệu và quy trình theo tính bền vững.","Design a filtration or resource-saving prototype.","Thiết kế mẫu lọc hoặc tiết kiệm tài nguyên.",["impact","material","evaluate"]),
      U("STEM1315-06","Engineering Capstone","Dự án Kỹ thuật Tổng hợp","Plan, build, test and defend an integrated STEM solution.","Lập kế hoạch, xây, thử và bảo vệ giải pháp STEM tích hợp.","Pitch a tested prototype with evidence.","Thuyết trình mẫu thử có minh chứng.",["specification","iteration","justify"]),
    ],
    "16-18": [
      U("STEM1618-01","Research Questions & Experimental Design","Câu hỏi Nghiên cứu & Thiết kế Thí nghiệm","Turn a real problem into a testable research question.","Chuyển vấn đề thực thành câu hỏi nghiên cứu có thể kiểm chứng.","Write and peer-review an experimental protocol.","Viết và phản biện quy trình thí nghiệm.",["hypothesis","control","methodology"]),
      U("STEM1618-02","Mathematical Modeling","Mô hình Toán học","Use variables, functions and assumptions to model behavior.","Dùng biến, hàm và giả định để mô hình hóa hành vi.","Build a spreadsheet or code-based model.","Xây mô hình bằng bảng tính hoặc mã.",["model","parameter","sensitivity"]),
      U("STEM1618-03","Engineering Design Under Constraints","Thiết kế Kỹ thuật Có Ràng buộc","Balance cost, safety, performance and usability.","Cân bằng chi phí, an toàn, hiệu năng và tính sử dụng.","Create a design review with trade-off matrix.","Lập đánh giá thiết kế bằng ma trận đánh đổi.",["requirement","constraint","trade-off"]),
      U("STEM1618-04","Data Acquisition & Validation","Thu thập & Xác thực Dữ liệu","Plan reliable measurement and validate datasets.","Lập kế hoạch đo tin cậy và xác thực bộ dữ liệu.","Build a sensor/data collection protocol.","Xây quy trình thu dữ liệu/cảm biến.",["accuracy","precision","validation"]),
      U("STEM1618-05","Optimization & Decision Science","Tối ưu hóa & Khoa học Quyết định","Compare alternatives using weighted criteria and uncertainty.","So sánh phương án bằng tiêu chí trọng số và bất định.","Recommend a solution to a realistic client brief.","Đề xuất giải pháp cho đề bài khách hàng thực tế.",["criteria","uncertainty","recommendation"]),
      U("STEM1618-06","Industry STEM Capstone","Dự án STEM Theo Ngành","Deliver a portfolio-quality STEM project with technical documentation.","Hoàn thành dự án STEM chất lượng portfolio kèm tài liệu kỹ thuật.","Present prototype, data, risks and next iteration.","Trình bày mẫu thử, dữ liệu, rủi ro và vòng cải tiến tiếp theo.",["technical brief","risk","validation"]),
    ],
  },
  steam: {
    "7-9": [
      U("STEAM79-01","Shapes, Color & Pattern","Hình, Màu & Mẫu","Explore mathematical patterns through visual art.","Khám phá mẫu toán học qua nghệ thuật thị giác.","Create a symmetry-and-pattern gallery.","Tạo bộ sưu tập đối xứng và hoa văn.",["pattern","symmetry","I created…"]),
      U("STEAM79-02","Sound Makers","Nhạc cụ & Âm thanh","Connect vibration and materials to sound.","Kết nối rung động và vật liệu với âm thanh.","Build a simple sound maker.","Tạo nhạc cụ đơn giản.",["loud/soft","high/low","It sounds…"]),
      U("STEAM79-03","Story Machines","Máy kể chuyện","Use sequence, mechanism and story structure.","Dùng trình tự, cơ cấu và cấu trúc câu chuyện.","Build a moving story scene.","Làm cảnh truyện có chuyển động.",["character","sequence","first/then"]),
      U("STEAM79-04","Light, Shadow & Theater","Ánh sáng, Bóng & Sân khấu","Explore light and shape through performance.","Khám phá ánh sáng và hình dạng qua biểu diễn.","Design a shadow theater scene.","Thiết kế cảnh sân khấu bóng.",["light/shadow","near/far","We noticed…"]),
      U("STEAM79-05","Design for a Friend","Thiết kế cho Bạn","Practice empathy and simple human-centered design.","Thực hành thấu cảm và thiết kế lấy con người làm trung tâm.","Make an object that helps a classmate.","Tạo đồ vật giúp một bạn trong lớp.",["need","idea","help"]),
      U("STEAM79-06","Mini Maker Exhibition","Triển lãm Maker Nhỏ","Select, explain and improve a creative build.","Chọn, giải thích và cải tiến sản phẩm sáng tạo.","Curate a bilingual maker showcase.","Tổ chức triển lãm maker song ngữ.",["present","improve","My favorite feature…"]),
    ],
    "10-12": [
      U("STEAM1012-01","Visualizing Data","Trực quan hóa Dữ liệu","Turn data into clear visual stories.","Biến dữ liệu thành câu chuyện trực quan rõ ràng.","Create an infographic from class data.","Tạo infographic từ dữ liệu lớp.",["data story","compare","audience"]),
      U("STEAM1012-02","Kinetic Art","Nghệ thuật Chuyển động","Combine mechanisms, balance and visual design.","Kết hợp cơ cấu, cân bằng và thiết kế thị giác.","Build a moving sculpture.","Tạo tác phẩm điêu khắc chuyển động.",["motion","balance","mechanism"]),
      U("STEAM1012-03","Science of Sound","Khoa học Âm thanh","Investigate pitch, rhythm and digital sound patterns.","Khảo sát cao độ, nhịp và mẫu âm thanh số.","Design a short soundscape with scientific explanation.","Thiết kế cảnh âm thanh kèm giải thích khoa học.",["frequency","rhythm","explain"]),
      U("STEAM1012-04","Sustainable Product Design","Thiết kế Sản phẩm Bền vững","Apply material science and user needs to product design.","Áp dụng khoa học vật liệu và nhu cầu người dùng vào thiết kế.","Prototype a low-waste school product.","Tạo mẫu sản phẩm trường học ít rác.",["user","material","sustainable"]),
      U("STEAM1012-05","Digital Storytelling","Kể chuyện Số","Combine coding logic, media and narrative.","Kết hợp logic lập trình, truyền thông và kể chuyện.","Build an interactive story prototype.","Tạo mẫu câu chuyện tương tác.",["scene","interaction","choice"]),
      U("STEAM1012-06","Design Showcase","Triển lãm Thiết kế","Document process and communicate design decisions.","Tài liệu hóa quy trình và giao tiếp quyết định thiết kế.","Present a bilingual design portfolio.","Trình bày portfolio thiết kế song ngữ.",["process","feedback","portfolio"]),
    ],
    "13-15": [
      U("STEAM1315-01","Human-Centered Design","Thiết kế Lấy Con người Làm Trung tâm","Use interviews, needs and constraints to frame design problems.","Dùng phỏng vấn, nhu cầu và ràng buộc để xác định vấn đề thiết kế.","Create a user-needs design brief.","Tạo đề bài thiết kế theo nhu cầu người dùng.",["empathy","insight","design brief"]),
      U("STEAM1315-02","Generative Patterns","Mẫu Sinh Tạo","Explore algorithms, geometry and creative variation.","Khám phá thuật toán, hình học và biến thể sáng tạo.","Produce algorithmic art using blocks or code.","Tạo nghệ thuật thuật toán bằng khối lệnh hoặc mã.",["algorithm","parameter","variation"]),
      U("STEAM1315-03","Media, Data & Meaning","Truyền thông, Dữ liệu & Ý nghĩa","Critique how visual choices influence interpretation.","Phân tích cách lựa chọn hình ảnh ảnh hưởng diễn giải.","Redesign a misleading chart or media piece.","Thiết kế lại biểu đồ hoặc nội dung gây hiểu nhầm.",["interpret","bias","visual hierarchy"]),
      U("STEAM1315-04","Interactive Art & Sensors","Nghệ thuật Tương tác & Cảm biến","Connect sensing, coding and creative response.","Kết nối cảm biến, lập trình và phản hồi sáng tạo.","Prototype a responsive installation.","Tạo mẫu sắp đặt tương tác.",["sensor","trigger","response"]),
      U("STEAM1315-05","Sustainable Spaces","Không gian Bền vững","Integrate geometry, environment and human use.","Tích hợp hình học, môi trường và nhu cầu sử dụng.","Redesign a school space for comfort and sustainability.","Thiết kế lại không gian trường học bền vững.",["space","constraint","accessibility"]),
      U("STEAM1315-06","Creative Systems Portfolio","Portfolio Hệ thống Sáng tạo","Document iterations and defend a multidisciplinary solution.","Tài liệu hóa vòng lặp và bảo vệ giải pháp đa lĩnh vực.","Publish a process portfolio and exhibition pitch.","Công bố portfolio quá trình và thuyết trình triển lãm.",["iteration","critique","rationale"]),
    ],
    "16-18": [
      U("STEAM1618-01","Design Research","Nghiên cứu Thiết kế","Plan ethical user research and synthesize insights.","Lập nghiên cứu người dùng có đạo đức và tổng hợp insight.","Produce a research-backed opportunity map.","Tạo bản đồ cơ hội dựa trên nghiên cứu.",["research question","insight","evidence"]),
      U("STEAM1618-02","Computational Creativity","Sáng tạo Tính toán","Use algorithms and parameters as creative materials.","Dùng thuật toán và tham số như vật liệu sáng tạo.","Create a generative visual/audio prototype.","Tạo mẫu hình ảnh/âm thanh sinh tạo.",["generative","parameter","system"]),
      U("STEAM1618-03","UX & Prototyping","UX & Tạo mẫu","Translate user needs into flows and testable prototypes.","Chuyển nhu cầu người dùng thành luồng và mẫu có thể kiểm thử.","Run a usability test and iterate.","Thực hiện kiểm thử khả dụng và cải tiến.",["user flow","prototype","usability"]),
      U("STEAM1618-04","Digital Fabrication Thinking","Tư duy Chế tạo Số","Plan designs for fabrication constraints and tolerances.","Lập thiết kế theo ràng buộc và dung sai chế tạo.","Create a fabrication-ready model or mockup.","Tạo mô hình hoặc mockup sẵn sàng chế tạo.",["tolerance","fabrication","specification"]),
      U("STEAM1618-05","Communication & Experience Design","Thiết kế Trải nghiệm & Giao tiếp","Design how an audience understands and experiences information.","Thiết kế cách người xem hiểu và trải nghiệm thông tin.","Build an interactive exhibition or campaign prototype.","Tạo mẫu triển lãm hoặc chiến dịch tương tác.",["audience","narrative","experience"]),
      U("STEAM1618-06","Social Impact Design Capstone","Dự án Thiết kế Tác động Xã hội","Deliver a multidisciplinary solution with impact evidence.","Hoàn thành giải pháp đa lĩnh vực với minh chứng tác động.","Pitch a portfolio-ready social-impact project.","Thuyết trình dự án tác động xã hội sẵn sàng portfolio.",["impact","stakeholder","portfolio"]),
    ],
  },
  "ai-foundation": {
    "7-9": [
      U("AIF79-01","What Is AI?","AI là gì?","Distinguish smart-looking rules from systems that learn from examples.","Phân biệt quy tắc trông thông minh với hệ thống học từ ví dụ.","Sort everyday examples into rule-based, AI-assisted and human decisions.","Phân loại ví dụ thành quy tắc, AI hỗ trợ và quyết định con người.",["AI","rule","example"]),
      U("AIF79-02","Patterns & Categories","Mẫu & Phân loại","Recognize features used to group objects.","Nhận biết đặc điểm dùng để nhóm vật.","Create a classroom classification game.","Tạo trò chơi phân loại trong lớp.",["same/different","feature","group"]),
      U("AIF79-03","Data Are Examples","Dữ liệu là Ví dụ","Understand that AI needs examples and that examples can be incomplete.","Hiểu AI cần ví dụ và ví dụ có thể chưa đầy đủ.","Build a paper dataset and find missing examples.","Tạo bộ dữ liệu giấy và tìm ví dụ còn thiếu.",["data","example","missing"]),
      U("AIF79-04","AI Makes Guesses","AI Đưa ra Dự đoán","Understand confidence and that AI can be wrong.","Hiểu độ tin cậy và AI có thể sai.","Play a confidence guessing game.","Chơi trò dự đoán có mức độ tin cậy.",["guess","sure/not sure","check"]),
      U("AIF79-05","Fair & Safe AI","AI Công bằng & An toàn","Practice asking who may be left out and what should stay private.","Thực hành hỏi ai có thể bị bỏ sót và dữ liệu nào cần riêng tư.","Create a safe-AI poster for children.","Tạo poster AI an toàn cho trẻ.",["fair","private","ask an adult"]),
      U("AIF79-06","AI Detective Challenge","Thử thách Thám tử AI","Use the foundation ideas to explain an AI-assisted situation.","Dùng kiến thức nền để giải thích tình huống có AI hỗ trợ.","Present an AI detective case.","Trình bày một vụ việc thám tử AI.",["I think… because…","evidence","human check"]),
    ],
    "10-12": [
      U("AIF1012-01","Features, Labels & Datasets","Đặc trưng, Nhãn & Bộ dữ liệu","Identify features, labels and examples in a dataset.","Xác định đặc trưng, nhãn và ví dụ trong bộ dữ liệu.","Design a small classification dataset.","Thiết kế bộ dữ liệu phân loại nhỏ.",["feature","label","dataset"]),
      U("AIF1012-02","Training & Testing","Huấn luyện & Kiểm thử","Understand why examples used for learning and checking should be separated.","Hiểu vì sao ví dụ học và kiểm tra nên tách riêng.","Run a paper-based train/test simulation.","Mô phỏng huấn luyện/kiểm thử bằng giấy.",["train","test","accuracy"]),
      U("AIF1012-03","Classification & Prediction","Phân loại & Dự đoán","Explore how models map patterns to outputs.","Khám phá cách mô hình ánh xạ mẫu sang đầu ra.","Build a no-code rule/model comparison.","So sánh quy tắc và mô hình không cần code.",["input","prediction","model"]),
      U("AIF1012-04","Recommendations","Hệ thống Gợi ý","Understand recommendations as pattern-based guesses, not facts.","Hiểu gợi ý là dự đoán theo mẫu, không phải sự thật.","Design a transparent book recommender.","Thiết kế hệ gợi ý sách minh bạch.",["recommend","preference","because"]),
      U("AIF1012-05","Bias, Privacy & Human Choice","Thiên lệch, Riêng tư & Quyền chọn","Identify biased examples and privacy risks.","Nhận biết ví dụ thiên lệch và rủi ro riêng tư.","Audit a fictional AI app for fairness and privacy.","Kiểm tra ứng dụng AI giả định về công bằng và riêng tư.",["bias","privacy","consent"]),
      U("AIF1012-06","No-Code AI Mini Project","Dự án AI Không Code","Plan, test and explain a small age-appropriate AI model or simulation.","Lập kế hoạch, thử và giải thích mô hình hoặc mô phỏng AI nhỏ.","Create a simple classifier with approved classroom tooling or cards.","Tạo bộ phân loại đơn giản bằng công cụ lớp học được duyệt hoặc thẻ.",["purpose","test","limitation"]),
    ],
    "13-15": [
      U("AIF1315-01","Machine Learning Concepts","Khái niệm Học máy","Understand model, feature, label, training and inference.","Hiểu mô hình, đặc trưng, nhãn, huấn luyện và suy luận.","Map a real use case into an ML pipeline.","Vẽ quy trình ML cho tình huống thực.",["training","inference","pipeline"]),
      U("AIF1315-02","Data Preparation","Chuẩn bị Dữ liệu","Explore data quality, balance, missing values and representation.","Khám phá chất lượng, cân bằng, dữ liệu thiếu và tính đại diện.","Clean and document a small dataset.","Làm sạch và tài liệu hóa bộ dữ liệu nhỏ.",["quality","representative","missing value"]),
      U("AIF1315-03","Evaluating Models","Đánh giá Mô hình","Use accuracy, error cases and simple confusion matrices.","Dùng độ chính xác, trường hợp sai và ma trận nhầm lẫn đơn giản.","Compare two model result sheets.","So sánh kết quả hai mô hình.",["false positive","false negative","metric"]),
      U("AIF1315-04","Language & Vision AI","AI Ngôn ngữ & Thị giác","Understand how text and image systems represent patterns.","Hiểu cách hệ thống văn bản và hình ảnh biểu diễn mẫu.","Compare NLP and computer-vision use cases.","So sánh ứng dụng NLP và thị giác máy.",["language model","vision","representation"]),
      U("AIF1315-05","Responsible AI","AI Có Trách nhiệm","Analyze fairness, transparency, privacy, safety and human oversight.","Phân tích công bằng, minh bạch, riêng tư, an toàn và giám sát con người.","Create a risk-and-control sheet for an AI idea.","Tạo bảng rủi ro và kiểm soát cho ý tưởng AI.",["risk","control","oversight"]),
      U("AIF1315-06","AI Foundation Capstone","Dự án Tổng hợp AI Nền tảng","Design and defend an AI-assisted solution without overclaiming capability.","Thiết kế và bảo vệ giải pháp có AI hỗ trợ mà không phóng đại năng lực.","Present problem, data, model idea, evaluation and safeguards.","Trình bày vấn đề, dữ liệu, ý tưởng mô hình, đánh giá và bảo vệ.",["assumption","evaluation","safeguard"]),
    ],
    "16-18": [
      U("AIF1618-01","AI System Lifecycle","Vòng đời Hệ thống AI","Map problem framing, data, modeling, evaluation, deployment and monitoring.","Mô tả xác định vấn đề, dữ liệu, mô hình, đánh giá, triển khai và giám sát.","Create an AI lifecycle canvas for a real sector.","Tạo canvas vòng đời AI cho ngành thực tế.",["lifecycle","stakeholder","objective"]),
      U("AIF1618-02","Supervised & Unsupervised Thinking","Tư duy Có giám sát & Không giám sát","Compare classification/regression with clustering-style exploration.","So sánh phân loại/hồi quy với khám phá kiểu phân cụm.","Choose an approach for several business/education cases.","Chọn cách tiếp cận cho các tình huống doanh nghiệp/giáo dục.",["supervised","unsupervised","target"]),
      U("AIF1618-03","Model Evaluation & Trade-offs","Đánh giá Mô hình & Đánh đổi","Interpret metrics in context and identify costly errors.","Diễn giải chỉ số theo ngữ cảnh và nhận diện lỗi tốn kém.","Build an evaluation scorecard.","Tạo bảng điểm đánh giá mô hình.",["precision","recall","trade-off"]),
      U("AIF1618-04","Generative AI Foundations","Nền tảng AI Tạo sinh","Understand tokens, context, probabilistic generation and verification.","Hiểu token, ngữ cảnh, sinh xác suất và xác minh.","Create a prompt-test-verify workflow.","Tạo quy trình prompt-thử-xác minh.",["context","generation","verification"]),
      U("AIF1618-05","AI Governance & Privacy","Quản trị AI & Riêng tư","Apply data minimization, human oversight and risk controls.","Áp dụng giảm thiểu dữ liệu, giám sát con người và kiểm soát rủi ro.","Write a lightweight AI use policy for a school project.","Viết chính sách dùng AI gọn cho dự án trường.",["governance","data minimization","accountability"]),
      U("AIF1618-06","AI Product Mini-Capstone","Dự án Sản phẩm AI Nhỏ","Design an AI-enabled product concept with measurable evaluation.","Thiết kế khái niệm sản phẩm AI có đánh giá đo lường được.","Pitch the product, evaluation plan and safeguards.","Thuyết trình sản phẩm, kế hoạch đánh giá và biện pháp bảo vệ.",["product brief","metric","guardrail"]),
    ],
  },
  "ai-level-2": {
    "7-9": [
      U("AI279-01","Better Features, Better Guesses","Đặc trưng Tốt, Dự đoán Tốt","See how useful features improve classification.","Thấy đặc trưng hữu ích giúp phân loại tốt hơn.","Improve a card classifier by changing features.","Cải tiến bộ phân loại thẻ bằng cách đổi đặc trưng.",["feature","useful","improve"]),
      U("AI279-02","Confidence & Human Checking","Độ tin cậy & Con người Kiểm tra","Use confidence as a reason to ask for human help.","Dùng độ tin cậy làm lý do cần con người hỗ trợ.","Create a stop-and-check decision game.","Tạo trò quyết định dừng-và-kiểm-tra.",["confidence","check","human"]),
      U("AI279-03","Feedback Helps Systems Improve","Phản hồi Giúp Hệ thống Cải tiến","Understand correction and feedback loops.","Hiểu sửa lỗi và vòng phản hồi.","Run a teacher-feedback learning simulation.","Mô phỏng học từ phản hồi giáo viên.",["feedback","correct","again"]),
      U("AI279-04","Vision & Sensors","Thị giác & Cảm biến","Compare what cameras/sensors can and cannot detect.","So sánh điều camera/cảm biến có thể và không thể phát hiện.","Design a safe smart-room idea.","Thiết kế ý tưởng phòng thông minh an toàn.",["detect","sensor","cannot know"]),
      U("AI279-05","Prompting as Clear Instructions","Prompt là Chỉ dẫn Rõ ràng","Practice giving clear, bounded instructions to an AI assistant.","Thực hành đưa chỉ dẫn rõ, có giới hạn cho trợ lý AI.","Rewrite vague instructions into safe clear prompts.","Viết lại chỉ dẫn mơ hồ thành prompt rõ và an toàn.",["instruction","specific","check"]),
      U("AI279-06","Human-in-the-Loop Creator","Nhà sáng tạo Có Con người Kiểm soát","Combine AI suggestion, human choice and verification.","Kết hợp gợi ý AI, lựa chọn con người và xác minh.","Create a human-check workflow poster.","Tạo poster quy trình con người kiểm tra.",["suggest","decide","verify"]),
    ],
    "10-12": [
      U("AI21012-01","Build a Simple Classifier","Xây Bộ phân loại Đơn giản","Train and test a small no-code model with safe data.","Huấn luyện và kiểm thử mô hình không code bằng dữ liệu an toàn.","Build a small image/text classifier with approved tooling.","Tạo bộ phân loại ảnh/văn bản nhỏ bằng công cụ được duyệt.",["train","label","test"]),
      U("AI21012-02","Understanding Errors","Hiểu Lỗi Mô hình","Analyze false positives and false negatives intuitively.","Phân tích dương tính giả và âm tính giả trực quan.","Create an error table and improve the dataset.","Tạo bảng lỗi và cải tiến dữ liệu.",["error","false positive","false negative"]),
      U("AI21012-03","Prompt Systems","Hệ thống Prompt","Use role, context, task, constraints and checking steps.","Dùng vai trò, ngữ cảnh, nhiệm vụ, ràng buộc và bước kiểm tra.","Build a reusable prompt template for learning.","Tạo mẫu prompt tái sử dụng cho học tập.",["context","constraint","format"]),
      U("AI21012-04","Multimodal AI","AI Đa phương thức","Compare text, image and audio inputs and their limitations.","So sánh đầu vào văn bản, hình ảnh, âm thanh và giới hạn.","Design a multimodal classroom helper concept.","Thiết kế trợ lý lớp học đa phương thức.",["modality","input","limitation"]),
      U("AI21012-05","Human-in-the-Loop Workflows","Quy trình Có Con người Kiểm soát","Design checkpoints where people approve important actions.","Thiết kế điểm kiểm tra để con người duyệt hành động quan trọng.","Map an AI-assisted homework workflow.","Vẽ quy trình bài tập có AI hỗ trợ.",["approve","checkpoint","responsibility"]),
      U("AI21012-06","AI Creator Project","Dự án Nhà sáng tạo AI","Build and present a safe AI-assisted prototype.","Xây và trình bày mẫu có AI hỗ trợ an toàn.","Demo, test and reflect on a prototype.","Demo, kiểm thử và phản tư về mẫu.",["demo","test case","reflection"]),
    ],
    "13-15": [
      U("AI21315-01","AI Pipelines","Quy trình AI","Connect data, preprocessing, model, evaluation and output.","Kết nối dữ liệu, tiền xử lý, mô hình, đánh giá và đầu ra.","Diagram and simulate an end-to-end AI pipeline.","Vẽ và mô phỏng quy trình AI đầu-cuối.",["pipeline","preprocess","output"]),
      U("AI21315-02","Embeddings & Similarity","Embedding & Độ tương đồng","Understand vector-like representations and similarity conceptually.","Hiểu biểu diễn dạng vector và độ tương đồng ở mức khái niệm.","Build a paper similarity search.","Tạo tìm kiếm tương đồng bằng giấy.",["embedding","similarity","retrieve"]),
      U("AI21315-03","Retrieval + Generation","Truy xuất + Tạo sinh","Understand grounded generation using approved source material.","Hiểu tạo sinh có căn cứ dựa trên nguồn được duyệt.","Design a small source-grounded Q&A system.","Thiết kế hệ hỏi đáp có nguồn nhỏ.",["retrieve","source","grounded"]),
      U("AI21315-04","Agents & Tool Use","Agent & Sử dụng Công cụ","Understand plan-act-check loops and tool boundaries.","Hiểu vòng lập kế hoạch-hành động-kiểm tra và giới hạn công cụ.","Create a safe agent flowchart without autonomous sensitive actions.","Tạo sơ đồ agent an toàn không tự hành động nhạy cảm.",["plan","tool","permission"]),
      U("AI21315-05","Evaluation & Red Teaming","Đánh giá & Kiểm thử Rủi ro","Create test cases for quality, safety and failure modes.","Tạo ca kiểm thử cho chất lượng, an toàn và lỗi.","Build an evaluation checklist for an AI prototype.","Tạo checklist đánh giá mẫu AI.",["test case","failure mode","evaluate"]),
      U("AI21315-06","Responsible AI System Capstone","Dự án Hệ thống AI Có Trách nhiệm","Prototype an AI workflow with evidence, controls and reflection.","Tạo mẫu quy trình AI có minh chứng, kiểm soát và phản tư.","Present architecture, tests, risks and human checkpoints.","Trình bày kiến trúc, kiểm thử, rủi ro và điểm kiểm tra con người.",["architecture","guardrail","evidence"]),
    ],
    "16-18": [
      U("AI21618-01","Applied AI Architecture","Kiến trúc AI Ứng dụng","Design an AI-enabled system with deterministic and model-driven parts.","Thiết kế hệ có AI với phần xác định và phần dựa trên mô hình.","Produce an architecture diagram and data-flow map.","Tạo sơ đồ kiến trúc và luồng dữ liệu.",["architecture","deterministic","orchestration"]),
      U("AI21618-02","APIs, Models & Data Boundaries","API, Mô hình & Ranh giới Dữ liệu","Understand API-mediated AI systems and safe data boundaries.","Hiểu hệ AI qua API và ranh giới dữ liệu an toàn.","Design a mock API contract with privacy limits.","Thiết kế hợp đồng API giả lập có giới hạn riêng tư.",["API","schema","data boundary"]),
      U("AI21618-03","RAG & Knowledge Systems","RAG & Hệ Tri thức","Design retrieval-grounded systems and source citation flows.","Thiết kế hệ dựa trên truy xuất và luồng dẫn nguồn.","Prototype a small knowledge assistant using approved content.","Tạo mẫu trợ lý tri thức bằng nội dung được duyệt.",["retrieval","chunk","citation"]),
      U("AI21618-04","Agent Orchestration","Điều phối Agent","Model state, tools, permissions and human approval in agent workflows.","Mô hình hóa trạng thái, công cụ, quyền và phê duyệt con người trong agent.","Design a LangGraph-style state workflow.","Thiết kế quy trình trạng thái kiểu LangGraph.",["state","node","approval"]),
      U("AI21618-05","Evals, Safety & Observability","Đánh giá, An toàn & Quan sát","Create evaluation sets, guardrails, logs and monitoring plans.","Tạo bộ đánh giá, guardrail, log và kế hoạch giám sát.","Build an AI quality and safety scorecard.","Tạo bảng điểm chất lượng và an toàn AI.",["evaluation set","guardrail","observability"]),
      U("AI21618-06","AI Product Engineering Capstone","Dự án Kỹ thuật Sản phẩm AI","Deliver a portfolio-ready AI system proposal or prototype.","Hoàn thành đề xuất hoặc mẫu hệ thống AI sẵn sàng portfolio.","Demo architecture, evaluations, risks, cost and next steps.","Demo kiến trúc, đánh giá, rủi ro, chi phí và bước tiếp.",["deployment","evaluation","cost"]),
    ],
  },
  robotics: {
    "7-9": [
      U("ROB79-01","Sense, Think, Act","Cảm nhận, Suy nghĩ, Hành động","Understand robots as systems with inputs, decisions and actions.","Hiểu robot là hệ có đầu vào, quyết định và hành động.","Build a paper robot system map.","Tạo sơ đồ hệ robot bằng giấy.",["sensor","decision","action"]),
      U("ROB79-02","Sequences & Movement","Trình tự & Chuyển động","Use ordered commands to control movement.","Dùng lệnh theo thứ tự để điều khiển chuyển động.","Program a floor robot or human robot route.","Lập trình robot sàn hoặc robot người theo đường.",["forward","turn","sequence"]),
      U("ROB79-03","Motors & Mechanisms","Động cơ & Cơ cấu","Explore wheels, gears and simple mechanisms.","Khám phá bánh xe, bánh răng và cơ cấu đơn giản.","Build a moving mechanism model.","Làm mô hình cơ cấu chuyển động.",["motor","wheel","gear"]),
      U("ROB79-04","Sensors & Reactions","Cảm biến & Phản ứng","Use if-then logic with simple sensor ideas.","Dùng logic nếu-thì với cảm biến đơn giản.","Create an obstacle-reaction simulation.","Tạo mô phỏng phản ứng tránh vật cản.",["if/then","detect","stop"]),
      U("ROB79-05","Robot Safety","An toàn Robot","Identify safe zones, people and robot limits.","Nhận biết vùng an toàn, con người và giới hạn robot.","Design a safe robot playground.","Thiết kế khu hoạt động robot an toàn.",["safe zone","warning","human"]),
      U("ROB79-06","Mini Robot Mission","Nhiệm vụ Robot Nhỏ","Combine sequence, sensing and explanation.","Kết hợp trình tự, cảm biến và giải thích.","Complete and explain a rescue-delivery challenge.","Hoàn thành và giải thích thử thách cứu hộ/giao hàng.",["mission","debug","success"]),
    ],
    "10-12": [
      U("ROB1012-01","Chassis & Motion","Khung xe & Chuyển động","Understand wheelbase, traction and turning.","Hiểu khoảng cách bánh, độ bám và quay.","Build or simulate a stable robot chassis.","Làm hoặc mô phỏng khung robot ổn định.",["chassis","traction","turn"]),
      U("ROB1012-02","Sensor Inputs","Đầu vào Cảm biến","Compare touch, distance, light and line sensors.","So sánh cảm biến chạm, khoảng cách, ánh sáng và dò line.","Calibrate a sensor threshold.","Hiệu chuẩn ngưỡng cảm biến.",["sensor","threshold","calibrate"]),
      U("ROB1012-03","Loops & Conditions","Vòng lặp & Điều kiện","Use loops and conditions in robot behavior.","Dùng vòng lặp và điều kiện cho hành vi robot.","Program repeatable navigation behavior.","Lập trình hành vi điều hướng lặp.",["loop","condition","debug"]),
      U("ROB1012-04","Line Following","Dò Đường","Connect sensing and corrective movement.","Kết nối cảm biến và điều chỉnh chuyển động.","Build/simulate a line-following challenge.","Làm/mô phỏng thử thách dò line.",["left/right correction","feedback","path"]),
      U("ROB1012-05","Robot Manipulation","Robot Thao tác","Explore grippers and simple mechanisms.","Khám phá kẹp và cơ cấu thao tác đơn giản.","Design a pick-and-place mechanism.","Thiết kế cơ cấu gắp-đặt.",["grip","lift","place"]),
      U("ROB1012-06","Mission Challenge","Thử thách Nhiệm vụ","Integrate navigation, sensing and manipulation.","Tích hợp điều hướng, cảm biến và thao tác.","Complete a warehouse or rescue mission.","Hoàn thành nhiệm vụ kho hoặc cứu hộ.",["mission","constraint","team role"]),
    ],
    "13-15": [
      U("ROB1315-01","Microcontrollers & I/O","Vi điều khiển & I/O","Understand digital/analog input-output and program flow.","Hiểu đầu vào-đầu ra số/tương tự và luồng chương trình.","Connect simulated or physical sensors and actuators.","Kết nối cảm biến và cơ cấu chấp hành mô phỏng/thật.",["microcontroller","analog","actuator"]),
      U("ROB1315-02","Feedback Control","Điều khiển Phản hồi","Use error and correction in closed-loop behavior.","Dùng sai lệch và hiệu chỉnh trong vòng kín.","Tune a simple proportional controller concept.","Tinh chỉnh khái niệm điều khiển tỉ lệ đơn giản.",["error","feedback","gain"]),
      U("ROB1315-03","Sensor Fusion","Hợp nhất Cảm biến","Combine multiple signals for better decisions.","Kết hợp nhiều tín hiệu để quyết định tốt hơn.","Design a two-sensor navigation strategy.","Thiết kế chiến lược điều hướng hai cảm biến.",["fusion","reliability","signal"]),
      U("ROB1315-04","Autonomous Behaviors","Hành vi Tự chủ","Build state-based robot behaviors.","Xây hành vi robot theo trạng thái.","Create a finite-state mission controller.","Tạo bộ điều khiển nhiệm vụ theo trạng thái.",["state","transition","autonomy"]),
      U("ROB1315-05","Vision for Robotics","Thị giác cho Robot","Understand image detection as a sensor input with uncertainty.","Hiểu phát hiện hình ảnh là đầu vào cảm biến có bất định.","Prototype a vision-triggered behavior concept.","Tạo mẫu hành vi kích hoạt bằng thị giác.",["detect","confidence","camera"]),
      U("ROB1315-06","Robotics Capstone","Dự án Robot Tổng hợp","Integrate mechanics, electronics, code and testing.","Tích hợp cơ khí, điện tử, mã và kiểm thử.","Run a documented robotics mission challenge.","Thực hiện thử thách robot có tài liệu.",["integration","test log","iteration"]),
    ],
    "16-18": [
      U("ROB1618-01","Kinematics & Motion Planning","Động học & Lập kế hoạch Chuyển động","Model robot position, velocity and movement constraints.","Mô hình hóa vị trí, vận tốc và ràng buộc chuyển động robot.","Create a motion plan for a mobile or arm robot.","Tạo kế hoạch chuyển động cho robot di động hoặc tay máy.",["kinematics","trajectory","constraint"]),
      U("ROB1618-02","Embedded Systems","Hệ thống Nhúng","Connect sensing, computation and actuation under resource limits.","Kết nối cảm biến, tính toán và chấp hành dưới giới hạn tài nguyên.","Design an embedded control architecture.","Thiết kế kiến trúc điều khiển nhúng.",["embedded","latency","resource"]),
      U("ROB1618-03","Control Systems","Hệ Điều khiển","Analyze feedback, stability and tuning conceptually.","Phân tích phản hồi, ổn định và tinh chỉnh ở mức khái niệm.","Tune and compare control strategies.","Tinh chỉnh và so sánh chiến lược điều khiển.",["stability","controller","response"]),
      U("ROB1618-04","Robot Software Architecture","Kiến trúc Phần mềm Robot","Understand modular nodes, messages and robot middleware concepts.","Hiểu module, message và khái niệm middleware robot.","Design a ROS-style component graph.","Thiết kế sơ đồ thành phần kiểu ROS.",["node","message","module"]),
      U("ROB1618-05","Computer Vision & Autonomy","Thị giác Máy & Tự chủ","Connect perception, confidence and safe autonomous decisions.","Kết nối nhận thức, độ tin cậy và quyết định tự chủ an toàn.","Design a perception-to-action pipeline.","Thiết kế quy trình từ nhận thức đến hành động.",["perception","confidence","fallback"]),
      U("ROB1618-06","Industry Robotics Capstone","Dự án Robot Theo Ngành","Solve an industry-style robotics brief with evidence and safety controls.","Giải đề bài robot theo ngành với minh chứng và kiểm soát an toàn.","Present architecture, prototype, tests, risks and ROI assumptions.","Trình bày kiến trúc, mẫu, kiểm thử, rủi ro và giả định ROI.",["technical review","safety case","ROI"]),
    ],
  },
};

export const FUTURE_SKILLS_PATHWAYS: FutureSkillsPathway[] = FUTURE_SKILLS_TRACKS.flatMap((track) =>
  (Object.keys(AGE_PEDAGOGY) as FutureSkillsAgeBand[]).map((ageBand) => ({
    track: track.key,
    trackTitleEn: track.titleEn,
    trackTitleVi: track.titleVi,
    ageBand,
    ...AGE_PEDAGOGY[ageBand],
    sessions: 12,
    units: curriculum[track.key][ageBand],
  })),
);

export function getFutureSkillsPathway(track: FutureSkillsTrack, ageBand: FutureSkillsAgeBand) {
  return FUTURE_SKILLS_PATHWAYS.find((pathway) => pathway.track === track && pathway.ageBand === ageBand) ?? null;
}

export const FUTURE_SKILLS_DELIVERY_MODEL = {
  sessionsPerPathway: 12,
  sessionMinutes: {
    "7-9": 60,
    "10-12": 75,
    "13-15": 90,
    "16-18": 90,
  } as Record<FutureSkillsAgeBand, number>,
  lessonPatternEn: ["Launch in English", "Explore / investigate", "Build / apply", "Test / discuss", "Reflect / evidence"],
  lessonPatternVi: ["Khởi động bằng tiếng Anh", "Khám phá / khảo sát", "Xây dựng / áp dụng", "Thử nghiệm / thảo luận", "Phản tư / minh chứng"],
};

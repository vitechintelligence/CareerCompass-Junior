import type { CurriculumUnit } from "@/lib/curriculum";

export const MY_COMPASS_INTERACTIVE_URL = "https://claude.ai/code/artifact/8cf53fd2-4a4e-4869-8c5d-e34dbb448be4?org=ab08bb84-ed17-489c-a2fd-8a2dcc1428fc";

export type BookCatalogItem = {
  code: string;
  title: string;
  subtitle: string;
  ageBand: string;
  level: string;
  bilingual: boolean;
  description: string;
  accent: string;
  interactiveUrl?: string;
  interactiveStatus?: "preview" | "complete";
  units: Array<{
    code: string;
    unitNumber: number;
    titleEn: string;
    titleVi: string;
    objectiveEn: string;
    objectiveVi: string;
    careerCompassFocus: string;
    masteryEnglishFocus: string;
  }>;
};

export const interactiveBooks: BookCatalogItem[] = [
  {
    code: "CCJ-BIG-IDEAS",
    title: "Career Compass Junior",
    subtitle: "Big Ideas, Bright Futures",
    ageBand: "7–12",
    level: "A0–A2",
    bilingual: true,
    description: "English + skills adventure for curious minds, projects, communication and future readiness.",
    accent: "🧭",
    units: [
      { code: "U01", unitNumber: 1, titleEn: "My Big Idea", titleVi: "Ý tưởng lớn của em", objectiveEn: "Introduce an idea and explain one reason it matters.", objectiveVi: "Giới thiệu một ý tưởng và giải thích một lý do vì sao ý tưởng đó quan trọng.", careerCompassFocus: "Curiosity, idea formation and confident sharing", masteryEnglishFocus: "I think… / My idea is… / It matters because…" },
      { code: "U02", unitNumber: 2, titleEn: "People Who Help", titleVi: "Những người giúp đỡ", objectiveEn: "Describe how people use skills to help others.", objectiveVi: "Mô tả cách mọi người dùng kỹ năng để giúp người khác.", careerCompassFocus: "Roles, contribution and community awareness", masteryEnglishFocus: "He/She helps by… / They are good at…" },
    ],
  },
  {
    code: "CCJ-MASTERY-BEGINNER",
    title: "Career Compass Junior Mastery",
    subtitle: "Beginner · 96 Lessons",
    ageBand: "7–12",
    level: "A0–A1",
    bilingual: true,
    description: "Bilingual English–Vietnamese mastery journey combining communication, self-discovery and practical skills.",
    accent: "🌱",
    units: [
      { code: "U01", unitNumber: 1, titleEn: "Who Am I?", titleVi: "Em là ai?", objectiveEn: "Introduce yourself with simple, usable English.", objectiveVi: "Giới thiệu bản thân bằng tiếng Anh đơn giản, có thể sử dụng ngay.", careerCompassFocus: "Identity and self-awareness", masteryEnglishFocus: "My name is… / I am… / I like…" },
      { code: "U02", unitNumber: 2, titleEn: "My Strengths", titleVi: "Điểm mạnh của em", objectiveEn: "Name strengths and give a simple example.", objectiveVi: "Gọi tên điểm mạnh và đưa ra một ví dụ đơn giản.", careerCompassFocus: "Strengths discovery", masteryEnglishFocus: "I am good at… / I can…" },
    ],
  },
  {
    code: "MY-COMPASS",
    title: "MY COMPASS",
    subtitle: "English + Life Skills + Career Discovery",
    ageBand: "13–18",
    level: "A0–A1",
    bilingual: true,
    description: "Teen learning journey for English, life skills, self-awareness and early career discovery.",
    accent: "🗺️",
    interactiveUrl: MY_COMPASS_INTERACTIVE_URL,
    interactiveStatus: "complete",
    units: [
      { code: "U01", unitNumber: 1, titleEn: "My Direction", titleVi: "Hướng đi của tôi", objectiveEn: "Express one interest, one strength and one goal.", objectiveVi: "Diễn đạt một sở thích, một điểm mạnh và một mục tiêu.", careerCompassFocus: "Identity, agency and direction", masteryEnglishFocus: "I am interested in… / I am good at… / I want to…" },
      { code: "U02", unitNumber: 2, titleEn: "Choices & Reasons", titleVi: "Lựa chọn & Lý do", objectiveEn: "Compare choices and explain a reason.", objectiveVi: "So sánh lựa chọn và giải thích một lý do.", careerCompassFocus: "Decision-making and reflection", masteryEnglishFocus: "I prefer… because… / Another choice is…" },
    ],
  },
  {
    code: "EERS-ACTION-CITY",
    title: "EERS Action City",
    subtitle: "My First Sound Adventures",
    ageBand: "4–6",
    level: "Pre-A1",
    bilingual: true,
    description: "Listen, move, trace, play and build early English sound confidence through action-based learning.",
    accent: "🎧",
    units: [
      { code: "U01", unitNumber: 1, titleEn: "Hello, Action City!", titleVi: "Xin chào Action City!", objectiveEn: "Hear, repeat and respond to simple classroom action words.", objectiveVi: "Nghe, lặp lại và phản hồi các từ hành động đơn giản trong lớp học.", careerCompassFocus: "Confidence, participation and playful discovery", masteryEnglishFocus: "Listen · Move · Say · Play" },
      { code: "U02", unitNumber: 2, titleEn: "Sounds Around Me", titleVi: "Âm thanh quanh em", objectiveEn: "Notice and repeat early English sounds through movement and pictures.", objectiveVi: "Nhận biết và lặp lại âm tiếng Anh đầu đời qua vận động và hình ảnh.", careerCompassFocus: "Attention and sensory learning", masteryEnglishFocus: "Sound imitation, rhythm and simple words" },
    ],
  },
];

export function getBookCatalogItem(bookCode: string) {
  return interactiveBooks.find((book) => book.code === bookCode) ?? null;
}

export function getCatalogUnit(bookCode: string, unitCode: string): CurriculumUnit | null {
  const book = getBookCatalogItem(bookCode);
  const unit = book?.units.find((item) => item.code === unitCode);
  if (!book || !unit) return null;

  const vocabulary = book.code === "EERS-ACTION-CITY"
    ? [{ word: "listen", vi: "nghe" }, { word: "move", vi: "di chuyển" }, { word: "say", vi: "nói" }, { word: "play", vi: "chơi" }]
    : book.code === "MY-COMPASS"
      ? [{ word: "interest", vi: "sở thích" }, { word: "strength", vi: "điểm mạnh" }, { word: "goal", vi: "mục tiêu" }, { word: "choice", vi: "lựa chọn" }]
      : [{ word: "idea", vi: "ý tưởng" }, { word: "skill", vi: "kỹ năng" }, { word: "help", vi: "giúp đỡ" }, { word: "future", vi: "tương lai" }];

  return {
    bookCode: book.code,
    bookTitleEn: `${book.title} — ${book.subtitle}`,
    bookTitleVi: `${book.title} — ${book.subtitle}`,
    levelLabel: book.level,
    ageBand: book.ageBand,
    unitCode: unit.code,
    unitNumber: unit.unitNumber,
    titleEn: unit.titleEn,
    titleVi: unit.titleVi,
    objectiveEn: unit.objectiveEn,
    objectiveVi: unit.objectiveVi,
    careerCompassFocus: unit.careerCompassFocus,
    masteryEnglishFocus: unit.masteryEnglishFocus,
    activities: [
      {
        id: `${book.code}-${unit.code}-vocab`,
        code: "A01",
        activityType: "look_listen_say",
        titleEn: "Look · Listen · Say",
        titleVi: "Nhìn · Nghe · Nói",
        instructionsEn: "Tap each word to hear it, then say it aloud.",
        instructionsVi: "Chạm vào từng từ để nghe, sau đó nói thành tiếng.",
        content: { items: vocabulary },
        evidenceEligible: false,
      },
      {
        id: `${book.code}-${unit.code}-model`,
        code: "A02",
        activityType: "speaking_model",
        titleEn: "Speaking model",
        titleVi: "Mẫu nói",
        instructionsEn: "Listen, repeat, then personalize the sentence.",
        instructionsVi: "Nghe, lặp lại, sau đó thay đổi câu theo ý của em.",
        content: { model: book.code === "EERS-ACTION-CITY" ? "Listen, move, say, play!" : "My idea is important because it can help people." },
        evidenceEligible: true,
      },
      {
        id: `${book.code}-${unit.code}-check`,
        code: "A03",
        activityType: "self_check",
        titleEn: "Quick check",
        titleVi: "Kiểm tra nhanh",
        instructionsEn: "Choose the phrase that gives a reason.",
        instructionsVi: "Chọn cụm từ dùng để đưa ra lý do.",
        content: { options: ["because", "hello", "blue"], answer: "because" },
        evidenceEligible: false,
      },
    ],
  };
}

export type UnitLocale = "en" | "vi";

export type VocabularyItem = {
  en: string;
  vi: string;
};

type ChoiceActivity = {
  type: "choice";
  prompt: string;
  options: string[];
  answer: string;
  success?: string;
};

type AgeActivity = {
  type: "age";
  prompt: string;
};

type SequenceActivity = {
  type: "sequence";
  prompt: string;
  items: string[];
  answer: string[];
};

type BuildActivity = {
  type: "build";
  prompt: string;
  pieces: string[];
  answer: string[];
};

type ColorActivity = {
  type: "color";
  prompt: string;
  items: Array<{ label: string; color: string }>;
};

type PairActivity = {
  type: "pair";
  prompt: string;
  leftLabel: string;
  leftOptions: string[];
  rightLabel: string;
  rightOptions: string[];
};

type CheckpointActivity = {
  type: "checkpoint";
  prompt: string;
  questions: Array<{ q: string; options: string[]; answer: string }>;
};

export type LessonActivity =
  | ChoiceActivity
  | AgeActivity
  | SequenceActivity
  | BuildActivity
  | ColorActivity
  | PairActivity
  | CheckpointActivity;

export type UnitLesson = {
  id: number;
  week: number;
  title: string;
  viTitle: string;
  canDo: string;
  vocab: VocabularyItem[];
  model: string[];
  rhythm: string;
  mission: string;
  practice: string[];
  reflection: string;
  activity: LessonActivity;
};

export const unit1Lessons: UnitLesson[] = [
  {
    id: 1,
    week: 1,
    title: "Hello team",
    viTitle: "Xin chào các bạn",
    canDo: "I can greet a partner and give a first name with a model.",
    vocab: [
      { en: "hello", vi: "xin chào" },
      { en: "goodbye", vi: "tạm biệt" },
      { en: "name", vi: "tên" },
      { en: "friend", vi: "bạn" }
    ],
    model: ["Hello! I'm Mai.", "Hello! I'm Ben.", "What's your name?", "I'm Ben."],
    rhythm: "HEL-lo / I'm Mai / I'm Ben",
    mission: "Make your badge. Greet two friends. Ask their names.",
    practice: ["I'm ___.", "Hello, ___."],
    reflection: "I felt confident when…",
    activity: {
      type: "choice",
      prompt: "A new friend says, ‘Hello! I’m Mai.’ What is the best reply?",
      options: ["Hello! I'm Ben.", "Stand up.", "A pencil, please."],
      answer: "Hello! I'm Ben.",
      success: "Great greeting! You listened and responded."
    }
  },
  {
    id: 2,
    week: 1,
    title: "My age and my voice",
    viTitle: "Tuổi của em",
    canDo: "I can give name and age in two short phrases.",
    vocab: [
      { en: "seven", vi: "bảy" },
      { en: "eight", vi: "tám" },
      { en: "nine", vi: "chín" },
      { en: "ten", vi: "mười" },
      { en: "eleven", vi: "mười một" },
      { en: "twelve", vi: "mười hai" }
    ],
    model: ["What's your name?", "I'm Ben.", "I'm eight years old.", "I'm ten years old."],
    rhythm: "Hello / I'm eight / I'm ten",
    mission: "Ask two friends their names. Show an age number and say your age.",
    practice: ["I'm ___.", "I'm ___ years old."],
    reflection: "I felt confident when…",
    activity: { type: "age", prompt: "Choose an age and build your sentence." }
  },
  {
    id: 3,
    week: 2,
    title: "Listen and move",
    viTitle: "Lắng nghe và làm theo",
    canDo: "I can follow four classroom instructions.",
    vocab: [
      { en: "stand up", vi: "đứng lên" },
      { en: "sit down", vi: "ngồi xuống" },
      { en: "listen", vi: "lắng nghe" },
      { en: "look", vi: "nhìn" },
      { en: "stop", vi: "dừng lại" }
    ],
    model: ["Stand up.", "Look. Listen.", "Sit down.", "Stop."],
    rhythm: "s / a / t / s-a-t: sat",
    mission: "Give two instructions. Your partner acts. Change roles.",
    practice: ["Stand ___.", "Sit ___."],
    reflection: "I felt confident when…",
    activity: {
      type: "sequence",
      prompt: "Tap the classroom instructions in this order: Stand up → Look → Listen → Sit down.",
      items: ["Listen", "Sit down", "Stand up", "Look"],
      answer: ["Stand up", "Look", "Listen", "Sit down"]
    }
  },
  {
    id: 4,
    week: 2,
    title: "Please help me",
    viTitle: "Nhờ giúp đỡ một cách lịch sự",
    canDo: "I can request an item and ask for help.",
    vocab: [
      { en: "pencil", vi: "bút chì" },
      { en: "book", vi: "sách" },
      { en: "bag", vi: "cặp" },
      { en: "please", vi: "làm ơn" },
      { en: "help", vi: "giúp đỡ" }
    ],
    model: ["A pencil, please.", "Here you are.", "Thank you.", "Help, please."],
    rhythm: "p / i / n / pin / pan / tap",
    mission: "Use a pencil, book and bag. Ask for two things. Change roles.",
    practice: ["A ___, please.", "Thank ___."],
    reflection: "I felt confident when…",
    activity: {
      type: "build",
      prompt: "Build the polite request.",
      pieces: ["please.", "A", "book,"],
      answer: ["A", "book,", "please."]
    }
  },
  {
    id: 5,
    week: 3,
    title: "Colors around me",
    viTitle: "Màu sắc quanh em",
    canDo: "I can identify four colors and describe an object.",
    vocab: [
      { en: "red", vi: "đỏ" },
      { en: "blue", vi: "xanh dương" },
      { en: "green", vi: "xanh lá" },
      { en: "yellow", vi: "vàng" }
    ],
    model: ["It's a red book.", "It's a blue bag.", "It's a green pencil.", "It's a yellow pencil."],
    rhythm: "m / b / mat / bat",
    mission: "Point to three colored things. Say a color and an object. Your partner finds them.",
    practice: ["It's ___.", "A ___ bag."],
    reflection: "I felt confident when…",
    activity: {
      type: "color",
      prompt: "Match the book, bag and pencils to the colors from the lesson.",
      items: [
        { label: "book", color: "red" },
        { label: "bag", color: "blue" },
        { label: "pencil 1", color: "green" },
        { label: "pencil 2", color: "yellow" }
      ]
    }
  },
  {
    id: 6,
    week: 3,
    title: "Feelings and choices",
    viTitle: "Cảm xúc và sở thích",
    canDo: "I can say how I feel and choose a preferred activity.",
    vocab: [
      { en: "happy", vi: "vui" },
      { en: "sad", vi: "buồn" },
      { en: "tired", vi: "mệt" },
      { en: "drawing", vi: "vẽ" },
      { en: "games", vi: "trò chơi" }
    ],
    model: ["I'm happy.", "I'm tired.", "I like drawing.", "I like games."],
    rhythm: "d / dad / bad / sad",
    mission: "Choose a face and an activity. Tell your partner. You may use an invented character.",
    practice: ["I'm ___.", "I like ___."],
    reflection: "I felt confident when…",
    activity: {
      type: "pair",
      prompt: "Make a feelings-and-choice sentence pair.",
      leftLabel: "I feel…",
      leftOptions: ["happy", "sad", "tired"],
      rightLabel: "I like…",
      rightOptions: ["drawing", "games"]
    }
  },
  {
    id: 7,
    week: 4,
    title: "My first introduction",
    viTitle: "Lời giới thiệu đầu tiên",
    canDo: "I can combine name, age, feeling and preference with prompts.",
    vocab: [
      { en: "hello", vi: "xin chào" },
      { en: "name", vi: "tên" },
      { en: "age", vi: "tuổi" },
      { en: "like", vi: "thích" }
    ],
    model: ["Hello! I'm Mai.", "I'm eight years old.", "I'm happy.", "I like drawing."],
    rhythm: "sat / pin / mat / pause between ideas",
    mission: "Draw three clues about yourself. Use them to introduce yourself to two friends.",
    practice: ["I'm ___.", "I'm ___ years old.", "I like ___."],
    reflection: "I felt confident when…",
    activity: {
      type: "sequence",
      prompt: "Build Mai’s introduction in the correct order.",
      items: ["I'm eight years old.", "I like drawing.", "Hello! I'm Mai."],
      answer: ["Hello! I'm Mai.", "I'm eight years old.", "I like drawing."]
    }
  },
  {
    id: 8,
    week: 4,
    title: "Checkpoint one welcome club",
    viTitle: "Trạm ôn tập một",
    canDo: "I can use greetings, instructions and a simple request in a short exchange.",
    vocab: [
      { en: "hello", vi: "xin chào" },
      { en: "please", vi: "làm ơn" },
      { en: "blue", vi: "xanh dương" },
      { en: "happy", vi: "vui" }
    ],
    model: ["Hello! I'm Ben.", "I'm ten years old.", "A book, please.", "Here you are."],
    rhythm: "Review: s a t p i n m b d",
    mission: "Visit a friend. Greet, ask a name and request an item. Change roles.",
    practice: ["I'm ___.", "A ___, please."],
    reflection: "I felt confident when…",
    activity: {
      type: "checkpoint",
      prompt: "Show what you know. Four quick checks!",
      questions: [
        { q: "What can you say when you meet a new friend?", options: ["Hello!", "Stop.", "Blue."], answer: "Hello!" },
        { q: "Which instruction means ‘đứng lên’?", options: ["Sit down", "Stand up", "Listen"], answer: "Stand up" },
        { q: "Which request is polite?", options: ["Book!", "A book, please.", "Give book."], answer: "A book, please." },
        { q: "Which sentence describes a feeling?", options: ["I'm happy.", "I'm ten years old.", "I'm Ben."], answer: "I'm happy." }
      ]
    }
  }
];

export const unit1Meta = {
  code: "U01",
  title: "My Voice & Strengths",
  viTitle: "Tiếng nói và điểm mạnh của em",
  weeks: 4,
  lessons: unit1Lessons.length
};

export type LessonActivity =
  | { type: 'choice'; prompt: string; options: string[]; answer: string; success: string }
  | { type: 'age'; prompt: string }
  | { type: 'sequence'; prompt: string; items: string[]; answer: string[] }
  | { type: 'build'; prompt: string; pieces: string[]; answer: string[] }
  | { type: 'color'; prompt: string; items: { label: string; color: string }[] }
  | { type: 'pair'; prompt: string; leftLabel: string; leftOptions: string[]; rightLabel: string; rightOptions: string[] }
  | { type: 'checkpoint'; prompt: string; questions: { q: string; options: string[]; answer: string }[] }

export type Lesson = {
  id: number
  week: number
  title: string
  viTitle: string
  canDo: string
  vocab: { en: string; vi: string }[]
  model: string[]
  rhythm: string
  mission: string
  practice: string[]
  reflection: string
  activity: LessonActivity
}

export type ProgressState = {
  activated: boolean
  activationCode?: string
  nickname?: string
  completedLessons: number[]
  xp: number
  reflections: Record<number, string>
  lastLesson: number
}

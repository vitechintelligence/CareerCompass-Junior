import { getDb } from "@/lib/db";

export type CurriculumActivity = {
  id: string;
  code: string;
  activityType: string;
  titleEn: string;
  titleVi: string;
  instructionsEn: string | null;
  instructionsVi: string | null;
  content: Record<string, unknown>;
  evidenceEligible: boolean;
};

export type CurriculumUnit = {
  bookCode: string;
  bookTitleEn: string;
  bookTitleVi: string;
  levelLabel: string | null;
  ageBand: string | null;
  unitCode: string;
  unitNumber: number;
  titleEn: string;
  titleVi: string;
  objectiveEn: string | null;
  objectiveVi: string | null;
  careerCompassFocus: string | null;
  masteryEnglishFocus: string | null;
  activities: CurriculumActivity[];
};

export async function getPublishedUnit(bookCode: string, unitCode: string): Promise<CurriculumUnit | null> {
  const sql = getDb();
  const units = await sql`
    select
      b.code as book_code,
      b.title_en as book_title_en,
      b.title_vi as book_title_vi,
      b.level_label,
      b.age_band,
      bu.id as unit_id,
      bu.code as unit_code,
      bu.unit_number,
      bu.title_en,
      bu.title_vi,
      bu.objective_en,
      bu.objective_vi,
      bu.career_compass_focus,
      bu.mastery_english_focus
    from books b
    join book_units bu on bu.book_id = b.id
    where b.code = ${bookCode}
      and b.status = 'published'
      and bu.code = ${unitCode}
      and bu.status = 'published'
    limit 1
  `;

  const unit = units[0];
  if (!unit) return null;

  const activities = await sql`
    select id, code, activity_type, title_en, title_vi,
      instructions_en, instructions_vi, content, evidence_eligible
    from activities
    where unit_id = ${String(unit.unit_id)}
      and status = 'published'
    order by sort_order, code
  `;

  return {
    bookCode: String(unit.book_code),
    bookTitleEn: String(unit.book_title_en),
    bookTitleVi: String(unit.book_title_vi),
    levelLabel: unit.level_label ? String(unit.level_label) : null,
    ageBand: unit.age_band ? String(unit.age_band) : null,
    unitCode: String(unit.unit_code),
    unitNumber: Number(unit.unit_number),
    titleEn: String(unit.title_en),
    titleVi: String(unit.title_vi),
    objectiveEn: unit.objective_en ? String(unit.objective_en) : null,
    objectiveVi: unit.objective_vi ? String(unit.objective_vi) : null,
    careerCompassFocus: unit.career_compass_focus ? String(unit.career_compass_focus) : null,
    masteryEnglishFocus: unit.mastery_english_focus ? String(unit.mastery_english_focus) : null,
    activities: activities.map((item) => ({
      id: String(item.id),
      code: String(item.code),
      activityType: String(item.activity_type),
      titleEn: String(item.title_en),
      titleVi: String(item.title_vi),
      instructionsEn: item.instructions_en ? String(item.instructions_en) : null,
      instructionsVi: item.instructions_vi ? String(item.instructions_vi) : null,
      content: (item.content || {}) as Record<string, unknown>,
      evidenceEligible: item.evidence_eligible === true,
    })),
  };
}

export async function listPublishedUnits(bookCode: string) {
  const sql = getDb();
  return sql`
    select bu.code, bu.unit_number, bu.title_en, bu.title_vi
    from book_units bu
    join books b on b.id = bu.book_id
    where b.code = ${bookCode}
      and b.status = 'published'
      and bu.status = 'published'
    order by bu.sort_order, bu.unit_number
  `;
}

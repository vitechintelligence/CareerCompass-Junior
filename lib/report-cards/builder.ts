import {
  reportCardPreset,
  type ReportCardField,
  type ReportCardSection,
  type ReportCardTemplateSchema,
} from "./templates";

export type ReportCardBuilderAnswers = {
  countryCode: string;
  educationLevel: string;
  startMode: "country_template" | "vitech_template" | "blank" | "remix" | "school_import" | "ai_builder";
  schoolName?: string;
  title?: string;
  languages?: string[];
  academicPeriods?: string[];
  gradingScale?: string;
  subjects?: string[];
  includeConduct?: boolean;
  includeCompetencies?: boolean;
  requiredSignatures?: string[];
  printNotes?: string;
  additionalRequirements?: string;
};

export const REPORT_CARD_BUILDER_QUESTIONS = [
  { key: "countryCode", question: "Which country or regulatory framework does your school follow?", why: "This chooses the starting structure only; the school remains the authority." },
  { key: "educationLevel", question: "Which education level or grade range is this report card for?", why: "Different levels have different required result and signature sections." },
  { key: "startMode", question: "Do you want to start from a country template, ViTech template, your existing school form, or a blank page?", why: "Existing school/government formats should be preserved when mandated." },
  { key: "academicPeriods", question: "How does your school divide the academic year?", why: "Examples: Semester I/II, terms, quarters, or a custom calendar." },
  { key: "gradingScale", question: "How are learning results recorded?", why: "Scores, achievement levels, letter grades, descriptors, or a mixed system." },
  { key: "subjects", question: "Which subjects or learning areas must appear?", why: "The school can use government lists or its own approved curriculum." },
  { key: "includeConduct", question: "Do you report conduct/training/behavior separately?", why: "This must follow school and jurisdiction rules, not AI preference." },
  { key: "includeCompetencies", question: "Do you report competencies, qualities, skills or standards separately?", why: "Useful for competency-based systems and Vietnam primary reporting." },
  { key: "requiredSignatures", question: "Whose approval or signatures are required?", why: "Teacher, homeroom teacher, principal, guardian, registrar, etc." },
  { key: "languages", question: "Which language(s) should the printed report support?", why: "Templates can be monolingual or bilingual without changing the underlying data." },
  { key: "printNotes", question: "What must be preserved in print?", why: "A4, portrait/landscape, school seal, photo, page numbering and other requirements." },
  { key: "additionalRequirements", question: "What else must the builder not miss?", why: "This is where the school states its own mandated or internal requirements." },
] as const;

function cleanList(values: string[] | undefined, limit = 80) {
  return (values || []).map((value) => String(value).trim().slice(0, 160)).filter(Boolean).slice(0, limit);
}

function periodColumns(periods: string[]) {
  return periods.map((label, index) => ({ key: "period_" + String(index + 1), label }));
}

export function buildReportCardDraft(answers: ReportCardBuilderAnswers): ReportCardTemplateSchema {
  const country = String(answers.countryCode || "CUSTOM").trim().toUpperCase().slice(0, 8);
  const level = String(answers.educationLevel || "custom").trim().slice(0, 80);
  const source = answers.startMode === "vitech_template" || answers.startMode === "blank"
    ? reportCardPreset("CUSTOM", "custom")
    : reportCardPreset(country, level);

  const draft = structuredClone(source) as ReportCardTemplateSchema;
  draft.templateKey = country.toLowerCase() + "-" + level.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-draft";
  draft.countryCode = country;
  draft.educationLevel = level;
  draft.title = String(answers.title || draft.title).trim().slice(0, 200);
  draft.language = cleanList(answers.languages, 5).length ? cleanList(answers.languages, 5) : draft.language;

  const periods = cleanList(answers.academicPeriods, 12);
  const subjects = cleanList(answers.subjects, 80);
  const signatures = cleanList(answers.requiredSignatures, 12);

  if (periods.length) {
    const resultsSection = draft.sections.find((section) => section.key === "subject_results" || section.key === "results");
    const table = resultsSection?.fields.find((field) => field.type === "table");
    if (table) table.columns = [{ key: "subject", label: country === "VN" ? "Môn học/Hoạt động giáo dục" : "Subject / Learning area" }, ...periodColumns(periods), { key: "comment", label: country === "VN" ? "Nhận xét" : "Comment" }];
  }

  if (subjects.length) {
    draft.sections.push({
      key: "school_subject_configuration",
      title: country === "VN" ? "Danh mục môn học của nhà trường" : "School subject configuration",
      fields: [{
        key: "configured_subjects",
        label: subjects.join(" · "),
        type: "text",
      }],
    });
  }

  if (answers.gradingScale) {
    draft.sections.push({
      key: "grading_scale_note",
      title: country === "VN" ? "Thang đánh giá" : "Grading scale",
      fields: [{ key: "grading_scale", label: String(answers.gradingScale).slice(0, 1000), type: "text" }],
    });
  }

  if (answers.includeConduct && !draft.sections.some((section) => section.key === "training_learning")) {
    draft.sections.push({
      key: "conduct",
      title: country === "VN" ? "Rèn luyện/Hạnh kiểm" : "Conduct / Training",
      fields: [{ key: "conduct_result", label: country === "VN" ? "Kết quả rèn luyện" : "Conduct result", type: "text" }],
    });
  }

  if (answers.includeCompetencies && !draft.sections.some((section) => section.key === "competencies")) {
    draft.sections.push({
      key: "competencies",
      title: country === "VN" ? "Năng lực và phẩm chất" : "Competencies / Skills",
      fields: [{ key: "competency_results", label: country === "VN" ? "Kết quả năng lực/phẩm chất" : "Competency results", type: "table", columns: [{ key: "item", label: "Item" }, { key: "result", label: "Result" }, { key: "comment", label: "Comment" }] }],
    });
  }

  if (signatures.length) {
    draft.sections.push({
      key: "school_required_signatures",
      title: country === "VN" ? "Xác nhận theo yêu cầu nhà trường" : "School-required approvals",
      fields: signatures.map((label, index): ReportCardField => ({
        key: "signature_" + String(index + 1),
        label,
        type: "signature",
      })),
    });
  }

  if (answers.printNotes || answers.additionalRequirements || answers.schoolName) {
    draft.sections.push({
      key: "builder_requirements",
      title: "Institution configuration",
      fields: [
        ...(answers.schoolName ? [{ key: "configured_school_name", label: String(answers.schoolName).slice(0, 200), type: "text" as const }] : []),
        ...(answers.printNotes ? [{ key: "print_requirements", label: String(answers.printNotes).slice(0, 1000), type: "text" as const }] : []),
        ...(answers.additionalRequirements ? [{ key: "additional_requirements", label: String(answers.additionalRequirements).slice(0, 2000), type: "text" as const }] : []),
      ],
    });
  }

  draft.sourceNote += " Generated/remixed draft requires school-admin review and activation.";
  return draft;
}

const FIELD_TYPES = new Set(["text","date","number","select","signature","table","photo"]);

export function sanitizeAiReportCardTemplate(value: unknown, fallback: ReportCardTemplateSchema) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const input = value as Record<string, unknown>;
  const sections: ReportCardSection[] = [];
  for (const rawSection of Array.isArray(input.sections) ? input.sections.slice(0, 30) : []) {
    if (!rawSection || typeof rawSection !== "object" || Array.isArray(rawSection)) continue;
    const section = rawSection as Record<string, unknown>;
    const fields: ReportCardField[] = [];
    for (const rawField of Array.isArray(section.fields) ? section.fields.slice(0, 80) : []) {
      if (!rawField || typeof rawField !== "object" || Array.isArray(rawField)) continue;
      const field = rawField as Record<string, unknown>;
      const type = String(field.type || "text");
      if (!FIELD_TYPES.has(type)) continue;
      const columns = Array.isArray(field.columns)
        ? field.columns.slice(0, 20).map((column, index) => {
            const row = column && typeof column === "object" && !Array.isArray(column) ? column as Record<string, unknown> : {};
            return { key: String(row.key || "column_" + index).slice(0, 80), label: String(row.label || "Column").slice(0, 160) };
          })
        : undefined;
      fields.push({
        key: String(field.key || "field_" + fields.length).slice(0, 100),
        label: String(field.label || "Field").slice(0, 200),
        type: type as ReportCardField["type"],
        required: Boolean(field.required),
        options: Array.isArray(field.options) ? field.options.map(String).slice(0, 40) : undefined,
        columns,
      });
    }
    if (fields.length) sections.push({
      key: String(section.key || "section_" + sections.length).slice(0, 100),
      title: String(section.title || "Section").slice(0, 200),
      fields,
    });
  }
  if (!sections.length) return fallback;

  return {
    ...fallback,
    title: String(input.title || fallback.title).slice(0, 200),
    subtitle: input.subtitle ? String(input.subtitle).slice(0, 300) : fallback.subtitle,
    orientation: input.orientation === "landscape" ? "landscape" : "portrait",
    sections,
    sourceNote: fallback.sourceNote + " AI-assisted draft; institution approval is required.",
  } satisfies ReportCardTemplateSchema;
}

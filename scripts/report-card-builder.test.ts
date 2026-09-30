import test from "node:test";
import assert from "node:assert/strict";
import { buildReportCardDraft, sanitizeAiReportCardTemplate } from "../lib/report-cards/builder";
import { reportCardPreset } from "../lib/report-cards/templates";

test("Vietnam lower-secondary preset preserves school-report structure", () => {
  const preset = reportCardPreset("VN", "lower_secondary");
  assert.equal(preset.countryCode, "VN");
  assert.equal(preset.title, "HỌC BẠ TRUNG HỌC CƠ SỞ");
  assert.equal(preset.sections.some((section) => section.key === "subject_results"), true);
  assert.equal(preset.sections.some((section) => section.key === "training_learning"), true);
});

test("School answers remix the draft without changing institution authority", () => {
  const draft = buildReportCardDraft({
    countryCode: "VN",
    educationLevel: "lower_secondary",
    startMode: "ai_builder",
    schoolName: "Test School",
    languages: ["vi","en"],
    academicPeriods: ["Học kỳ I","Học kỳ II","Cả năm"],
    gradingScale: "School supplied scale",
    subjects: ["Toán","Ngữ văn","Tiếng Anh"],
    includeConduct: true,
    includeCompetencies: false,
    requiredSignatures: ["Giáo viên chủ nhiệm","Hiệu trưởng"],
  });
  assert.deepEqual(draft.language, ["vi","en"]);
  assert.match(draft.sourceNote, /school-admin review|institution approval/i);
  assert.equal(draft.sections.some((section) => section.key === "school_required_signatures"), true);
});

test("AI template sanitizer rejects arbitrary field types", () => {
  const fallback = reportCardPreset("VN", "primary");
  const schema = sanitizeAiReportCardTemplate({
    title: "Draft",
    sections: [{
      key: "test",
      title: "Test",
      fields: [
        { key: "safe", label: "Safe", type: "text" },
        { key: "bad", label: "Bad", type: "script" },
      ],
    }],
  }, fallback);
  assert.equal(schema.sections.length, 1);
  assert.equal(schema.sections[0].fields.length, 1);
  assert.equal(schema.sections[0].fields[0].key, "safe");
});

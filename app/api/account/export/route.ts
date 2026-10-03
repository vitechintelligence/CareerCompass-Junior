import { NextResponse } from "next/server";
import { AuthorizationError, requireActiveProfile } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
  let profile;
  try {
    profile = await requireActiveProfile(["student"]);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    return NextResponse.json({ error: error.code }, {
      status: error.status,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  if (!isRiskyFeatureEnabled("learnerDataExport")) {
    return NextResponse.json({ error: "learner_data_export_disabled" }, {
      status: 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  const sql = getDb();

  const [
    memberships,
    classMemberships,
    enrollments,
    progress,
    activityAttempts,
    submissions,
    revisions,
    feedback,
    assessments,
    capsules,
    consents,
  ] = await Promise.all([
    sql`
      select om.organization_id, o.name as organization_name, om.role, om.status, om.joined_at
      from organization_memberships om
      join organizations o on o.id=om.organization_id
      where om.profile_id=${profile.id}
      order by om.joined_at
    `,
    sql`
      select cm.class_id, c.name as class_name, cm.status, cm.joined_at
      from class_memberships cm
      join classes c on c.id=cm.class_id
      where cm.student_id=${profile.id}
      order by cm.joined_at
    `,
    sql`
      select se.id, b.code as book_code, b.title_en, se.class_id, se.status, se.enrolled_at, se.completed_at
      from student_enrollments se
      join books b on b.id=se.book_id
      where se.student_id=${profile.id}
      order by se.enrolled_at
    `,
    sql`
      select bp.enrollment_id, bu.code as unit_code, bp.completion_percent, bp.status, bp.last_activity_at
      from book_progress bp
      join student_enrollments se on se.id=bp.enrollment_id
      join book_units bu on bu.id=bp.unit_id
      where se.student_id=${profile.id}
      order by bp.last_activity_at
    `,
    sql`
      select aa.id, a.code as activity_code, aa.enrollment_id, aa.attempt_number,
        aa.score, aa.completion_status, aa.activity_content_version,
        aa.contract_version, aa.submitted_at
      from activity_attempts aa
      join activities a on a.id=aa.activity_id
      where aa.student_id=${profile.id}
      order by aa.submitted_at
    `,
    sql`
      select s.id, s.assignment_id, a.title_en, s.status, s.current_revision, s.submitted_at, s.updated_at
      from submissions s
      join assignments a on a.id=s.assignment_id
      where s.student_id=${profile.id}
      order by s.updated_at
    `,
    sql`
      select sr.id, sr.submission_id, sr.revision_number, sr.response, sr.submitted_at
      from submission_revisions sr
      join submissions s on s.id=sr.submission_id
      where s.student_id=${profile.id}
      order by sr.submitted_at
    `,
    sql`
      select tf.submission_id, tf.submission_revision_id, tf.feedback_text, tf.score, tf.created_at
      from teacher_feedback tf
      join submissions s on s.id=tf.submission_id
      where s.student_id=${profile.id}
        and tf.visibility='student'
      order by tf.created_at
    `,
    sql`
      select aa.id, aa.assessment_id, a.title_en, aa.attempt_number, aa.status,
        aa.score, aa.max_score, aa.evidence_level, aa.submitted_at, aa.reviewed_at,
        aa.review_feedback
      from assessment_attempts aa
      join assessments a on a.id=aa.assessment_id
      where aa.student_id=${profile.id}
      order by aa.submitted_at
    `,
    sql`
      select semantic_id, source_type, title_en, title_vi, evidence_summary,
        skill_tags, mastery_level, status, sharing_scope, achieved_on,
        verified_at, created_at
      from learning_capsules
      where learner_id=${profile.id}
      order by created_at
    `,
    sql`
      select organization_id, consent_type, status, learner_confirmation,
        guardian_confirmation, policy_version, captured_at, revoked_at
      from learner_consent_records
      where learner_id=${profile.id}
      order by captured_at
    `,
  ]);

  const schema=await sql`select to_regclass('public.optional_processing_consents') is not null as privacy_ready,
    to_regclass('public.privacy_rights_requests') is not null as rights_ready,
    to_regclass('public.ai_tutor_sessions') is not null as ai_ready`;
  const optionalConsentRecords=schema[0]?.privacy_ready?await sql`select organization_id,purpose,policy_version,
    learner_signed_at,representative_signed_at,withdrawn_at from optional_processing_consents where learner_id=${profile.id}`:[];
  const privacyRequests=schema[0]?.rights_ready?await sql`select organization_id,request_type,status,created_at,updated_at
    from privacy_rights_requests where learner_id=${profile.id}`:[];
  const aiLearningRecords=schema[0]?.ai_ready?await sql`select session.organization_id,session.lesson_mode,session.status,
    message.role,message.content,message.pedagogical_state,message.created_at
    from ai_tutor_sessions session join ai_tutor_messages message on message.session_id=session.id
    where session.learner_id=${profile.id} order by message.created_at`:[];

  const payload = {
    exportedAt: new Date().toISOString(),
    product: "Career Compass Junior",
    profile: {
      id: profile.id,
      semanticId: profile.semantic_id,
      displayName: profile.display_name,
      preferredLocale: profile.preferred_locale,
      accountType: profile.account_type,
      status: profile.status,
    },
    memberships,
    classMemberships,
    enrollments,
    progress,
    activityAttempts,
    submissions,
    revisions,
    feedback,
    assessmentAttempts: assessments,
    learningEvidence: capsules,
    consentRecords: consents,
    optionalConsentRecords,
    privacyRequests,
    aiLearningRecords,
    scopeNote: "This is a CCJ educational-record export. Auth records, processor logs, backups, original provider files and institutional confidential records require a separate verified access review. AI and governance records are included only when their schema is available.",
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="career-compass-junior-data-${profile.semantic_id}.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

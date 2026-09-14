-- Additive initial schema. Apply once with a migration-owner connection.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS cc_private;
REVOKE ALL ON SCHEMA cc_private FROM PUBLIC;
DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='cc_runtime') THEN
  CREATE ROLE cc_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
 END IF;
 EXECUTE format('GRANT cc_runtime TO %I',current_user);
END $$;
CREATE TABLE IF NOT EXISTS cc_private.schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.organizations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(name) BETWEEN 2 AND 160),
 slug text UNIQUE NOT NULL CHECK(slug ~ '^[a-z0-9-]{3,48}$'),
 kind text NOT NULL CHECK(kind IN('school','center','organization')), locale text NOT NULL DEFAULT 'vi-VN' CHECK(locale IN('vi-VN','en-PH')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cc_private.identities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations,
 semantic_id text UNIQUE NOT NULL, username text NOT NULL CHECK(username ~ '^[a-z0-9._-]{3,48}$'),
 role text NOT NULL CHECK(role IN('student','teacher','partner_admin','platform_support','content_editor')),
 active boolean NOT NULL DEFAULT true, UNIQUE(organization_id,username), UNIQUE(id,organization_id)
);
CREATE TABLE public.users(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
 role text NOT NULL CHECK(role IN('student','teacher','partner_admin','platform_support','content_editor')),
 semantic_id text UNIQUE NOT NULL, locale text NOT NULL DEFAULT 'vi-VN' CHECK(locale IN('vi-VN','en-PH')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(id,organization_id) REFERENCES cc_private.identities(id,organization_id)
);
CREATE TABLE cc_private.student_credentials(
 student_id uuid PRIMARY KEY REFERENCES cc_private.identities, password_hash text NOT NULL CHECK(password_hash ~ '^\$2[aby]\$'),
 activated boolean NOT NULL DEFAULT false, activation_hash text UNIQUE, activation_expires_at timestamptz,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cc_private.staff_credentials(
 user_id uuid PRIMARY KEY REFERENCES cc_private.identities, password_hash text NOT NULL CHECK(password_hash ~ '^\$2[aby]\$'),
 activated boolean NOT NULL DEFAULT false, activation_hash text UNIQUE, activation_expires_at timestamptz
);
CREATE TABLE cc_private.sessions(
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES cc_private.identities, csrf_nonce text NOT NULL,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON cc_private.sessions(user_id);
CREATE TABLE cc_private.rate_limits(key text PRIMARY KEY, attempts integer NOT NULL, window_at timestamptz NOT NULL);
CREATE TABLE cc_private.partner_invites(
 token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE TABLE public.classes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations,
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120), schedule text NOT NULL DEFAULT '',
 age_band text NOT NULL CHECK(age_band IN('4-6','7-12','13-18')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id)
);
CREATE TABLE public.class_memberships(
 organization_id uuid NOT NULL, class_id uuid NOT NULL, student_id uuid NOT NULL,
 PRIMARY KEY(class_id,student_id), FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(student_id,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.teacher_assignments(
 organization_id uuid NOT NULL, class_id uuid NOT NULL, teacher_id uuid NOT NULL,
 PRIMARY KEY(class_id,teacher_id), FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(teacher_id,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.book_catalog(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, title jsonb NOT NULL,
 subtitle jsonb NOT NULL DEFAULT '{}', age_band text NOT NULL, level text NOT NULL, cycle_weeks integer,
 expected_lessons integer, source_manifest jsonb NOT NULL DEFAULT '{}', cover_url text,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published')), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.book_units(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), book_id uuid NOT NULL REFERENCES public.book_catalog,
 ordinal integer NOT NULL CHECK(ordinal>0), title jsonb NOT NULL, skill jsonb NOT NULL DEFAULT '{}',
 UNIQUE(book_id,ordinal), UNIQUE(id,book_id)
);
CREATE TABLE public.book_lessons(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), book_id uuid NOT NULL REFERENCES public.book_catalog,
 unit_id uuid NOT NULL, ordinal integer NOT NULL CHECK(ordinal>0), title jsonb NOT NULL,
 content jsonb NOT NULL, source_pages integer[] NOT NULL, adaptation_status text NOT NULL DEFAULT 'text_adapted',
 UNIQUE(book_id,ordinal), UNIQUE(id,book_id),
 FOREIGN KEY(unit_id,book_id) REFERENCES public.book_units(id,book_id)
);
CREATE TABLE public.book_pages(
 book_id uuid NOT NULL REFERENCES public.book_catalog, page_number integer NOT NULL,
 source_text text NOT NULL DEFAULT '', image_url text, PRIMARY KEY(book_id,page_number)
);
CREATE TABLE public.book_activities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), book_id uuid NOT NULL REFERENCES public.book_catalog,
 lesson_id uuid NOT NULL, ordinal integer NOT NULL, kind text NOT NULL CHECK(kind IN('choice','match','sequence','reflection','drawing','speaking','mission')),
 prompt jsonb NOT NULL, payload jsonb NOT NULL DEFAULT '{}', rubric jsonb NOT NULL DEFAULT '{}',
 required boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
 UNIQUE(lesson_id,ordinal), UNIQUE(id,book_id),
 FOREIGN KEY(lesson_id,book_id) REFERENCES public.book_lessons(id,book_id)
);
CREATE TABLE cc_private.activity_keys(
 activity_id uuid PRIMARY KEY REFERENCES public.book_activities, answer jsonb NOT NULL, version integer NOT NULL DEFAULT 1
);
CREATE TABLE public.book_enrollments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, class_id uuid NOT NULL,
 student_id uuid NOT NULL, book_id uuid NOT NULL REFERENCES public.book_catalog, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(class_id,student_id,book_id), UNIQUE(id,organization_id,student_id,class_id,book_id),
 FOREIGN KEY(class_id,student_id) REFERENCES public.class_memberships,
 FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(student_id,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.activity_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, enrollment_id uuid NOT NULL,
 student_id uuid NOT NULL, class_id uuid NOT NULL, book_id uuid NOT NULL, activity_id uuid NOT NULL,
 idempotency_key uuid NOT NULL, response jsonb NOT NULL, status text NOT NULL CHECK(status IN('practised','needs_practice','submitted')),
 correct boolean, activity_version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_id,idempotency_key), UNIQUE(id,organization_id,student_id,class_id),
 FOREIGN KEY(enrollment_id,organization_id,student_id,class_id,book_id) REFERENCES public.book_enrollments(id,organization_id,student_id,class_id,book_id),
 FOREIGN KEY(activity_id,book_id) REFERENCES public.book_activities(id,book_id)
);
CREATE TABLE public.book_progress(
 enrollment_id uuid PRIMARY KEY REFERENCES public.book_enrollments, organization_id uuid NOT NULL,
 student_id uuid NOT NULL, class_id uuid NOT NULL, book_id uuid NOT NULL, practiced_activities integer NOT NULL DEFAULT 0,
 submitted_activities integer NOT NULL DEFAULT 0, total_activities integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(enrollment_id,organization_id,student_id,class_id,book_id) REFERENCES public.book_enrollments(id,organization_id,student_id,class_id,book_id)
);
CREATE TABLE public.learning_capsules(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, student_id uuid NOT NULL,
 class_id uuid NOT NULL, attempt_id uuid UNIQUE NOT NULL, evidence_digest text NOT NULL CHECK(length(evidence_digest)=64),
 summary jsonb NOT NULL, review_status text NOT NULL DEFAULT 'unreviewed' CHECK(review_status IN('unreviewed','reviewed')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id,student_id,class_id),
 FOREIGN KEY(attempt_id,organization_id,student_id,class_id) REFERENCES public.activity_attempts(id,organization_id,student_id,class_id)
);
CREATE TABLE public.attendance(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, class_id uuid NOT NULL, student_id uuid NOT NULL,
 session_date date NOT NULL, status text NOT NULL CHECK(status IN('present','absent','late','excused')),
 marked_by uuid NOT NULL, UNIQUE(class_id,student_id,session_date),
 FOREIGN KEY(class_id,student_id) REFERENCES public.class_memberships,
 FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(marked_by,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.assignments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, class_id uuid NOT NULL, created_by uuid NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 200), instructions jsonb NOT NULL,
 due_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id,class_id),
 FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.submissions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, class_id uuid NOT NULL, assignment_id uuid NOT NULL,
 student_id uuid NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),
 attachment_name text, attachment_mime text, attachment_bytes bytea CHECK(octet_length(attachment_bytes)<=1048576),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(assignment_id,student_id),
 FOREIGN KEY(assignment_id,organization_id,class_id) REFERENCES public.assignments(id,organization_id,class_id),
 FOREIGN KEY(class_id,student_id) REFERENCES public.class_memberships,
 FOREIGN KEY(student_id,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.teacher_feedback(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, class_id uuid NOT NULL,
 student_id uuid NOT NULL, teacher_id uuid NOT NULL, capsule_id uuid, observed_action text NOT NULL CHECK(length(observed_action) BETWEEN 2 AND 1500),
 next_step text NOT NULL CHECK(length(next_step) BETWEEN 2 AND 1500),
 skill text NOT NULL CHECK(length(skill) BETWEEN 2 AND 120), locale text NOT NULL DEFAULT 'vi-VN',
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(class_id,student_id) REFERENCES public.class_memberships,
 FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(teacher_id,organization_id) REFERENCES public.users(id,organization_id),
 FOREIGN KEY(capsule_id,organization_id,student_id,class_id) REFERENCES public.learning_capsules(id,organization_id,student_id,class_id)
);
CREATE TABLE public.payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, student_id uuid NOT NULL,
 label text NOT NULL CHECK(length(label) BETWEEN 2 AND 200), amount_vnd bigint NOT NULL CHECK(amount_vnd BETWEEN 0 AND 1000000000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','paid','void')), reference text,
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz, created_by uuid NOT NULL,
 FOREIGN KEY(student_id,organization_id) REFERENCES public.users(id,organization_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.announcements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, class_id uuid, created_by uuid NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 200), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.resources(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, class_id uuid, created_by uuid NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 200), url text NOT NULL CHECK(url ~ '^https://'),
 kind text NOT NULL CHECK(kind IN('video','document','link')), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(class_id,organization_id) REFERENCES public.classes(id,organization_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.student_notes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, student_id uuid NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120), body text NOT NULL CHECK(length(body)<=4000),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(student_id,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE public.support_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL,
 category text NOT NULL CHECK(category IN('access','learning','content','technical')),
 message text NOT NULL CHECK(length(message) BETWEEN 2 AND 2000), status text NOT NULL DEFAULT 'open',
 created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(user_id,organization_id) REFERENCES public.users(id,organization_id)
);
CREATE TABLE cc_private.audit_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, organization_id uuid, actor_id uuid,
 action text NOT NULL, object_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION cc_private.actor() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('cc.actor',true),'')::uuid $$;
CREATE FUNCTION cc_private.org() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('cc.org',true),'')::uuid $$;
CREATE FUNCTION cc_private.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('cc.role',true),'') $$;
CREATE FUNCTION cc_private.partner() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT cc_private.role()='partner_admin' $$;
CREATE FUNCTION cc_private.class_access(c uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
 SELECT EXISTS(SELECT 1 FROM public.classes cl WHERE cl.id=c AND cl.organization_id=cc_private.org() AND
 (cc_private.partner() OR EXISTS(SELECT 1 FROM public.teacher_assignments ta WHERE ta.class_id=c AND ta.teacher_id=cc_private.actor() AND cc_private.role()='teacher')
 OR EXISTS(SELECT 1 FROM public.class_memberships m WHERE m.class_id=c AND m.student_id=cc_private.actor() AND cc_private.role()='student')))
$$;
CREATE FUNCTION cc_private.teaches(c uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT cc_private.role() IN('teacher','partner_admin') AND cc_private.class_access(c)
$$;
CREATE FUNCTION cc_private.sees_student(s uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
 SELECT s=cc_private.actor() OR cc_private.partner() OR EXISTS(
 SELECT 1 FROM public.class_memberships m JOIN public.teacher_assignments t USING(class_id)
 WHERE m.student_id=s AND m.organization_id=cc_private.org() AND t.teacher_id=cc_private.actor() AND cc_private.role()='teacher')
$$;
CREATE FUNCTION cc_private.book_access(b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
 SELECT cc_private.role() IN('partner_admin','content_editor') OR EXISTS(
 SELECT 1 FROM public.book_enrollments e WHERE e.book_id=b AND e.organization_id=cc_private.org() AND e.active
 AND ((cc_private.role()='student' AND e.student_id=cc_private.actor()) OR cc_private.teaches(e.class_id)))
$$;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['organizations','users','classes','class_memberships','teacher_assignments','book_catalog','book_units','book_lessons','book_pages','book_activities','book_enrollments','activity_attempts','book_progress','learning_capsules','attendance','assignments','submissions','teacher_feedback','payments','announcements','resources','student_notes','support_requests']
 LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); END LOOP;
END $$;
CREATE POLICY org_read ON public.organizations FOR SELECT TO cc_runtime USING(id=cc_private.org());
CREATE POLICY users_read ON public.users FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND (cc_private.sees_student(id) OR id=cc_private.actor()));
CREATE POLICY classes_read ON public.classes FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND cc_private.class_access(id));
CREATE POLICY classes_write ON public.classes FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.partner());
CREATE POLICY member_read ON public.class_memberships FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND (student_id=cc_private.actor() OR cc_private.teaches(class_id)));
CREATE POLICY member_write ON public.class_memberships FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.partner() AND EXISTS(SELECT FROM public.users u WHERE u.id=student_id AND u.role='student'));
CREATE POLICY teacher_read ON public.teacher_assignments FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND (teacher_id=cc_private.actor() OR cc_private.partner()));
CREATE POLICY teacher_write ON public.teacher_assignments FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.partner() AND EXISTS(SELECT FROM public.users u WHERE u.id=teacher_id AND u.role='teacher'));
CREATE POLICY catalog_read ON public.book_catalog FOR SELECT TO cc_runtime USING(status='published' OR cc_private.role()='content_editor');
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['book_units','book_lessons','book_pages','book_activities'] LOOP
 EXECUTE format('CREATE POLICY content_read ON public.%I FOR SELECT TO cc_runtime USING(cc_private.book_access(book_id))',t);
 END LOOP;
END $$;
CREATE POLICY enroll_read ON public.book_enrollments FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND (student_id=cc_private.actor() OR cc_private.teaches(class_id)));
CREATE POLICY enroll_write ON public.book_enrollments FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.partner());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['activity_attempts','book_progress','learning_capsules','attendance','submissions','teacher_feedback'] LOOP
 EXECUTE format('CREATE POLICY evidence_read ON public.%I FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND (student_id=cc_private.actor() OR cc_private.teaches(class_id)))',t);
 END LOOP;
END $$;
CREATE POLICY attendance_write ON public.attendance FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.teaches(class_id) AND marked_by=cc_private.actor());
CREATE POLICY attendance_update ON public.attendance FOR UPDATE TO cc_runtime USING(organization_id=cc_private.org() AND cc_private.teaches(class_id)) WITH CHECK(organization_id=cc_private.org() AND cc_private.teaches(class_id) AND marked_by=cc_private.actor());
CREATE POLICY assignment_read ON public.assignments FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND cc_private.class_access(class_id));
CREATE POLICY assignment_write ON public.assignments FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.teaches(class_id) AND created_by=cc_private.actor());
CREATE POLICY submission_write ON public.submissions FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.role()='student' AND student_id=cc_private.actor() AND cc_private.class_access(class_id));
CREATE POLICY submission_update ON public.submissions FOR UPDATE TO cc_runtime USING(organization_id=cc_private.org() AND student_id=cc_private.actor() AND cc_private.role()='student') WITH CHECK(organization_id=cc_private.org() AND student_id=cc_private.actor() AND cc_private.class_access(class_id));
CREATE POLICY feedback_write ON public.teacher_feedback FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.teaches(class_id) AND teacher_id=cc_private.actor());
CREATE POLICY payments_read ON public.payments FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND cc_private.partner());
CREATE POLICY payments_write ON public.payments FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND cc_private.partner() AND created_by=cc_private.actor() AND status='pending');
CREATE POLICY payments_update ON public.payments FOR UPDATE TO cc_runtime USING(organization_id=cc_private.org() AND cc_private.partner()) WITH CHECK(organization_id=cc_private.org() AND cc_private.partner());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['announcements','resources'] LOOP
 EXECUTE format('CREATE POLICY communication_read ON public.%I FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND (class_id IS NULL OR cc_private.class_access(class_id)))',t);
 EXECUTE format('CREATE POLICY communication_write ON public.%I FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND created_by=cc_private.actor() AND (cc_private.partner() OR (class_id IS NOT NULL AND cc_private.teaches(class_id))))',t);
 END LOOP;
END $$;
CREATE POLICY notes_read ON public.student_notes FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND student_id=cc_private.actor());
CREATE POLICY notes_write ON public.student_notes FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND student_id=cc_private.actor() AND cc_private.role()='student');
CREATE POLICY support_read ON public.support_requests FOR SELECT TO cc_runtime USING(organization_id=cc_private.org() AND (user_id=cc_private.actor() OR cc_private.partner() OR cc_private.role()='platform_support'));
CREATE POLICY support_write ON public.support_requests FOR INSERT TO cc_runtime WITH CHECK(organization_id=cc_private.org() AND user_id=cc_private.actor());
CREATE INDEX ON public.class_memberships(student_id);
CREATE INDEX ON public.teacher_assignments(teacher_id);
CREATE INDEX ON public.book_enrollments(student_id,book_id);
CREATE INDEX ON public.activity_attempts(enrollment_id,activity_id);
CREATE INDEX ON public.learning_capsules(organization_id,class_id,created_at);
CREATE INDEX ON public.teacher_feedback(organization_id,class_id,student_id);
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA cc_private FROM PUBLIC,cc_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cc_private FROM PUBLIC;
GRANT USAGE ON SCHEMA public,cc_private TO cc_runtime;
GRANT SELECT ON public.organizations,public.users,public.classes,public.class_memberships,public.teacher_assignments,public.book_catalog,public.book_units,public.book_lessons,public.book_pages,public.book_activities,public.book_enrollments,public.activity_attempts,public.book_progress,public.learning_capsules,public.attendance,public.assignments,public.submissions,public.teacher_feedback,public.payments,public.announcements,public.resources,public.student_notes,public.support_requests TO cc_runtime;
GRANT INSERT ON public.classes,public.class_memberships,public.teacher_assignments,public.book_enrollments,public.attendance,public.assignments,public.submissions,public.teacher_feedback,public.payments,public.announcements,public.resources,public.student_notes,public.support_requests TO cc_runtime;
GRANT UPDATE(status,marked_by) ON public.attendance TO cc_runtime;
GRANT UPDATE(body,attachment_name,attachment_mime,attachment_bytes,created_at) ON public.submissions TO cc_runtime;
GRANT EXECUTE ON FUNCTION cc_private.actor(),cc_private.org(),cc_private.role(),cc_private.partner(),cc_private.class_access(uuid),cc_private.teaches(uuid),cc_private.sees_student(uuid),cc_private.book_access(uuid) TO cc_runtime;
INSERT INTO cc_private.schema_migrations(version) VALUES('001');

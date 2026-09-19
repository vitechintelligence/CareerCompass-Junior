-- Student learning isolation guardrails
-- 2026-09-19

create unique index if not exists uq_student_enrollments_personal_book
  on student_enrollments(student_id, book_id)
  where class_id is null;

create or replace function enforce_active_student_profile()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1
    from profiles
    where id = new.student_id
      and account_type = 'student'
      and status = 'active'
  ) then
    raise exception 'student_id must reference an active student profile';
  end if;
  return new;
end;
$$;

drop trigger if exists student_enrollments_require_student on student_enrollments;
create trigger student_enrollments_require_student
before insert or update of student_id on student_enrollments
for each row execute function enforce_active_student_profile();

drop trigger if exists activity_attempts_require_student on activity_attempts;
create trigger activity_attempts_require_student
before insert or update of student_id on activity_attempts
for each row execute function enforce_active_student_profile();

drop trigger if exists class_memberships_require_student on class_memberships;
create trigger class_memberships_require_student
before insert or update of student_id on class_memberships
for each row execute function enforce_active_student_profile();

create or replace function enforce_active_learner_profile()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1
    from profiles
    where id = new.learner_id
      and account_type = 'student'
      and status = 'active'
  ) then
    raise exception 'learner_id must reference an active student profile';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_capsules_require_student on learning_capsules;
create trigger learning_capsules_require_student
before insert or update of learner_id on learning_capsules
for each row execute function enforce_active_learner_profile();

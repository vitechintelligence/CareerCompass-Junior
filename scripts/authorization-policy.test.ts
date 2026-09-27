import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isUuidReference,
  learningEnrollmentAllowsWrite,
  profileHasActiveRole,
  type LearningEnrollmentAuthorizationRow,
} from "../lib/auth/authorization-policy";

const student = { id: "student-1", account_type: "student" as const, status: "active" };

test("only active profiles satisfy protected role checks", () => {
  assert.equal(profileHasActiveRole(student, ["student"]), true);
  assert.equal(profileHasActiveRole({ ...student, status: "suspended" }, ["student"]), false);
  assert.equal(profileHasActiveRole({ ...student, status: "archived" }, ["student"]), false);
  assert.equal(profileHasActiveRole(student, ["teacher"]), false);
  assert.equal(profileHasActiveRole(null, ["student"]), false);
});

test("resource identifiers must be canonical UUID references", () => {
  assert.equal(isUuidReference("4bb2be6a-fd0c-4dd1-8840-8f7ca9df0f35"), true);
  assert.equal(isUuidReference("not-a-uuid"), false);
  assert.equal(isUuidReference("../other-class"), false);
  assert.equal(isUuidReference(null), false);
});

const personal: LearningEnrollmentAuthorizationRow = {
  id: "4bb2be6a-fd0c-4dd1-8840-8f7ca9df0f35",
  student_id: "student-1",
  book_id: "book-1",
  status: "active",
  class_id: null,
  organization_id: null,
  class_status: null,
  organization_status: null,
  class_membership_status: null,
  organization_membership_status: null,
  organization_membership_role: null,
};

test("personal learning enrollment is isolated to the exact learner and book", () => {
  assert.equal(learningEnrollmentAllowsWrite(personal, {
    studentId: "student-1", bookId: "book-1", enrollmentId: personal.id,
  }), true);
  assert.equal(learningEnrollmentAllowsWrite(personal, {
    studentId: "student-2", bookId: "book-1", enrollmentId: personal.id,
  }), false);
  assert.equal(learningEnrollmentAllowsWrite(personal, {
    studentId: "student-1", bookId: "book-2", enrollmentId: personal.id,
  }), false);
  assert.equal(learningEnrollmentAllowsWrite(personal, {
    studentId: "student-1", bookId: "book-1", enrollmentId: "f72fb9d8-d083-458b-8d77-b0ed265caf5d",
  }), false);
  assert.equal(learningEnrollmentAllowsWrite({ ...personal, status: "paused" }, {
    studentId: "student-1", bookId: "book-1", enrollmentId: personal.id,
  }), false);
});

const classScoped: LearningEnrollmentAuthorizationRow = {
  ...personal,
  id: "a6ab5c28-c948-4cc9-8745-38d51066772d",
  class_id: "class-1",
  organization_id: "org-1",
  class_status: "active",
  organization_status: "active",
  class_membership_status: "active",
  organization_membership_status: "active",
  organization_membership_role: "student",
};

test("class learning writes require every tenant and class boundary to remain active", () => {
  const expected = { studentId: "student-1", bookId: "book-1", enrollmentId: classScoped.id };
  assert.equal(learningEnrollmentAllowsWrite(classScoped, expected), true);

  for (const blocked of [
    { ...classScoped, class_status: "archived" },
    { ...classScoped, organization_status: "paused" },
    { ...classScoped, class_membership_status: "withdrawn" },
    { ...classScoped, organization_membership_status: "inactive" },
    { ...classScoped, organization_membership_role: "teacher" },
    { ...classScoped, organization_id: null },
    { ...classScoped, status: "withdrawn" },
  ]) {
    assert.equal(learningEnrollmentAllowsWrite(blocked, expected), false);
  }
});

test("a class-scoped enrollment cannot masquerade as personal learning", () => {
  assert.equal(learningEnrollmentAllowsWrite({ ...personal, organization_id: "org-1" }, {
    studentId: "student-1", bookId: "book-1", enrollmentId: personal.id,
  }), false);
});

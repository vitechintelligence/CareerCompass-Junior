import definitions from "../../content/activities/beginner-objective.v1.json";
import { EvaluationError, evaluateObjective, parseObjectiveSubmission, validateObjectiveDefinition } from "./objective-evaluation";

// Keys remain in the server module. The embedded book only receives display/launch fields.
export const beginnerObjectives = definitions;

export function evaluateBeginnerSubmission(value: unknown) {
  const submission = parseObjectiveSubmission(value);
  const activity = beginnerObjectives.find((item) => item.activityId === submission.activityId);
  if (!activity) throw new EvaluationError("activity_not_found", 404);
  return evaluateObjective(activity, submission);
}

export function beginnerPublicActivities() {
  return beginnerObjectives.map((activity) => {
    validateObjectiveDefinition(activity);
    return {
      activityId: activity.activityId,
      activityVersion: activity.activityVersion,
      lessonId: activity.lessonId,
      objective: activity.objective,
      question: activity.question,
      options: activity.options,
      retryPolicy: activity.retryPolicy,
      completionRule: activity.completionRule,
      evidencePolicy: activity.evidencePolicy,
    };
  });
}

import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import AiQuizClient from "./AiQuizClient";

export const dynamic = "force-dynamic";

export default async function AiStudyQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ packId: string }>;
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const { packId } = await params;
  const query = await searchParams;
  const organizationId = String(query.organizationId || "");

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <strong>Professor Vi · Custom Quiz</strong>
        <Link className="pill" href="/workspace/student/ai-study">AI Study Lab</Link>
      </header>
      <div className="workspaceContent">
        <AiQuizClient organizationId={organizationId} packId={packId} />
      </div>
    </main>
  );
}

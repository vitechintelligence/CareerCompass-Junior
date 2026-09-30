import { getDb } from "@/lib/db";
import { getCurrentLtiSession } from "@/lib/lti/session";

export const dynamic = "force-dynamic";

export default async function LtiDeepLinkPage() {
  const session = await getCurrentLtiSession();
  if (!session || String(session.message_type) !== "LtiDeepLinkingRequest") {
    return <main style={{ padding: 32 }}><h1>Career Compass Junior</h1><p>This LTI deep-link session is unavailable or expired.</p></main>;
  }
  if (!["teacher","platform_admin"].includes(String(session.account_type))) {
    return <main style={{ padding: 32 }}><h1>Career Compass Junior</h1><p>An instructor LTI launch is required to select course content.</p></main>;
  }

  const sql = getDb();
  const books = await sql`
    select code, title_en, title_vi, level_label, age_band
    from books
    where status='published'
    order by title_en
    limit 100
  `;

  return (
    <main className="workspacePage">
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">LTI Deep Linking 2.0</div>
            <h1 className="workspaceHeroTitle">Add Career Compass content to your LMS</h1>
            <p className="muted">Choose a published Career Compass book. The LMS will receive a signed LTI resource link and can create a gradebook line item when supported.</p>
          </div>
          <span className="pill">{String(session.platform_name)}</span>
        </section>

        <section className="cardGrid">
          {books.map((book) => (
            <article className="card" key={String(book.code)}>
              <span className="pill">{String(book.level_label || book.age_band || "Career Compass")}</span>
              <h3>{String(book.title_en)}</h3>
              <p className="muted">{String(book.title_vi)}</p>
              <form method="post" action="/api/lti/deep-link/respond">
                <input type="hidden" name="bookCode" value={String(book.code)} />
                <button className="button primary" type="submit">Add to LMS</button>
              </form>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

import { COMMUNITY_AGREEMENT, COMMUNITY_PRIVACY_VERSION, COMMUNITY_TERMS_VERSION } from "@/lib/community-terms";
import { acceptCommunityAgreement } from "./actions";

export function CommunityAgreementPanel({
  organizationId,
  locale,
}: {
  organizationId: string;
  locale: "vi" | "en";
}) {
  const copy = COMMUNITY_AGREEMENT[locale];

  return (
    <div className="communityAgreementBackdrop" role="presentation">
      <section className="communityAgreementModal" role="dialog" aria-modal="true" aria-labelledby="community-agreement-title">
        <div className="eyebrow">{locale === "vi" ? "Cần xác nhận trước khi quản lý cộng đồng" : "Required before community management"}</div>
        <h2 id="community-agreement-title">{copy.title}</h2>
        <p>{copy.intro}</p>

        <h3>{copy.responsibilityTitle}</h3>
        <ul>{copy.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>

        <h3>{copy.vitechTitle}</h3>
        <ul>{copy.vitech.map((item) => <li key={item}>{item}</li>)}</ul>

        <h3>{copy.childTitle}</h3>
        <p>{copy.child}</p>

        <form action={acceptCommunityAgreement} className="workspaceForm">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="locale" value={locale} />
          <label className="communityCheck">
            <input type="checkbox" name="authorized" required />
            <span>{locale === "vi" ? "Tôi xác nhận mình được cơ sở giáo dục ủy quyền." : "I confirm that I am authorized by the institution."}</span>
          </label>
          <label className="communityCheck">
            <input type="checkbox" name="acceptTerms" required />
            <span>{copy.acceptance}</span>
          </label>
          <div className="muted" style={{ fontSize: 12 }}>
            Terms {COMMUNITY_TERMS_VERSION} · Privacy {COMMUNITY_PRIVACY_VERSION}
          </div>
          <button className="button primary" type="submit">{locale === "vi" ? "Ký xác nhận & tiếp tục" : "Accept & continue"}</button>
        </form>
      </section>
    </div>
  );
}

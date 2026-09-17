import Link from "next/link";
import { listIntegrationProviders } from "@/lib/integrations/catalog";

export const dynamic = "force-dynamic";

export default async function PartnerIntegrationsPage() {
  const providers = await listIntegrationProviders();
  return (
    <main className="portalPage">
      <header className="topbar"><Link className="brand" href="/workspace/partner"><span className="brandMark">CC</span><span>Partner Integrations</span></Link><Link className="pill" href="/workspace/partner">Back to Partner Portal</Link></header>
      <div className="portalShell">
        <section className="portalHero">
          <div className="portalIntro"><div className="eyebrow">Integration Adapter Layer</div><h2 style={{marginTop:10}}>Connect your existing LMS and school systems</h2><p className="lead" style={{fontSize:18}}>Career Compass keeps one normalized internal learning model while adapters translate external rosters, launches, grades and learning events.</p></div>
          <aside className="focusPanel"><span className="pill">Interoperability</span><h3 style={{fontSize:26,marginTop:18}}>LTI • OneRoster • SCORM • xAPI • REST</h3><p className="muted">Connections are organization-scoped and use external-ID mapping, sync jobs, event logs and credential references already modeled in Neon.</p></aside>
        </section>
        <section className="workspaceGrid">
          {providers.map((provider) => <article className="panel" key={provider.slug}><div className="eyebrow">{provider.category} · {provider.protocol}</div><h3 style={{marginTop:10}}>{provider.displayName}</h3><p className="muted">{provider.descriptionEn || "Available through the Career Compass integration adapter layer."}</p><div className="actions" style={{marginTop:14}}>{provider.capabilities.map((cap) => <span className="pill" key={cap}>{cap.replaceAll("_"," ")}</span>)}</div><p className="muted" style={{marginTop:14,fontSize:13}}>Status: {provider.status}</p></article>)}
        </section>
      </div>
    </main>
  );
}

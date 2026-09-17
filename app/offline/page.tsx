import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";

export default function OfflinePage() {
  return (
    <main className="offlinePage">
      <section className="offlineCard">
        <VitechMark size={56} />
        <div className="eyebrow">Career Compass Junior</div>
        <h1>You’re offline.</h1>
        <p className="muted">Your private LMS work is never served from a shared offline cache. Reconnect to continue live portal, class and learning-data actions safely.</p>
        <div className="actions">
          <Link className="button primary" href="/international">Open public home</Link>
          <Link className="button" href="/portal/student">Student portal preview</Link>
        </div>
      </section>
    </main>
  );
}

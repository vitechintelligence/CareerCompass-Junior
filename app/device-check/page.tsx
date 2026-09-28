import Link from "next/link";
import DeviceCheckClient from "./DeviceCheckClient";

export const dynamic="force-dynamic";

export default function DeviceCheckPage(){
  return <main className="workspacePage">
    <header className="topbar"><Link className="brand" href="/">Career Compass Junior</Link><strong>Device Check</strong><Link className="pill" href="/workspace">Workspace</Link></header>
    <DeviceCheckClient/>
  </main>;
}

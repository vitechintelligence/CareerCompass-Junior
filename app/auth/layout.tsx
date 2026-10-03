import { DataCaptureNotice } from "@/app/privacy/PrivacyNotice";
export default function AuthLayout({children}:{children:React.ReactNode}){
  return <><DataCaptureNotice/>{children}</>;
}

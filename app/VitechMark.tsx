import Image from "next/image";

export function VitechMark({ className = "brandMark", size = 42 }: { className?: string; size?: number }) {
  return (
    <span className={`${className} brandLogoMark`} aria-hidden="true">
      <Image src="/vitech-logo.svg" alt="" width={size} height={size} priority={size >= 40} />
    </span>
  );
}

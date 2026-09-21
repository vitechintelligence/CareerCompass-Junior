import { ImageResponse } from "next/og";

export function createVitechPwaIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          viewBox="0 0 512 512"
          aria-label="ViTech Intelligence Solutions"
        >
          <defs>
            <linearGradient id="vitechBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12a8f4" />
              <stop offset="100%" stopColor="#1357c8" />
            </linearGradient>
            <linearGradient id="vitechNavy" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0b315d" />
              <stop offset="100%" stopColor="#081f45" />
            </linearGradient>
          </defs>
          <path fill="url(#vitechNavy)" d="M72 84h368l-37 58-111 8-25 139-43-139-116-9z" />
          <path fill="url(#vitechNavy)" d="M127 181h83l108 216-46 66z" />
          <path fill="url(#vitechBlue)" d="M328 181h91l-94 196-36-78z" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=604800, immutable",
      },
    },
  );
}

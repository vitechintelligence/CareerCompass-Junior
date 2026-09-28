export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
] as const;

export type RecorderLocale = "en" | "vi";

export function chooseRecorderMime(isTypeSupported?: (mime: string) => boolean) {
  if (typeof isTypeSupported !== "function") return "";
  for (const mime of RECORDER_MIME_CANDIDATES) {
    try {
      if (isTypeSupported(mime)) return mime;
    } catch {
      // Some browsers throw for an unknown MIME string.
    }
  }
  return "";
}

export function createCompatibleMediaRecorder(
  stream: MediaStream,
  Recorder: typeof MediaRecorder = MediaRecorder,
) {
  const mimeType = chooseRecorderMime(
    typeof Recorder.isTypeSupported === "function"
      ? Recorder.isTypeSupported.bind(Recorder)
      : undefined,
  );
  return mimeType ? new Recorder(stream, { mimeType }) : new Recorder(stream);
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => {
    try { track.stop(); } catch { /* already stopped */ }
  });
}

export function microphoneErrorMessage(error: unknown, locale: RecorderLocale) {
  const name = error && typeof error === "object" && "name" in error
    ? String((error as { name?: unknown }).name || "")
    : "";
  const vi = locale === "vi";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return vi
      ? "Quyền micro đang bị chặn. Hãy cho phép micro trong cài đặt trình duyệt rồi thử lại."
      : "Microphone permission is blocked. Allow microphone access in your browser settings, then retry.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return vi
      ? "Không tìm thấy micro trên thiết bị này."
      : "No microphone was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return vi
      ? "Micro đang được ứng dụng khác sử dụng hoặc chưa sẵn sàng. Hãy đóng ứng dụng ghi âm/cuộc gọi rồi thử lại."
      : "The microphone is busy or unavailable. Close another recording/call app and retry.";
  }
  if (name === "AbortError") {
    return vi
      ? "Phiên ghi âm bị gián đoạn. Hãy thử ghi lại."
      : "Recording was interrupted. Please try again.";
  }
  return vi
    ? "Không thể mở micro. Em vẫn có thể tiếp tục bài học và thử lại sau."
    : "Microphone access was unavailable. You can continue learning and retry later.";
}

export type DeviceCapabilitySnapshot = {
  secureContext: boolean;
  mediaDevices: boolean;
  mediaRecorder: boolean;
  recorderMime: string;
  speechSynthesis: boolean;
  serviceWorker: boolean;
  online: boolean;
  standalone: boolean;
};

export function capabilitySummary(input: DeviceCapabilitySnapshot) {
  return {
    microphoneReady: input.secureContext && input.mediaDevices && input.mediaRecorder,
    speechReady: input.speechSynthesis,
    pwaReady: input.serviceWorker,
    recorderMime: input.recorderMime || "browser-default",
    online: input.online,
    standalone: input.standalone,
  };
}

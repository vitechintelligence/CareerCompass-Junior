export function speak(text: string, slow = false) {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en'
  utterance.rate = slow ? 0.72 : 0.92
  utterance.pitch = 1.03
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find((voice) => /^en(-|_)/i.test(voice.lang) && /Google|Samantha|Daniel|Microsoft|Natural/i.test(voice.name))
    || voices.find((voice) => /^en(-|_)/i.test(voice.lang))
  if (preferred) utterance.voice = preferred
  window.speechSynthesis.speak(utterance)
  return true
}

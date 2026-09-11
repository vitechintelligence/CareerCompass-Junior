import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { unit1Lessons, unitNames } from './data/unit1'
import { clearState, loadState, saveState } from './lib/db'
import { speak } from './lib/audio'
import type { Lesson, LessonActivity, ProgressState } from './types'

const DEMO_CODE = 'CCJ-DEMO-UNIT1'

type Screen = 'home' | 'journey' | 'unit' | 'lesson' | 'progress' | 'profile'

const icons = {
  discover: '🌱', communicate: '💬', collaborate: '🧑‍🤝‍🧑', create: '💡', present: '🖥️', reflect: '⭐'
}

function Logo() {
  return (
    <div className="brand" aria-label="Career Compass Junior Interactive">
      <span className="brand-mark">V</span>
      <span><strong>Career Compass</strong><b>Junior</b><small>INTERACTIVE</small></span>
    </div>
  )
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="ring" style={{ '--p': `${clamped}%` } as CSSProperties}>
      <div><strong>{Math.round(clamped)}%</strong><span>{label}</span></div>
    </div>
  )
}

function Activation({ onActivate }: { onActivate: (code: string, nickname: string) => void }) {
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('Alex')
  const [error, setError] = useState('')
  function submit(e: FormEvent) {
    e.preventDefault()
    if (code.trim().toUpperCase() !== DEMO_CODE) {
      setError(`For this proof build, use the printed-book demo code ${DEMO_CODE}.`)
      return
    }
    onActivate(code.trim().toUpperCase(), nickname.trim() || 'Explorer')
  }
  return (
    <main className="activation-shell">
      <section className="activation-hero">
        <Logo />
        <div className="activation-copy">
          <span className="eyebrow">PRINT BOOK → DIGITAL ADVENTURE</span>
          <h1>Small Steps.<br/><em>Big Futures.</em></h1>
          <p>Unlock Unit 1 of your interactive Career Compass Junior journey.</p>
          <div className="feature-pills"><span>🔊 Listen</span><span>🎙️ Copy & replay</span><span>🎮 Learn by doing</span><span>⭐ Earn XP</span></div>
        </div>
        <div className="hill-scene" aria-hidden="true"><span className="sun">☀️</span><span className="cloud c1">☁️</span><span className="cloud c2">☁️</span><span className="kid">🧒🏻🎒</span><span className="flag">🚩</span></div>
      </section>
      <form className="activation-card" onSubmit={submit}>
        <span className="book-chip">📘 Career Compass Junior Interactive</span>
        <h2>Activate your book</h2>
        <p>No student email needed. Your nickname and learning progress stay on this device for this proof build.</p>
        <label>Printed-book code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CCJ-XXXX-XXXX" autoCapitalize="characters" /></label>
        <label>Nickname on this device<input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-btn" type="submit">Unlock my adventure <span>→</span></button>
        <button type="button" className="demo-code" onClick={() => setCode(DEMO_CODE)}>Use demo code: <strong>{DEMO_CODE}</strong></button>
        <small>Production printed-book codes will be unique and verified as pseudonymous entitlements.</small>
      </form>
    </main>
  )
}

function Header({ nickname, xp }: { nickname: string; xp: number }) {
  return <header className="topbar"><Logo/><div className="top-actions"><span className="xp-pill">⭐ {xp} XP</span><span className="avatar">🧒🏻</span></div></header>
}

function Home({ state, goLesson, setScreen }: { state: ProgressState; goLesson: (id: number) => void; setScreen: (s: Screen) => void }) {
  const completed = state.completedLessons.length
  const next = unit1Lessons.find((l) => !state.completedLessons.includes(l.id)) || unit1Lessons[7]
  return (
    <div className="screen-content home-screen">
      <section className="welcome-card">
        <div><span className="eyebrow">YOUR BRIGHTER FUTURE STARTS HERE ✨</span><h1>Xin chào, {state.nickname || 'Explorer'}!</h1><p>One brave try today can become a new strength tomorrow.</p></div>
        <div className="hero-kid" aria-hidden="true">🧒🏻🚀</div>
      </section>
      <section className="dashboard-grid">
        <article className="progress-card"><ProgressRing value={(completed / 8) * 100} label={`${completed}/8 lessons`}/><div className="stat-stack"><div><strong>{state.xp}</strong><span>XP earned</span></div><div><strong>{completed ? Math.min(completed, 7) : 0}</strong><span>learning steps</span></div><div><strong>{completed >= 8 ? 1 : 0}</strong><span>unit badges</span></div></div></article>
        <article className="next-card"><span className="card-kicker">NEXT LESSON</span><h3>Unit 1 · Lesson {next.id}</h3><h2>{next.title}</h2><p>{next.viTitle}</p><button className="primary-btn" onClick={() => goLesson(next.id)}>Continue learning <span>→</span></button></article>
      </section>
      <section className="recent-section"><div className="section-title"><div><span className="card-kicker">UNIT 1</span><h2>Welcome, My Voice & My Strengths</h2></div><button className="text-btn" onClick={() => setScreen('unit')}>See all 8 lessons →</button></div><div className="lesson-strip">{unit1Lessons.slice(0, 4).map((lesson) => <button key={lesson.id} className={`mini-lesson ${state.completedLessons.includes(lesson.id) ? 'done' : ''}`} onClick={() => goLesson(lesson.id)}><span className="mini-art">{['👋','🎤','👂','🤝'][lesson.id-1]}</span><small>Lesson {lesson.id}</small><strong>{lesson.title}</strong><span>{state.completedLessons.includes(lesson.id) ? '✓ Complete' : lesson.id === next.id ? '▶ Continue' : 'Open'}</span></button>)}</div></section>
      <section className="privacy-note"><span>🔐</span><div><strong>Private by design</strong><p>Your voice practice is temporary. Recordings are never saved in this proof build.</p></div></section>
    </div>
  )
}

function Journey({ state, setScreen }: { state: ProgressState; setScreen: (s: Screen) => void }) {
  const completed = state.completedLessons.length
  const positions = [
    [45, 88],[66, 78],[35, 71],[73, 64],[46, 57],[70, 49],[34, 43],[63, 36],[39, 29],[68, 22],[45, 15],[57, 6]
  ]
  return (
    <div className="screen-content journey-screen">
      <div className="journey-heading"><div><span className="eyebrow">A 12-UNIT JOURNEY TO A BRIGHTER YOU</span><h1>My Journey</h1><p>Learn · Explore · Create · Grow · Belong</p></div><button className="round-btn" aria-label="Search lessons">⌕</button></div>
      <div className="stage-row">{Object.entries(icons).map(([name, icon]) => <div key={name} className="stage"><span>{icon}</span><b>{name[0].toUpperCase()+name.slice(1)}</b></div>)}</div>
      <section className="world-map">
        <div className="sky-label">A Brighter You! ✨</div>
        <div className="mountain m1"></div><div className="mountain m2"></div><div className="river"></div><div className="city">🏙️</div><div className="forest f1">🌲🌳🌲</div><div className="forest f2">🌳🌲</div><div className="map-kid">🧒🏻🎒</div>
        <svg className="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M45 90 C70 84 72 78 66 75 S35 70 35 67 S73 63 73 60 S46 55 46 52 S70 47 70 45 S34 41 34 39 S63 34 63 31 S39 26 39 24 S68 19 68 17 S45 12 45 10 S57 6 57 4"/></svg>
        {unitNames.map((name, idx) => {
          const active = idx === 0
          const [left, top] = positions[idx]
          return <button key={name} className={`unit-node ${active ? 'active' : 'locked'}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => active && setScreen('unit')} aria-label={`Unit ${idx+1}: ${name}${active ? '' : ', preview locked'}`}><span>{idx+1}</span><b>{name}</b>{active && <small>{completed}/8 lessons</small>}</button>
        })}
        <div className="flag-top">🚩</div>
      </section>
      <section className="continue-bar"><div className="continue-icon">🧒🏻</div><div><small>UNIT 1</small><strong>My Voice & Strengths</strong><span>{completed}/8 lessons complete</span></div><button className="primary-btn" onClick={() => setScreen('unit')}>{completed ? 'Continue' : 'Start'} <span>→</span></button></section>
    </div>
  )
}

function UnitScreen({ state, goLesson }: { state: ProgressState; goLesson: (id: number) => void }) {
  return (
    <div className="screen-content unit-screen">
      <section className="unit-hero"><div><span className="eyebrow">UNIT 01 · DISCOVER</span><h1>Welcome, My Voice & My Strengths</h1><p>Chào hỏi, tiếng nói & điểm mạnh</p><div className="skill-chip">🧭 Compass skill: Confidence + self-awareness</div></div><div className="unit-badge-art">🏅</div></section>
      <div className="unit-progress"><div><strong>{state.completedLessons.length}/8</strong><span>lessons complete</span></div><div className="bar"><i style={{ width: `${(state.completedLessons.length/8)*100}%` }}/></div><span>Unit project: My Voice & Strengths badge</span></div>
      <section className="lesson-grid">{unit1Lessons.map((lesson) => {
        const done = state.completedLessons.includes(lesson.id)
        const unlocked = lesson.id === 1 || state.completedLessons.includes(lesson.id - 1) || done
        return <button key={lesson.id} className={`lesson-card ${done ? 'done' : ''} ${!unlocked ? 'locked' : ''}`} disabled={!unlocked} onClick={() => goLesson(lesson.id)}><span className="lesson-num">{done ? '✓' : lesson.id}</span><div><small>Week {lesson.week} · Lesson {lesson.id}</small><strong>{lesson.title}</strong><span>{lesson.viTitle}</span><p>{lesson.canDo}</p></div><span className="lesson-arrow">{!unlocked ? '🔒' : '→'}</span></button>
      })}</section>
    </div>
  )
}

function VoiceLab({ lesson }: { lesson: Lesson }) {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
        setMessage('Voice recording is not supported in this browser.')
        return
      }
      if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null) }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
        setMessage('Ready! Hear your voice, compare, then try again if you want.')
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setMessage('Recording locally… nothing is uploaded or saved.')
    } catch {
      setMessage('Microphone access was not available. You can still use model audio.')
    }
  }
  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
  }
  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setMessage('Ready for another try!')
  }

  const model = lesson.model[0]
  return <section className="voice-lab"><div className="voice-head"><span className="big-icon">🎙️</span><div><span className="card-kicker">LISTEN · COPY · REPLAY</span><h3>My Voice Lab</h3><p>Your recording stays in temporary memory only. It is never saved.</p></div></div><div className="model-line"><strong>{model}</strong><div><button onClick={() => speak(model)}>🔊 Normal</button><button onClick={() => speak(model, true)}>🐢 Slow</button></div></div><div className="recorder-box">{!recording ? <button className="record-btn" onClick={startRecording}>● Record my voice</button> : <button className="record-btn stop" onClick={stopRecording}>■ Stop & hear it</button>}{audioUrl && <><audio controls src={audioUrl} /><button className="try-again" onClick={reset}>↻ Try again</button></>}<p className="recorder-message" aria-live="polite">{message || 'Tap record when you are ready.'}</p></div></section>
}

function ActivityBlock({ activity }: { activity: LessonActivity }) {
  const [selected, setSelected] = useState<string[]>([])
  const [result, setResult] = useState('')
  const [age, setAge] = useState(8)
  const [colorAnswers, setColorAnswers] = useState<Record<string, string>>({})
  const [pair, setPair] = useState({ left: '', right: '' })
  const [checkAnswers, setCheckAnswers] = useState<Record<number, string>>({})

  function reset() { setSelected([]); setResult(''); setColorAnswers({}); setPair({left:'',right:''}); setCheckAnswers({}) }

  if (activity.type === 'choice') return <section className="activity-card"><ActivityHeader prompt={activity.prompt}/><div className="option-grid">{activity.options.map((o) => <button key={o} className={selected[0]===o ? 'selected' : ''} onClick={() => { setSelected([o]); setResult(o===activity.answer ? activity.success : 'Almost — listen to the greeting and try again.') }}>{o}</button>)}</div><Feedback result={result} ok={selected[0]===activity.answer}/></section>

  if (activity.type === 'age') return <section className="activity-card"><ActivityHeader prompt={activity.prompt}/><div className="age-picker"><button onClick={() => setAge(Math.max(7, age-1))}>−</button><strong>{age}</strong><button onClick={() => setAge(Math.min(12, age+1))}>+</button></div><div className="built-sentence">I’m <b>{age}</b> years old.</div><button className="check-btn" onClick={() => setResult('Great! Now say your sentence in My Voice Lab.')}>Check my sentence</button><Feedback result={result} ok/></section>

  if (activity.type === 'sequence') {
    const done = selected.length === activity.answer.length
    const correct = done && selected.every((x,i)=>x===activity.answer[i])
    return <section className="activity-card"><ActivityHeader prompt={activity.prompt}/><div className="sequence-zone"><div className="sequence-built">{selected.length ? selected.map((s,i)=><span key={`${s}-${i}`}>{i+1}. {s}</span>) : <em>Tap cards below to build the order.</em>}</div><div className="option-grid">{activity.items.map((item) => <button key={item} disabled={selected.includes(item)} onClick={()=>setSelected([...selected,item])}>{item}</button>)}</div></div><div className="activity-actions"><button className="secondary-btn" onClick={reset}>Reset</button><button className="check-btn" disabled={!done} onClick={()=>setResult(correct ? 'Yes! Your order works.' : 'Not quite. Reset and try the sequence again.')}>Check</button></div><Feedback result={result} ok={correct}/></section>
  }

  if (activity.type === 'build') {
    const correct = selected.length===activity.answer.length && selected.every((x,i)=>x===activity.answer[i])
    return <section className="activity-card"><ActivityHeader prompt={activity.prompt}/><div className="built-sentence">{selected.length ? selected.join(' ') : 'Tap the words in order.'}</div><div className="option-grid">{activity.pieces.map((piece,i)=><button key={`${piece}-${i}`} disabled={selected.includes(piece)} onClick={()=>setSelected([...selected,piece])}>{piece}</button>)}</div><div className="activity-actions"><button className="secondary-btn" onClick={reset}>Reset</button><button className="check-btn" disabled={selected.length!==activity.answer.length} onClick={()=>setResult(correct ? 'Polite and clear — excellent!' : 'Try again. Start with “A”.')}>Check</button></div><Feedback result={result} ok={correct}/></section>
  }

  if (activity.type === 'color') {
    const colors = ['red','blue','green','yellow']
    const complete = activity.items.every((i)=>colorAnswers[i.label])
    const correct = complete && activity.items.every((i)=>colorAnswers[i.label]===i.color)
    return <section className="activity-card"><ActivityHeader prompt={activity.prompt}/><div className="color-match">{activity.items.map((item)=><div key={item.label}><strong>{item.label}</strong><div>{colors.map((c)=><button key={c} aria-label={`${item.label} ${c}`} className={`color-dot ${colorAnswers[item.label]===c ? 'selected' : ''}`} style={{background:c}} onClick={()=>setColorAnswers({...colorAnswers,[item.label]:c})}/>)}</div></div>)}</div><button className="check-btn" disabled={!complete} onClick={()=>setResult(correct ? 'Perfect color match!' : 'Look at the model and try the colors again.')}>Check colors</button><Feedback result={result} ok={correct}/></section>
  }

  if (activity.type === 'pair') {
    const complete = pair.left && pair.right
    return <section className="activity-card"><ActivityHeader prompt={activity.prompt}/><div className="pair-columns"><div><strong>{activity.leftLabel}</strong>{activity.leftOptions.map((o)=><button key={o} className={pair.left===o?'selected':''} onClick={()=>setPair({...pair,left:o})}>{o}</button>)}</div><div><strong>{activity.rightLabel}</strong>{activity.rightOptions.map((o)=><button key={o} className={pair.right===o?'selected':''} onClick={()=>setPair({...pair,right:o})}>{o}</button>)}</div></div>{complete && <div className="built-sentence">I’m <b>{pair.left}</b>. I like <b>{pair.right}</b>.</div>}<button className="check-btn" disabled={!complete} onClick={()=>setResult('Nice choice! Say both sentences aloud.')}>Done</button><Feedback result={result} ok/></section>
  }

  if (activity.type === 'checkpoint') {
    const complete = activity.questions.every((_,i)=>checkAnswers[i])
    const score = activity.questions.reduce((sum,q,i)=>sum+(checkAnswers[i]===q.answer?1:0),0)
    return <section className="activity-card"><ActivityHeader prompt={activity.prompt}/><div className="checkpoint-list">{activity.questions.map((q,i)=><div key={q.q} className="checkpoint-q"><strong>{i+1}. {q.q}</strong><div className="option-grid">{q.options.map((o)=><button key={o} className={checkAnswers[i]===o?'selected':''} onClick={()=>setCheckAnswers({...checkAnswers,[i]:o})}>{o}</button>)}</div></div>)}</div><button className="check-btn" disabled={!complete} onClick={()=>setResult(score===4 ? '4/4 — Welcome Club champion! 🌟' : `${score}/4 — good effort. Review the models and try once more.`)}>Check my checkpoint</button><Feedback result={result} ok={score===4}/></section>
  }

  return null
}

function ActivityHeader({ prompt }: { prompt: string }) { return <div className="activity-title"><span className="big-icon">🎯</span><div><span className="card-kicker">LEARN BY DOING</span><h3>Interactive Challenge</h3><p>{prompt}</p></div></div> }
function Feedback({ result, ok }: { result: string; ok: boolean }) { return result ? <div className={`feedback ${ok?'ok':'try'}`} role="status">{ok?'✨':'💪'} {result}</div> : null }

function LessonScreen({ lesson, state, updateState, setScreen }: { lesson: Lesson; state: ProgressState; updateState: (p: ProgressState)=>void; setScreen:(s:Screen)=>void }) {
  const [reflection, setReflection] = useState(state.reflections[lesson.id] || '')
  const completed = state.completedLessons.includes(lesson.id)
  function completeLesson() {
    if (completed) return
    const completedLessons = [...state.completedLessons, lesson.id].sort((a,b)=>a-b)
    updateState({ ...state, completedLessons, xp: state.xp + 20, reflections: { ...state.reflections, [lesson.id]: reflection }, lastLesson: Math.min(8, lesson.id + 1) })
  }
  function saveReflection(value: string) {
    setReflection(value)
    updateState({ ...state, reflections: { ...state.reflections, [lesson.id]: value }, lastLesson: lesson.id })
  }
  return (
    <div className="screen-content lesson-screen">
      <button className="back-btn" onClick={()=>setScreen('unit')}>← Unit 1</button>
      <section className="lesson-hero"><div><span className="eyebrow">UNIT 1 · LESSON {lesson.id} · WEEK {lesson.week}</span><h1>{lesson.title}</h1><p>{lesson.viTitle}</p><div className="can-do"><b>Today I can</b><span>{lesson.canDo}</span></div></div><div className="lesson-mascot">{lesson.id===1?'👋🧒🏻':lesson.id===8?'🏆🧒🏻':'✨🧒🏻'}</div></section>
      <section className="lesson-flow"><span className="on">🌱 Discover</span><span>💬 Communicate</span><span>🧑‍🤝‍🧑 Collaborate</span><span>💡 Create</span><span>⭐ Reflect</span></section>
      <section className="vocab-section"><div className="section-title"><div><span className="card-kicker">LANGUAGE BUILDER</span><h2>Tap, listen, copy</h2></div><button className="round-btn" onClick={()=>speak(lesson.vocab.map(v=>v.en).join('. '))}>🔊</button></div><div className="vocab-grid">{lesson.vocab.map((v)=><button key={v.en} className="vocab-card" onClick={()=>speak(v.en)}><span>🔊</span><strong>{v.en}</strong><small>{v.vi}</small></button>)}</div></section>
      <section className="model-card"><div><span className="card-kicker">MODEL / MẪU</span><h2>Listen to the conversation</h2></div><div className="dialogue">{lesson.model.map((line,i)=><button key={`${line}-${i}`} onClick={()=>speak(line)}><span>{i%2===0?'🧒🏻':'👧🏻'}</span><b>{line}</b><i>🔊</i></button>)}</div><div className="rhythm"><span>🎵 SOUND & RHYTHM</span><strong>{lesson.rhythm}</strong><button onClick={()=>speak(lesson.rhythm.replaceAll('/',' '), true)}>Slow listen</button></div></section>
      <ActivityBlock activity={lesson.activity}/>
      <VoiceLab lesson={lesson}/>
      <section className="mission-card"><span className="big-icon">🚀</span><div><span className="card-kicker">MY MINI MISSION</span><h3>{lesson.mission}</h3><p>START: point, copy or say one phrase · GROW: use a full sentence · STRETCH: try without the model.</p></div></section>
      <section className="reflect-card"><div><span className="big-icon">✍️</span><span className="card-kicker">REFLECT</span><h3>{lesson.reflection}</h3></div><textarea value={reflection} onChange={(e)=>saveReflection(e.target.value)} placeholder="Type or draw your idea with words…" maxLength={220}/><div className="self-check"><span>I tried ✓</span><span>I spoke ✓</span><span>I listened ✓</span><span>I shared ✓</span></div></section>
      <section className={`complete-card ${completed?'completed':''}`}><div><span className="big-icon">{completed?'🏆':'⭐'}</span><div><h2>{completed?'Lesson complete!':'Ready to finish?'}</h2><p>{completed?'You earned +20 XP. Keep going!':'Finish when you have listened, practiced and reflected.'}</p></div></div>{!completed ? <button className="primary-btn" onClick={completeLesson}>Complete lesson +20 XP</button> : <button className="secondary-btn" onClick={()=>setScreen('unit')}>Back to Unit 1</button>}</section>
    </div>
  )
}

function Progress({ state }: { state: ProgressState }) {
  return <div className="screen-content progress-screen"><div className="journey-heading"><div><span className="eyebrow">MY GROWTH</span><h1>Progress</h1><p>Notice what you can do now that felt new before.</p></div></div><section className="progress-hero"><ProgressRing value={(state.completedLessons.length/8)*100} label="Unit 1"/><div><div className="metric"><strong>{state.completedLessons.length}</strong><span>lessons completed</span></div><div className="metric"><strong>{state.xp}</strong><span>XP earned</span></div><div className="metric"><strong>{Object.values(state.reflections).filter(Boolean).length}</strong><span>reflections saved locally</span></div></div></section><section className="achievement-grid"><article><span>🎙️</span><strong>My Voice Explorer</strong><p>{state.completedLessons.length>=2?'Unlocked':'Complete Lessons 1–2'}</p></article><article><span>🤝</span><strong>Helpful Communicator</strong><p>{state.completedLessons.length>=4?'Unlocked':'Complete Lessons 1–4'}</p></article><article><span>🏅</span><strong>Unit 1 Badge</strong><p>{state.completedLessons.length>=8?'Unlocked':'Complete all 8 lessons'}</p></article></section></div>
}

function Profile({ state, onReset }: { state: ProgressState; onReset: ()=>void }) {
  return <div className="screen-content profile-screen"><section className="profile-hero"><div className="profile-avatar">🧒🏻</div><div><span className="eyebrow">LOCAL LEARNER PROFILE</span><h1>{state.nickname || 'Explorer'}</h1><p>No email required · Device-based access</p></div></section><section className="privacy-panel"><h2>🔐 Your privacy in this proof build</h2><p>Your nickname, activation status, lesson progress and reflections are stored in IndexedDB on this device. Pronunciation recordings stay only in temporary browser memory and are discarded after use. Nothing in this proof build is uploaded to Neon or another server.</p></section><section className="profile-actions"><button className="secondary-btn" onClick={onReset}>Reset this device proof</button><small>Reset removes the local proof activation and progress.</small></section></div>
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen)=>void }) {
  const items: {s:Screen; icon:string; label:string}[] = [
    {s:'home',icon:'⌂',label:'Home'}, {s:'journey',icon:'🗺️',label:'My Journey'}, {s:'progress',icon:'📈',label:'Progress'}, {s:'profile',icon:'☺',label:'Profile'}
  ]
  return <nav className="bottom-nav" aria-label="Primary navigation">{items.map((item)=><button key={item.s} className={screen===item.s || (screen==='unit'||screen==='lesson')&&item.s==='journey' ? 'active':''} onClick={()=>setScreen(item.s)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
}

export default function App() {
  const [state, setState] = useState<ProgressState | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [lessonId, setLessonId] = useState(1)
  useEffect(() => { loadState().then(setState) }, [])
  const lesson = useMemo(()=>unit1Lessons.find(l=>l.id===lessonId) || unit1Lessons[0],[lessonId])

  async function updateState(next: ProgressState) { setState(next); await saveState(next) }
  async function activate(code: string, nickname: string) {
    const next: ProgressState = { activated: true, activationCode: code, nickname, completedLessons: [], xp: 0, reflections: {}, lastLesson: 1 }
    await updateState(next)
    navigator.storage?.persist?.().catch(()=>undefined)
  }
  function goLesson(id: number) { setLessonId(id); setScreen('lesson'); if (state) updateState({...state,lastLesson:id}) }
  async function reset() { await clearState(); setState({activated:false,completedLessons:[],xp:0,reflections:{},lastLesson:1}); setScreen('home') }

  if (!state) return <div className="loading"><Logo/><div className="spinner"></div><p>Opening your adventure…</p></div>
  if (!state.activated) return <Activation onActivate={activate}/>

  return <div className="app-shell"><Header nickname={state.nickname || 'Explorer'} xp={state.xp}/><main className="app-main">{screen==='home' && <Home state={state} goLesson={goLesson} setScreen={setScreen}/>} {screen==='journey' && <Journey state={state} setScreen={setScreen}/>} {screen==='unit' && <UnitScreen state={state} goLesson={goLesson}/>} {screen==='lesson' && <LessonScreen lesson={lesson} state={state} updateState={updateState} setScreen={setScreen}/>} {screen==='progress' && <Progress state={state}/>} {screen==='profile' && <Profile state={state} onReset={reset}/>}</main><BottomNav screen={screen} setScreen={setScreen}/></div>
}

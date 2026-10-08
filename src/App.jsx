import { useEffect, useRef, useState } from 'react'
import { toHiragana } from 'wanakana'
import { sentences } from './data/sentences'
import './App.css'

function normalizeAnswer(text) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[。．.]+$/u, '')
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0')
  )
}

function calculateTypingStats(input, answers, elapsedMs) {
  const inputCharacters = Array.from(normalizeAnswer(input))

  if (inputCharacters.length === 0) {
    return {
      speed: elapsedMs >= 1000 ? 0 : null,
      accuracy: null,
    }
  }

  const correctCounts = answers.map((answer) => {
    const answerCharacters = Array.from(normalizeAnswer(answer))

    return inputCharacters.filter(
      (character, index) => character === answerCharacters[index]
    ).length
  })

  const correctCount = Math.max(0, ...correctCounts)

  const accuracy = Math.round(
    (correctCount / inputCharacters.length) * 100
  )

  const speed =
    elapsedMs >= 1000
      ? Math.round((correctCount / elapsedMs) * 60000)
      : null

  return { speed, accuracy }
}

// 직전 문장을 제외하고 랜덤으로 하나 선택해요.
function getRandomSentenceIndex(previousIndex = -1) {
  const total = sentences.length

  if (total <= 1) {
    return 0
  }

  // 처음 시작할 때는 전체 문장 중에서 선택해요.
  if (previousIndex < 0 || previousIndex >= total) {
    return Math.floor(Math.random() * total)
  }

  // 직전 문장을 뺀 나머지 문장 중에서 선택해요.
  const randomIndex = Math.floor(Math.random() * (total - 1))

  return randomIndex >= previousIndex
    ? randomIndex + 1
    : randomIndex
}

function App() {
  const [sentenceIndex, setSentenceIndex] = useState(
  () => getRandomSentenceIndex()
)
  const [hints, setHints] = useState({
    japanese: true,
    hiragana: false,
    romaji: false,
  })
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')

  const [startedAt, setStartedAt] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const inputRef = useRef(null)

  // 현재 연습할 문장을 가져와요.
  const currentSentence = sentences[sentenceIndex]
  function toggleHint(type) {
  setHints((previous) => ({
    ...previous,
    [type]: !previous[type],
  }))
}

  const acceptedAnswers = [
    currentSentence.japanese,
    currentSentence.hiragana,
  ]

  const typingStats = calculateTypingStats(
    input,
    acceptedAnswers,
    elapsedMs
  )

  const buttonLabel = isFinished ? '다음 문장' : '정답 확인'

  // 첫 입력부터 정답을 확인할 때까지 시간을 측정해요.
  useEffect(() => {
    if (startedAt === null || isFinished) {
      return
    }

    const timerId = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt)
    }, 100)

    return () => window.clearInterval(timerId)
  }, [startedAt, isFinished])

  function handleInputChange(event) {
    if (isFinished) {
      return
    }

    const value = event.target.value

    const convertedValue = event.nativeEvent.isComposing
      ? value
      : toHiragana(value, { IMEMode: true })

    setInput(convertedValue)
    setMessage('')

    if (startedAt === null && value.trim() !== '') {
      setStartedAt(performance.now())
    }
  }

  function checkAnswer() {
  if (isFinished) {
    return
  }

  const finalizedInput = toHiragana(input)
  const answer = normalizeAnswer(finalizedInput)

  setInput(finalizedInput)

  if (!answer) {
    setMessage('먼저 문장을 입력해 주세요.')
    return
  }

  const isCorrect = acceptedAnswers.some(
    (candidate) => normalizeAnswer(candidate) === answer
  )

  if (!isCorrect) {
    setMessage('조금 달라요. 문장을 확인하고 다시 입력해 보세요.')
    return
  }

  if (startedAt !== null) {
    setElapsedMs(performance.now() - startedAt)
  }

  setIsFinished(true)
  setMessage('정답이에요! Enter를 누르면 다음 문장으로 넘어가요.')
}

  function goToNextSentence() {
  if (!isFinished) {
    return
  }

  setSentenceIndex(getRandomSentenceIndex(sentenceIndex))

  setInput('')
  setMessage('')
  setStartedAt(null)
  setElapsedMs(0)
  setIsFinished(false)

  inputRef.current?.focus()
}

  function handleKeyDown(event) {
    if (event.key !== 'Enter') {
      return
    }

    // 일본어 키보드의 변환 확정 Enter는 제출하지 않아요.
    if (
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return
    }

    event.preventDefault()

    if (event.repeat) {
      return
    }

    if (isFinished) {
      goToNextSentence()
    } else {
      checkAnswer()
    }
  }

  return (
    <div className="typing-app">
      <header className="app-header">
        <div className="site-name">일본어 타자연습</div>
        <span className="header-label">짧은 글 연습</span>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="내 프로필과 연습 기록">
          <section className="profile-panel">
            <h2 className="panel-title">내 프로필</h2>

            <div className="profile-avatar" aria-hidden="true">
              あ
            </div>

            <h3 className="profile-name">연습생</h3>

            <p className="profile-description">
              오늘도 한 문장씩 차근차근
            </p>
          </section>

          <section className="stats-panel">
            <h2 className="panel-title">연습 기록</h2>

            <dl className="stats-list">
              <div className="stat-item">
                <dt>현재 타수</dt>
                <dd>
                  {typingStats.speed ?? '—'} <span>타/분</span>
                </dd>
              </div>

              <div className="stat-item">
                <dt>정확도</dt>
                <dd>
                  {typingStats.accuracy ?? '—'} <span>%</span>
                </dd>
              </div>

              <div className="stat-item">
                <dt>연습 시간</dt>
                <dd>
                  {formatTime(elapsedMs)} <span>분 : 초</span>
                </dd>
              </div>
            </dl>
          </section>

          <p className="sidebar-note">
            빠르게 치기보다<br />
            정확하게 입력해 보세요.
          </p>
        </aside>

        <main className="practice-panel">
          <header className="practice-header">
            <h1>짧은 글 연습</h1>

            <span className="practice-category">
            {currentSentence.category}
            </span>
          </header>

          <div className="practice-content">
            <p className="practice-guide">
              영문 키보드로 입력하면 히라가나로 자동 변환돼요.
            </p>

            <section className="sentence-panel" aria-label="연습할 문장">
  <div className="sentence-heading">
    <span className="section-label">이번 문장</span>

    <div
      className="hint-toggles"
      role="group"
      aria-label="표시할 힌트 선택"
    >
      <span className="hint-label">힌트</span>

      <button
        type="button"
        className="hint-toggle"
        aria-pressed={hints.japanese}
        onClick={() => toggleHint('japanese')}
      >
        일본어
      </button>

      <button
        type="button"
        className="hint-toggle"
        aria-pressed={hints.hiragana}
        onClick={() => toggleHint('hiragana')}
      >
        히라가나
      </button>

      <button
        type="button"
        className="hint-toggle"
        aria-pressed={hints.romaji}
        onClick={() => toggleHint('romaji')}
      >
        로마자
      </button>
    </div>
  </div>

  <h2>{currentSentence.korean}</h2>

  <div className="hint-area">
    {hints.japanese && (
      <p lang="ja">{currentSentence.japanese}</p>
    )}

    {hints.hiragana && (
      <p lang="ja">{currentSentence.hiragana}</p>
    )}

    {hints.romaji && (
      <p className="romaji-hint" lang="ja-Latn">
        {currentSentence.romaji}
      </p>
    )}
  </div>
</section>

            <section className="answer-panel" aria-label="문장 입력">
              <label className="section-label" htmlFor="typing-input">
                문장 입력
              </label>

              <input
                ref={inputRef}
                id="typing-input"
                type="text"
                placeholder="로마자로 입력하고 Enter를 눌러 주세요"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={input}
                readOnly={isFinished}
                onChange={handleInputChange}
                onCompositionEnd={handleInputChange}
                onKeyDown={handleKeyDown}
              />

              <div className="answer-actions">
                <button
                  type="button"
                  className="check-button"
                  onClick={isFinished ? goToNextSentence : checkAnswer}
                >
                  {buttonLabel}
                </button>
              </div>

              <p className="answer-message" role="status">
                {message}
              </p>
            </section>
          </div>

          <footer className="practice-footer">
            {isFinished
              ? 'Enter를 누르면 다음 문장으로 넘어가요.'
              : '입력을 마치면 Enter를 눌러 정답을 확인해 주세요.'}
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
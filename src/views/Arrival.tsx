import { useCallback, useState } from 'react'
import { letterStatus, useStore, waitsForDevelop } from '../lib/store'
import type { Letter } from '../lib/types'
import { AppVoice, Back } from '../components/common'
import { LetterReader, ReadLetter, ReplyComposer, SealedLetter, markOpened } from '../components/Conversation'
import { longDate, until, year } from '../lib/time'
import { memoryStyle } from './Darkroom'
import { hrefFor } from './Home'

export default function Arrival({ id }: { id: string }) {
  const { letters, memories } = useStore()
  const letter = letters.find((l) => l.id === id)
  const [read, setRead] = useState(false)
  const [sent, setSent] = useState<Letter | null>(null)
  const m = letter?.memoryId ? memories.find((x) => x.id === letter.memoryId) : undefined
  const onRead = useCallback(() => {
    setRead(true)
    if (letter) markOpened(letter)
  }, [letter])

  if (!letter)
    return (
      <main className="darkroom theme-paper arrival">
        <div className="dr-missing">
          <p>That letter isn’t here any more.</p>
          <Back href="#/today" dark>
            Today
          </Back>
        </div>
      </main>
    )

  if (letterStatus(letter) === 'sealed')
    return (
      <main className="darkroom theme-paper arrival">
        <header className="dr-head">
          <Back href="#/today" dark>
            Today
          </Back>
        </header>
        <div className="arrival-body">
          <SealedLetter l={letter} />
          <AppVoice className="dark">Not yet. It opens {until(letter.sealedUntil!)}.</AppVoice>
        </div>
      </main>
    )

  if (m && waitsForDevelop(letter, [m]))
    return (
      <main className="darkroom theme-paper arrival">
        <header className="dr-head">
          <Back href="#/today" dark>
            Today
          </Back>
        </header>
        <div className="arrival-body">
          <AppVoice className="dark">This letter was left inside “{m.title}”. It opens when you develop that day.</AppVoice>
          <a className="btn btn-light" href={`#/develop/${m.id}`}>
            Develop the day
          </a>
        </div>
      </main>
    )

  // the chain of letters that led to this one
  const chain: Letter[] = []
  let p = letter.parentId ? letters.find((l) => l.id === letter.parentId) : undefined
  while (p) {
    chain.unshift(p)
    const pid: string | undefined = p.parentId
    p = pid ? letters.find((l) => l.id === pid) : undefined
  }

  return (
    <main className={`darkroom arrival theme-${m?.theme ?? 'paper'}`} style={m ? memoryStyle(m) : undefined}>
      <header className="dr-head">
        <Back href="#/today" dark>
          Today
        </Back>
        <div className="dr-title">
          <span className="dr-date">A letter arrived</span>
          <span className="dr-name">{m ? m.title : 'From you'}</span>
        </div>
        <span />
      </header>
      <div className="arrival-body">
        {chain.length > 0 && (
          <div className="chain">
            <AppVoice className="dark">
              {chain.length === 1
                ? `In ${year(chain[0].writtenAt)} you wrote to yourself. In ${year(letter.writtenAt)} you answered. This is that answer.`
                : `This is letter ${chain.length + 1} in a conversation you’ve been having with yourself since ${year(chain[0].writtenAt)}.`}
            </AppVoice>
            {chain.map((l) => (
              <ReadLetter key={l.id} l={l} />
            ))}
          </div>
        )}
        <LetterReader letter={letter} onRead={onRead} />

        {read && !sent && (
          <ReplyComposer memory={m} parent={letter} seedText={letter.id} title="Write back" onSent={setSent} />
        )}
        {sent && (
          <div className="sent">
            {sent.sealedUntil ? (
              <>
                <SealedLetter l={sent} />
                <AppVoice className="dark">
                  Sealed until {longDate(sent.sealedUntil)}. The conversation continues then.
                </AppVoice>
              </>
            ) : (
              <AppVoice className="dark">Pinned to “{m?.title}”, in your words.</AppVoice>
            )}
          </div>
        )}
        {read && (
          <nav className="arrival-next">
            {m && (
              <a className="btn btn-ghost" href={hrefFor(m)}>
                {m.progress.developedAt ? 'Open the print of that day' : 'Develop the day it was written'}
              </a>
            )}
            <a className="link link-dark" href="#/today">
              Today
            </a>
          </nav>
        )}
      </div>
    </main>
  )
}

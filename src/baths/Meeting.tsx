import { roman } from '../lib/time'
import { useCallback, useState } from 'react'
import type { BathProps } from '../views/Darkroom'
import type { Letter } from '../lib/types'
import { letterStatus } from '../lib/store'
import { AppVoice } from '../components/common'
import { LetterReader, ReadLetter, ReplyComposer, SealedLetter, markOpened, useThread } from '../components/Conversation'
import { longDate, until } from '../lib/time'

export default function Meeting({ m, tray, onPartial, onDone }: BathProps) {
  const thread = useThread(m.id)
  // freeze which letter we're reading when the bath starts, so marking it read doesn't jump the view
  const [reading] = useState<Letter | undefined>(() => thread.find((l) => ['unread', 'arrived'].includes(letterStatus(l))))
  const [read, setRead] = useState(!reading)
  const [sent, setSent] = useState<Letter | null>(null)

  const onRead = useCallback(() => {
    setRead(true)
    onPartial(0.5)
    if (reading) markOpened(reading)
  }, [reading, onPartial])

  const earlier = thread.filter((l) => l.id !== reading?.id && letterStatus(l) !== 'sealed' && (!reading || l.writtenAt < reading.writtenAt))
  const sealed = thread.filter((l) => letterStatus(l) === 'sealed' && l.id !== sent?.id)
  const readable = thread.filter((l) => letterStatus(l) !== 'sealed')
  const parent = reading ?? readable[readable.length - 1]

  return (
    <div className="bath bath-meeting">
      <div className="bath-visual">{tray(undefined, 'sm')}</div>
      <section className="bath-panel bath-panel-wide meeting">
        <p className="bath-kicker">Bath {roman(m.baths.indexOf('meeting') + 1)} · Meeting</p>
        <h2 className="bath-title">{reading ? 'Someone left you a letter.' : thread.length ? 'The conversation so far.' : 'Nobody left a letter on this day.'}</h2>

        {earlier.length > 0 && (
          <div className="chain">
            <AppVoice className="dark">
              {earlier.length === 1 ? 'Earlier in this conversation:' : `This conversation already has ${earlier.length} letters:`}
            </AppVoice>
            {earlier.map((l) => (
              <ReadLetter key={l.id} l={l} />
            ))}
          </div>
        )}

        {reading && <LetterReader letter={reading} onRead={onRead} />}

        {sealed.map((l) => (
          <SealedLetter key={l.id} l={l} />
        ))}

        {!reading && !thread.length && <AppVoice className="dark">But you can leave one for them now — or seal one for whoever develops this next.</AppVoice>}
        {!reading && sealed.length > 0 && readable.length === 0 && (
          <AppVoice className="dark">It isn’t time yet. You can still say something to the person who lived this night.</AppVoice>
        )}

        {read && !sent && (
          <ReplyComposer
            memory={m}
            parent={parent}
            seedText={m.id + (parent?.id ?? '')}
            title={parent ? 'Answer them' : 'Write to them'}
            onSent={(l) => {
              setSent(l)
              onPartial(1)
            }}
            onSkip={onDone}
          />
        )}

        {sent && (
          <div className="sent">
            {sent.to === 'future' && sent.sealedUntil ? (
              <>
                <SealedLetter l={sent} />
                <AppVoice className="dark">
                  Sealed. It will find you {until(sent.sealedUntil)}, on {longDate(sent.sealedUntil)}.
                </AppVoice>
              </>
            ) : (
              <AppVoice className="dark">Pinned to this day. It’ll be here, in your words, whenever you come back.</AppVoice>
            )}
            <button type="button" className="btn btn-light" onClick={onDone} autoFocus>
              Fix the print
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

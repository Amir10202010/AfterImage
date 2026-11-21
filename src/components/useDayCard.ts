import { useEffect, useMemo, useState } from 'react'
import type { Memory } from '../lib/types'
import { swatches as readSwatches, type Swatch } from '../lib/colors'
import { cardModel, type CardModel } from '../lib/daycard'
import { useMemoryImage } from './Photo'

/** Reads the first photo's colours once, so the palette starts from what was in front of the camera. */
export function useDayCard(m: Memory): CardModel {
  const first = useMemoryImage(m, 0)
  const [sw, setSw] = useState<{ src?: string; list?: Swatch[] }>({})
  useEffect(() => {
    if (!first) return
    let live = true
    readSwatches(first).then((list) => live && setSw({ src: first, list }))
    return () => {
      live = false
    }
  }, [first])
  const list = sw.src === first ? sw.list : undefined
  return useMemo(() => cardModel(m, list), [m, list])
}

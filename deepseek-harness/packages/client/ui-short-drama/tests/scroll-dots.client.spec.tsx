// @vitest-environment jsdom
import { useRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ScrollDots } from '../src/client/ScrollDots.tsx'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('maps a small handle to scroll progress, supports keyboard and drag, and removes it when hidden', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  function Fixture() {
    const root = useRef<HTMLDivElement>(null)
    return <div ref={root}><div data-testid="content" style={{ overflowY: 'auto' }}>Document</div><ScrollDots root={root} /></div>
  }
  render(<Fixture />)
  const content = screen.getByTestId('content')
  Object.defineProperties(content, {
    clientHeight: { configurable: true, value: 200 },
    scrollHeight: { configurable: true, value: 1000 },
  })
  vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({ top: 0, right: 300, width: 300, height: 200 } as DOMRect)
  const dot = await screen.findByRole('scrollbar')
  expect(content.hasAttribute('data-scroll-dot')).toBe(true)
  expect(dot.getAttribute('aria-valuenow')).toBe('0')
  fireEvent.keyDown(dot, { key: 'End' })
  expect(content.scrollTop).toBe(1000)
  content.scrollTop = 400
  fireEvent.scroll(content)
  await waitFor(() => expect(dot.getAttribute('aria-valuenow')).toBe('50'))
  expect(dot.style.top).toBe('88px')
  dot.setPointerCapture = vi.fn()
  dot.hasPointerCapture = vi.fn(() => true)
  dot.releasePointerCapture = vi.fn()
  fireEvent.pointerDown(dot, { pointerId: 1, button: 0, clientY: 100 })
  fireEvent.pointerMove(dot, { pointerId: 1, clientY: 143 })
  expect(content.scrollTop).toBe(600)
  fireEvent.pointerUp(dot, { pointerId: 1 })
  vi.mocked(content.getBoundingClientRect).mockReturnValue({ top: 0, right: 0, width: 0, height: 0 } as DOMRect)
  content.hidden = true
  await waitFor(() => expect(screen.queryByRole('scrollbar')).toBeNull())
  expect(content.hasAttribute('data-scroll-dot')).toBe(false)
})

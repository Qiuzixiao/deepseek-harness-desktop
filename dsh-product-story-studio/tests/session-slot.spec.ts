// Smoke test for the conversation.session dynamic ownership pattern in
// client/index.tsx (bindStoryStudioSessionSlot). Verifies the single-slot
// register/dispose cycle survives switching between a Story Studio session
// and a non-Story-Studio session without ever throwing the ui-slots
// "already has a registration" error, and that the slot is correctly
// released back to the default implementation when no Story Studio session
// is active.
import { describe, expect, it } from 'vitest'
import { bindStoryStudioSessionSlot } from '../src/client/index.tsx'

interface FakeSessionRow {
  cwd?: string
}

interface FakeSessionListState {
  current?: string
  byId: Record<string, FakeSessionRow>
}

function createFakeSessionsList(initial: FakeSessionListState) {
  let state = initial
  const subscribers = new Set<() => void>()
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => {
      subscribers.add(fn)
      return () => { subscribers.delete(fn) }
    },
    set: (next: FakeSessionListState) => {
      state = next
      for (const fn of subscribers) fn()
    },
  }
}

function createFakeSlots() {
  const occupantsByPriority = new Map<number, unknown>()
  return {
    register: (options: { name: string; priority?: number }, component: unknown) => {
      const priority = options.priority ?? 0
      if (occupantsByPriority.has(priority)) {
        throw new Error(`single slot "${options.name}" already has a registration at priority ${priority}`)
      }
      occupantsByPriority.set(priority, component)
      return () => { occupantsByPriority.delete(priority) }
    },
    inject: () => () => {},
    occupied: (priority = 100) => occupantsByPriority.has(priority),
  }
}

function createFakeCtx(sessionsList: ReturnType<typeof createFakeSessionsList>, slots: ReturnType<typeof createFakeSlots>) {
  const effects: Array<() => void> = []
  return {
    get: (name: string) => (name === 'sessions' ? { list: sessionsList } : undefined),
    slots,
    effect: (fn: () => void | (() => void), _label?: string) => {
      const dispose = fn()
      if (typeof dispose === 'function') effects.push(dispose)
    },
    runTeardown: () => { for (const dispose of effects.splice(0)) dispose() },
  }
}

const STORY_STUDIO_ROOT = '/Users/writer/Documents/Story Studio/父子同心'

function fakeService(projectRoot = '/Users/writer/Documents/Story Studio') {
  return {
    describe: async () => ({ projectRoot }),
    create: async () => { throw new Error('not used in this test') },
    register: async () => { throw new Error('not used in this test') },
  }
}

describe('bindStoryStudioSessionSlot dynamic conversation.session ownership', () => {
  it('registers the slot only for a Story Studio session and releases it on switch, without throwing', async () => {
    const sessionsList = createFakeSessionsList({
      current: 'sess-story',
      byId: { 'sess-story': { cwd: STORY_STUDIO_ROOT } },
    })
    const slots = createFakeSlots()
    const ctx = createFakeCtx(sessionsList, slots)

    bindStoryStudioSessionSlot(ctx as never, fakeService() as never)
    // projectRoot resolves asynchronously via service.describe(); flush microtasks.
    await Promise.resolve()
    await Promise.resolve()
    sessionsList.set(sessionsList.getSnapshot())

    expect(slots.occupied()).toBe(true)

    // Switch to a non-Story-Studio session: the slot must be released, not
    // left dangling or double-registered.
    sessionsList.set({ current: 'sess-other', byId: { 'sess-other': { cwd: '/Users/writer/other-project' } } })
    expect(slots.occupied()).toBe(false)

    // Switch back to a Story Studio session: re-registration must succeed
    // cleanly (this is the exact case that would throw "already has a
    // registration" if the previous entry weren't disposed first).
    sessionsList.set({ current: 'sess-story-2', byId: { 'sess-story-2': { cwd: `${STORY_STUDIO_ROOT}/episode-1` } } })
    expect(slots.occupied()).toBe(true)

    ctx.runTeardown()
    expect(slots.occupied()).toBe(false)
  })

  it('never registers when no session is a Story Studio session', async () => {
    const sessionsList = createFakeSessionsList({
      current: 'sess-plain',
      byId: { 'sess-plain': { cwd: '/Users/writer/some-other-repo' } },
    })
    const slots = createFakeSlots()
    const ctx = createFakeCtx(sessionsList, slots)

    bindStoryStudioSessionSlot(ctx as never, fakeService() as never)
    await Promise.resolve()
    await Promise.resolve()
    sessionsList.set(sessionsList.getSnapshot())

    expect(slots.occupied()).toBe(false)
  })

  it('handles an undefined current session without throwing', async () => {
    const sessionsList = createFakeSessionsList({ byId: {} })
    const slots = createFakeSlots()
    const ctx = createFakeCtx(sessionsList, slots)

    expect(() => { bindStoryStudioSessionSlot(ctx as never, fakeService() as never) }).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    expect(slots.occupied()).toBe(false)
  })
})

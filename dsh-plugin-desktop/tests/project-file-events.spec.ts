import { EventEmitter } from 'node:events'
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { streamProjectFileEvents } from '../src/project-file-events.ts'

it('notifies nested writes and atomic replacements without a polling timer, then releases the watcher', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-events-'))
  const response = Object.assign(new EventEmitter(), { writeHead: vi.fn(), write: vi.fn(() => true), end: vi.fn() })
  const stop = streamProjectFileEvents(directory, response as never)
  try {
    expect(response.write).toHaveBeenCalledWith('retry: 1000\ndata: ready\n\n')
    mkdirSync(join(directory, '正文'))
    const path = join(directory, '正文', '人物.md')
    writeFileSync(path, '阿豪')
    await vi.waitFor(() => expect(response.write).toHaveBeenCalledWith('data: changed\n\n'))
    response.write.mockClear()
    writeFileSync(path + '.tmp', '顾长林')
    renameSync(path + '.tmp', path)
    await vi.waitFor(() => expect(response.write).toHaveBeenCalledWith('data: changed\n\n'))
    response.emit('close')
    response.write.mockClear()
    writeFileSync(path, '停止订阅后')
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(response.write).not.toHaveBeenCalled()
  } finally { stop(); rmSync(directory, { recursive: true, force: true }) }
})

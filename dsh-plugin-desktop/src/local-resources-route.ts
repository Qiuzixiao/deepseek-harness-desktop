/** Same-origin desktop endpoint; file paths are resolved only from the inventory. */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { BodyTooLargeError, isSameOriginLoopbackRequest } from './desktop-http-security.ts'
import { LocalResources, MAX_RESOURCE_ZIP } from './local-resources.ts'

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(JSON.stringify(value))
}

export async function handleLocalResourcesRequest(
  req: IncomingMessage, res: ServerResponse, origin: string, resources: LocalResources,
): Promise<void> {
  if (!isSameOriginLoopbackRequest(req, origin, req.method !== 'GET')) return json(res, 403, { error: 'forbidden' })
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { error: 'method not allowed' })
  const query = new URL(req.url ?? '', origin).searchParams
  const action = query.get('action') ?? 'list'
  try {
    if (req.method === 'GET') {
      const key = query.get('key') ?? ''
      if (action === 'list') return json(res, 200, { resources: await resources.list() })
      if (action === 'detail') return json(res, 200, await resources.detail(key))
      if (action === 'read') return json(res, 200, await resources.read(key, query.get('path') ?? ''))
      if (action === 'export') {
        const archive = await resources.export(key)
        res.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${archive.name}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
        res.end(archive.data)
        return
      }
    } else if (action === 'preview' || action === 'import') {
      if (req.headers['content-type']?.split(';')[0] !== 'application/zip') return json(res, 415, { error: 'Select a ZIP file.' })
      if (Number(req.headers['content-length'] ?? 0) > MAX_RESOURCE_ZIP) throw new BodyTooLargeError()
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of req) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
        if ((size += bytes.length) > MAX_RESOURCE_ZIP) throw new BodyTooLargeError()
        chunks.push(bytes)
      }
      const data = Buffer.concat(chunks)
      return json(res, 200, action === 'preview' ? resources.preview(data) : await resources.install(data, query.get('name') ?? undefined))
    }
    json(res, 400, { error: 'Unknown resource action.' })
  } catch (error) {
    json(res, error instanceof BodyTooLargeError ? 413 : 400, {
      error: error instanceof BodyTooLargeError ? 'The ZIP exceeds 20 MB.' : error instanceof Error ? error.message : 'Resource operation failed.',
    })
  }
}

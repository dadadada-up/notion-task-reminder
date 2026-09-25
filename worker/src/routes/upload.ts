// =============================================
// Upload Routes - R2 image upload
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils/crypto'

const upload = new Hono<{ Bindings: Bindings }>()

upload.use('*', authMiddleware)

// POST /upload - Upload image to R2
upload.post('/', async (c) => {
  const user = c.get('user')

  // Check if R2 bucket is configured
  if (!c.env.BUCKET) {
    return c.json({ success: false, error: 'R2 存储桶未配置，请在 Cloudflare Dashboard 开启 R2' }, 503)
  }

  // Parse multipart form data
  const contentType = c.req.header('Content-Type') || ''
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    return c.json({ success: false, error: '请使用 multipart/form-data 格式上传文件' }, 400)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ success: false, error: '请求格式错误，请使用 multipart/form-data' }, 400)
  }
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ success: false, error: '没有上传文件' }, 400)
  }

  // Check file name
  if (!file.name || file.name === '') {
    return c.json({ success: false, error: '文件名为空' }, 400)
  }

  // Check file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
  if (!allowedTypes.includes(file.type)) {
    return c.json({
      success: false,
      error: `不支持的文件类型: ${file.type}。支持: ${allowedTypes.join(', ')}`
    }, 400)
  }

  // Check file size (20MB limit)
  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    return c.json({
      success: false,
      error: `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(1)}MB > 20MB`
    }, 400)
  }

  // Generate unique key
  const ext = file.name.split('.').pop() || 'png'
  const key = `uploads/${user.userId}/${Date.now()}-${generateId()}.${ext}`

  // Upload to R2
  try {
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        uploadedBy: user.userId,
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    })

    // Generate public URL (using R2 public access or presigned URL)
    // For now, return the key - the frontend can construct the URL
    const url = `${c.env.ALLOWED_ORIGIN || '*'}/r2/${key}`

    // If task_id is provided, save to task_images
    const taskId = formData.get('task_id') as string | null
    if (taskId) {
      await c.env.DB.prepare(
        'INSERT INTO task_images (id, task_id, name, url, r2_key) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), taskId, file.name, url, key).run()
    }

    return c.json({
      success: true,
      data: {
        key,
        url,
        name: file.name,
        size: file.size,
        type: file.type
      }
    }, 201)
  } catch (err: any) {
    console.error('[Upload] R2 upload failed:', err)
    return c.json({ success: false, error: `上传失败: ${err.message}` }, 500)
  }
})

// GET /upload/:key - Get image info by R2 key
upload.get('/:key{.+}', async (c) => {
  if (!c.env.BUCKET) {
    return c.json({ success: false, error: 'R2 存储桶未配置' }, 503)
  }

  const key = c.req.param('key')
  const object = await c.env.BUCKET.get(key)

  if (!object) {
    return c.json({ success: false, error: '文件不存在' }, 404)
  }

  // Return the file directly with proper content type
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Length': object.size.toString(),
      'Cache-Control': 'public, max-age=31536000'
    }
  })
})

export default upload

import { useState } from 'react'
import { ExternalLink, Plus, X, Edit2, Check, Globe, Briefcase, Rocket } from 'lucide-react'

interface QuickLink {
  id: string
  name: string
  url: string
  icon?: string
  color?: string
  group?: string
}

interface LinkGroup {
  id: string
  name: string
  icon: React.ElementType
  color: string
}

const STORAGE_KEY = 'workbench_quick_links'

const GROUPS: LinkGroup[] = [
  { id: 'product', name: '产品工作', icon: Briefcase, color: 'text-blue-600' },
  { id: 'growth', name: '自我提升', icon: Rocket, color: 'text-green-600' },
]

const DEFAULT_LINKS: QuickLink[] = [
  { id: '1', name: '工作台', url: 'https://workbench-22i.pages.dev', color: 'bg-purple-500', group: 'growth' },
  { id: '2', name: '验收管家', url: 'https://uat-frontend-4n3.pages.dev', color: 'bg-blue-500', group: 'product' },
  { id: '3', name: '港股打新前台', url: 'https://hkipo.pages.dev/', color: 'bg-green-500', group: 'growth' },
  { id: '4', name: '需求池', url: 'https://alidocs.dingtalk.com/i/nodes/QOG9lyrgJP3OBw13CboDZpLlVzN67Mw4?utm_scene=person_space', color: 'bg-orange-500', group: 'product' },
  { id: '5', name: '发布日志管理', url: 'http://platform.cic.inter/support-operation/sail-platform/releaseNote/query', color: 'bg-indigo-500', group: 'product' },
  { id: '6', name: '股票学习', url: 'http://localhost:8848/index.html', color: 'bg-red-500', group: 'growth' },
]

const COLOR_OPTIONS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500',
  'bg-orange-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
]

function loadLinks(): QuickLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as QuickLink[]
      // 兼容旧数据：没有 group 字段的链接归入 growth
      return parsed.map(l => ({ ...l, group: l.group || 'growth' }))
    }
  } catch { /* ignore */ }
  return DEFAULT_LINKS
}

function saveLinks(links: QuickLink[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
}

export default function QuickLinks() {
  const [links, setLinks] = useState<QuickLink[]>(loadLinks)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', url: '', color: 'bg-purple-500', group: 'product' })

  const handleAdd = () => {
    if (!form.name.trim() || !form.url.trim()) return
    const newLink: QuickLink = {
      id: Date.now().toString(),
      name: form.name.trim(),
      url: form.url.trim(),
      color: form.color,
      group: form.group,
    }
    const updated = [...links, newLink]
    setLinks(updated)
    saveLinks(updated)
    setForm({ name: '', url: '', color: 'bg-purple-500', group: 'product' })
    setIsAdding(false)
  }

  const handleDelete = (id: string) => {
    const updated = links.filter(l => l.id !== id)
    setLinks(updated)
    saveLinks(updated)
  }

  const handleEditStart = (link: QuickLink) => {
    setEditingId(link.id)
    setForm({ name: link.name, url: link.url, color: link.color || 'bg-purple-500', group: link.group || 'growth' })
  }

  const handleEditSave = (id: string) => {
    if (!form.name.trim() || !form.url.trim()) return
    const updated = links.map(l => l.id === id ? { ...l, name: form.name.trim(), url: form.url.trim(), color: form.color, group: form.group } : l)
    setLinks(updated)
    saveLinks(updated)
    setEditingId(null)
    setForm({ name: '', url: '', color: 'bg-purple-500', group: 'product' })
  }

  const renderLink = (link: QuickLink) => {
    if (editingId === link.id) {
      return (
        <div key={link.id} className="p-3 border border-purple-200 rounded-lg bg-purple-50 space-y-2">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="名称"
          />
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="URL"
          />
          <div className="flex items-center gap-1.5">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`w-4 h-4 rounded-full ${c} ${form.color === c ? 'ring-2 ring-offset-1 ring-purple-400' : ''}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
              className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={() => handleEditSave(link.id)} className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
              <Check className="w-3 h-3" /> 保存
            </button>
            <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800">取消</button>
          </div>
        </div>
      )
    }

    return (
      <a
        key={link.id}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
        title={link.url}
      >
        <div className={`w-8 h-8 rounded-lg ${link.color || 'bg-purple-500'} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-sm font-bold">{link.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{link.name}</p>
          <p className="text-xs text-gray-400 truncate">{link.url.replace(/^https?:\/\//, '').split('/').slice(0, 1).join('/')}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditStart(link) }}
            className="p-1 text-gray-400 hover:text-purple-600 rounded"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(link.id) }}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
      </a>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-600" />
          快捷链接
        </h3>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            添加
          </button>
        )}
      </div>

      <div className="space-y-4">
        {GROUPS.map(group => {
          const GroupIcon = group.icon
          const groupLinks = links.filter(l => l.group === group.id)
          if (groupLinks.length === 0 && !isAdding) return null
          return (
            <div key={group.id}>
              <div className="flex items-center gap-1.5 mb-2">
                <GroupIcon className={`w-3.5 h-3.5 ${group.color}`} />
                <span className={`text-xs font-semibold ${group.color}`}>{group.name}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {groupLinks.map(renderLink)}
              </div>
            </div>
          )
        })}

        {/* 添加表单 */}
        {isAdding && (
          <div className="p-3 border border-dashed border-purple-300 rounded-lg bg-purple-50/50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="名称"
                autoFocus
              />
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="https://..."
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-4 h-4 rounded-full ${c} ${form.color === c ? 'ring-2 ring-offset-1 ring-purple-400' : ''}`}
                    />
                  ))}
                </div>
                <select
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value })}
                  className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">添加</button>
                <button onClick={() => { setIsAdding(false); setForm({ name: '', url: '', color: 'bg-purple-500', group: 'product' }) }} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800">取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

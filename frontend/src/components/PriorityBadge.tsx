import React from 'react'

interface PriorityBadgeProps {
  priority: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ 
  priority, 
  size = 'md',
  showLabel = false 
}) => {
  // 提取优先级代码（P0, P1, P2, P3）
  const getPriorityCode = (priority: string): string => {
    if (priority.includes('P0')) return 'P0'
    if (priority.includes('P1')) return 'P1'
    if (priority.includes('P2')) return 'P2'
    if (priority.includes('P3')) return 'P3'
    return 'P3'
  }

  // 获取优先级样式
  const getPriorityStyle = (priorityCode: string) => {
    const styles = {
      P0: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-500',
        label: '重要紧急'
      },
      P1: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-500',
        label: '重要不紧急'
      },
      P2: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-500',
        label: '紧急不重要'
      },
      P3: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-500',
        label: '不紧急不重要'
      }
    }
    return styles[priorityCode as keyof typeof styles] || styles.P3
  }

  // 获取尺寸样式
  const getSizeStyle = (size: string) => {
    const sizes = {
      sm: 'px-1.5 py-0.5 text-xs',
      md: 'px-2 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm'
    }
    return sizes[size as keyof typeof sizes] || sizes.md
  }

  const priorityCode = getPriorityCode(priority)
  const style = getPriorityStyle(priorityCode)
  const sizeStyle = getSizeStyle(size)

  return (
    <span 
      className={`inline-flex items-center rounded-md font-medium ${style.bg} ${style.text} ${sizeStyle}`}
    >
      {priorityCode}
      {showLabel && <span className="ml-1">{style.label}</span>}
    </span>
  )
}

export default PriorityBadge

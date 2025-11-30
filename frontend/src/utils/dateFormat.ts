/**
 * 日期格式化工具函数
 */

/**
 * 格式化日期为中文格式：2025年11月28日
 * @param dateString ISO日期字符串或日期字符串
 * @returns 格式化后的日期字符串（北京时间）
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    // 使用 toLocaleString 转换为北京时间
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }
    
    const parts = new Intl.DateTimeFormat('zh-CN', options).formatToParts(date)
    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    
    return `${year}年${month}月${day}日`
  } catch (error) {
    return dateString
  }
}

/**
 * 格式化日期时间为：2025年11月28日 15:35
 * @param dateString ISO日期时间字符串
 * @returns 格式化后的日期时间字符串（北京时间）
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    // 使用 toLocaleString 转换为北京时间
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
    
    const parts = new Intl.DateTimeFormat('zh-CN', options).formatToParts(date)
    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    const hour = parts.find(p => p.type === 'hour')?.value || ''
    const minute = parts.find(p => p.type === 'minute')?.value || ''
    
    return `${year}年${month}月${day}日 ${hour}:${minute}`
  } catch (error) {
    return dateString
  }
}

/**
 * 格式化为简短日期：11/28
 * @param dateString ISO日期字符串
 * @returns 格式化后的简短日期（北京时间）
 */
export const formatShortDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    // 使用 toLocaleString 转换为北京时间
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Shanghai',
      month: 'numeric',
      day: 'numeric'
    }
    
    const parts = new Intl.DateTimeFormat('zh-CN', options).formatToParts(date)
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    
    return `${month}/${day}`
  } catch (error) {
    return dateString
  }
}

/**
 * 判断日期是否包含时间信息
 * @param dateString ISO日期字符串
 * @returns 是否包含时间（北京时间）
 */
export const hasTime = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return false
    
    // 使用 toLocaleString 获取北京时间的小时、分钟、秒
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Shanghai',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }
    
    const parts = new Intl.DateTimeFormat('zh-CN', options).formatToParts(date)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')
    
    // 如果小时、分钟、秒都是0，认为没有时间信息
    return hour !== 0 || minute !== 0 || second !== 0
  } catch (error) {
    return false
  }
}

/**
 * 智能格式化日期：根据是否有时间自动选择格式
 * @param dateString ISO日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDateSmart = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  
  if (hasTime(dateString)) {
    return formatDateTime(dateString)
  } else {
    return formatDate(dateString)
  }
}

/**
 * 格式化相对时间：刚刚、5分钟前、今天、昨天等
 * @param dateString ISO日期字符串
 * @returns 相对时间描述（北京时间）
 */
export const formatRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    
    return formatDate(dateString)
  } catch (error) {
    return dateString
  }
}

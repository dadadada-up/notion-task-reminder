// =============================================
// Date utilities - Beijing time (Asia/Shanghai)
// 与前端 getTodayStr() 口径一致
// =============================================

/** 获取北京时间的今天 YYYY-MM-DD */
export function getBeijingToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
}

/** 获取当前 ISO 时间戳 */
export function nowISO(): string {
  return new Date().toISOString()
}

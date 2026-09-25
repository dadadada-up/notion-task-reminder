/** 完成庆祝：在目标元素位置迸发 emoji 彩带 */
export function celebrate(target: HTMLElement) {
  const r = target.getBoundingClientRect()
  const emojis = ['🎉', '✨', '✅', '🌟']
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('div')
    b.textContent = emojis[i % emojis.length]
    b.style.cssText = `position:fixed;left:${r.left + r.width / 2 + (Math.random() * 50 - 25)}px;top:${r.top + r.height / 2}px;font-size:18px;pointer-events:none;z-index:99;transition:all .9s ease-out;opacity:1`
    document.body.appendChild(b)
    requestAnimationFrame(() => {
      b.style.transform = `translate(${Math.random() * 60 - 30}px,-120px) scale(1.4)`
      b.style.opacity = '0'
    })
    setTimeout(() => b.remove(), 900)
  }
}

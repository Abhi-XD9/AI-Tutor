import { useEffect, useRef } from 'react'

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  const value = parseInt(expanded, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

const mixColor = (from, to, amount) => {
  const start = hexToRgb(from)
  const end = hexToRgb(to)

  const r = Math.round(start.r + (end.r - start.r) * amount)
  const g = Math.round(start.g + (end.g - start.g) * amount)
  const b = Math.round(start.b + (end.b - start.b) * amount)

  return `rgb(${r}, ${g}, ${b})`
}

const DotField = ({
  dotRadius = 1.5,
  dotSpacing = 14,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = false,
  gradientFrom = '#A855F7',
  gradientTo = '#B497CF',
  glowColor = '#120F17',
}) => {
  const canvasRef = useRef(null)
  const pointerRef = useRef({ x: -1000, y: -1000, active: false })
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d')
    if (!context) return undefined

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return

      const { width, height } = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const render = (time) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      context.clearRect(0, 0, width, height)

      if (!bulgeOnly) {
        const backgroundGradient = context.createLinearGradient(0, 0, width, height)
        backgroundGradient.addColorStop(0, 'rgba(8, 10, 18, 0.3)')
        backgroundGradient.addColorStop(1, 'rgba(12, 9, 22, 0.08)')
        context.fillStyle = backgroundGradient
        context.fillRect(0, 0, width, height)
      }

      if (pointerRef.current.active) {
        const glow = context.createRadialGradient(
          pointerRef.current.x,
          pointerRef.current.y,
          0,
          pointerRef.current.x,
          pointerRef.current.y,
          glowRadius,
        )
        glow.addColorStop(0, `${glowColor}99`)
        glow.addColorStop(1, `${glowColor}00`)
        context.fillStyle = glow
        context.fillRect(0, 0, width, height)
      }

      const cols = Math.ceil(width / dotSpacing) + 1
      const rows = Math.ceil(height / dotSpacing) + 1

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const baseX = col * dotSpacing
          const baseY = row * dotSpacing
          const dx = pointerRef.current.x - baseX
          const dy = pointerRef.current.y - baseY
          const distance = Math.hypot(dx, dy)
          const influence = pointerRef.current.active
            ? Math.max(0, 1 - distance / cursorRadius)
            : 0

          const push = influence * influence * cursorForce * bulgeStrength
          const offsetX = distance > 0 ? (-dx / distance) * push : 0
          const offsetY = distance > 0 ? (-dy / distance) * push : 0
          const wave = waveAmplitude
            ? Math.sin((baseX + baseY + time * 0.08) / 42) * waveAmplitude
            : 0

          const x = baseX + offsetX
          const y = baseY + offsetY + wave
          const t = width > 0 ? x / width : 0
          const radiusBoost = influence * (dotRadius * 0.9)
          const currentRadius = dotRadius + radiusBoost
          const alpha = 0.24 + influence * 0.55 + (sparkle ? ((row + col) % 7) * 0.01 : 0)

          context.beginPath()
          context.arc(x, y, currentRadius, 0, Math.PI * 2)
          context.fillStyle = mixColor(gradientFrom, gradientTo, Math.min(Math.max(t, 0), 1))
          context.globalAlpha = Math.min(alpha, 1)
          context.fill()
        }
      }

      context.globalAlpha = 1
      frameRef.current = window.requestAnimationFrame(render)
    }

    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      }
    }

    const handlePointerLeave = () => {
      pointerRef.current = {
        x: -1000,
        y: -1000,
        active: false,
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
    }

    resize()
    frameRef.current = window.requestAnimationFrame(render)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      window.cancelAnimationFrame(frameRef.current)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [
    bulgeOnly,
    bulgeStrength,
    cursorForce,
    cursorRadius,
    dotRadius,
    dotSpacing,
    glowColor,
    glowRadius,
    gradientFrom,
    gradientTo,
    sparkle,
    waveAmplitude,
  ])

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
}

export default DotField

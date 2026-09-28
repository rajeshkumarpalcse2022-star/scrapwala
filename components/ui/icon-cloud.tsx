"use client"

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Pause, Play } from "lucide-react"
import { renderToString } from "react-dom/server"

interface Icon {
  x: number
  y: number
  z: number
  scale: number
  opacity: number
  id: number
}

interface IconCloudProps {
  icons?: React.ReactNode[]
  images?: string[]
  showControl?: boolean
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function IconCloud({
  icons,
  images,
  showControl = true,
}: IconCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pauseOverride, setPauseOverride] = useState<boolean | null>(null)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [targetRotation, setTargetRotation] = useState<{
    x: number
    y: number
    startX: number
    startY: number
    distance: number
    startTime: number
    duration: number
  } | null>(null)
  const animationFrameRef = useRef<number>(0)
  const rotationRef = useRef({ x: 0, y: 0 })
  const iconCanvasesRef = useRef<HTMLCanvasElement[]>([])
  const imagesLoadedRef = useRef<boolean[]>([])

  // Respect prefers-reduced-motion; an explicit user toggle overrides it
  const prefersReducedMotion = useSyncExternalStore(
    (callback) => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      mediaQuery.addEventListener("change", callback)
      return () => mediaQuery.removeEventListener("change", callback)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  )
  const isPaused = pauseOverride ?? prefersReducedMotion

  // Create icon canvases once when icons/images change
  useEffect(() => {
    if (!icons && !images) return

    const items = icons ?? images ?? []
    imagesLoadedRef.current = new Array(items.length).fill(false)

    const newIconCanvases = items.map((item, index) => {
      const offscreen = document.createElement("canvas")
      offscreen.width = 96
      offscreen.height = 96
      const offCtx = offscreen.getContext("2d")

      if (offCtx) {
        if (images) {
          // Handle image URLs directly
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.src = items[index] as string
          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height)

            // Create circular clipping path
            offCtx.beginPath()
            offCtx.arc(48, 48, 48, 0, Math.PI * 2)
            offCtx.closePath()
            offCtx.clip()

            // Draw the image
            offCtx.drawImage(img, 0, 0, 96, 96)

            imagesLoadedRef.current[index] = true
          }
        } else {
          // Handle SVG icons
          offCtx.scale(0.4, 0.4)
          const svgString = renderToString(item as React.ReactElement)
          const img = new Image()
          img.src = "data:image/svg+xml;base64," + btoa(svgString)
          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height)
            offCtx.drawImage(img, 0, 0)
            imagesLoadedRef.current[index] = true
          }
        }
      }
      return offscreen
    })

    iconCanvasesRef.current = newIconCanvases
  }, [icons, images])

  // Icon positions on a Fibonacci sphere, derived from the provided items
  const iconPositions = useMemo<Icon[]>(() => {
    const items = icons ?? images ?? []
    const newIcons: Icon[] = []
    const numIcons = items.length || 20

    // Fibonacci sphere parameters
    const offset = 2 / numIcons
    const increment = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < numIcons; i++) {
      const y = i * offset - 1 + offset / 2
      const r = Math.sqrt(1 - y * y)
      const phi = i * increment

      const x = Math.cos(phi) * r
      const z = Math.sin(phi) * r

      newIcons.push({
        x: x * 115,
        y: y * 115,
        z: z * 115,
        scale: 1,
        opacity: 1,
        id: i,
      })
    }
    return newIcons
  }, [icons, images])

  // Convert pointer position from CSS pixels to canvas pixels. The canvas is
  // scaled responsively, so hit-testing must use the same coordinate space
  // the icons are drawn in.
  const toCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    const scaleX = canvasRef.current!.width / rect.width
    const scaleY = canvasRef.current!.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(e)
    if (!point) return

    const x = point.x
    const y = point.y

    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return

    iconPositions.forEach((icon) => {
      const cosX = Math.cos(rotationRef.current.x)
      const sinX = Math.sin(rotationRef.current.x)
      const cosY = Math.cos(rotationRef.current.y)
      const sinY = Math.sin(rotationRef.current.y)

      const rotatedX = icon.x * cosY - icon.z * sinY
      const rotatedZ = icon.x * sinY + icon.z * cosY
      const rotatedY = icon.y * cosX + rotatedZ * sinX

      const screenX = canvasRef.current!.width / 2 + rotatedX
      const screenY = canvasRef.current!.height / 2 + rotatedY

          const scale = 0.6 + ((rotatedZ + 100) / 200) * 0.4
          const radius = 48 * scale
      const dx = x - screenX
      const dy = y - screenY

      if (dx * dx + dy * dy < radius * radius) {
        const targetX = -Math.atan2(
          icon.y,
          Math.sqrt(icon.x * icon.x + icon.z * icon.z)
        )
        const targetY = Math.atan2(icon.x, icon.z)

        const currentX = rotationRef.current.x
        const currentY = rotationRef.current.y
        const distance = Math.sqrt(
          Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2)
        )

        const duration = Math.min(2000, Math.max(800, distance * 1000))

        setTargetRotation({
          x: targetX,
          y: targetY,
          startX: currentX,
          startY: currentY,
          distance,
          startTime: performance.now(),
          duration,
        })
        return
      }
    })

    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect && rect.width > 0 && rect.height > 0) {
      const scaleX = canvasRef.current!.width / rect.width
      const scaleY = canvasRef.current!.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      setMousePos({ x, y })
    }

    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y

      rotationRef.current = {
        x: rotationRef.current.x + deltaY * 0.002,
        y: rotationRef.current.y + deltaX * 0.002,
      }

      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) {
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
        const dx = mousePos.x - centerX
        const dy = mousePos.y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const speed = 0.003 + (distance / maxDistance) * 0.01

        if (targetRotation) {
          const elapsed = performance.now() - targetRotation.startTime
          const progress = Math.min(1, elapsed / targetRotation.duration)
          const easedProgress = easeOutCubic(progress)

          rotationRef.current = {
            x:
              targetRotation.startX +
              (targetRotation.x - targetRotation.startX) * easedProgress,
            y:
              targetRotation.startY +
              (targetRotation.y - targetRotation.startY) * easedProgress,
          }

          if (progress >= 1) {
            setTargetRotation(null)
          }
        } else if (!isDragging && !isPaused) {
          rotationRef.current = {
            x: rotationRef.current.x + (dy / canvas.height) * speed,
            y: rotationRef.current.y + (dx / canvas.width) * speed,
          }
        }

        iconPositions.forEach((icon, index) => {
          const cosX = Math.cos(rotationRef.current.x)
          const sinX = Math.sin(rotationRef.current.x)
          const cosY = Math.cos(rotationRef.current.y)
          const sinY = Math.sin(rotationRef.current.y)

          const rotatedX = icon.x * cosY - icon.z * sinY
          const rotatedZ = icon.x * sinY + icon.z * cosY
          const rotatedY = icon.y * cosX + rotatedZ * sinX

          const scale = 0.6 + ((rotatedZ + 100) / 200) * 0.4
          const opacity = Math.max(0.5, Math.min(1, (rotatedZ + 150) / 200))

          ctx.save()
          ctx.translate(
            canvas.width / 2 + rotatedX,
            canvas.height / 2 + rotatedY
          )
          ctx.scale(scale, scale)
          ctx.globalAlpha = opacity

          if (icons || images) {
            // Only try to render icons/images if they exist
            if (
              iconCanvasesRef.current[index] &&
              imagesLoadedRef.current[index]
            ) {
              ctx.drawImage(iconCanvasesRef.current[index], -48, -48, 96, 96)
            }
          } else {
            // Show numbered circles if no icons/images are provided
            ctx.beginPath()
            ctx.arc(0, 0, 20, 0, Math.PI * 2)
            ctx.fillStyle = "#4444ff"
            ctx.fill()
            ctx.fillStyle = "white"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.font = "16px Arial"
            ctx.fillText(`${icon.id + 1}`, 0, 0)
          }

          ctx.restore()
        })

        const hasPendingAssets =
          Boolean(icons || images) &&
          !imagesLoadedRef.current.every((loaded) => loaded)
        const shouldContinue =
          !isPaused || isDragging || targetRotation !== null || hasPendingAssets

        if (shouldContinue) {
          animationFrameRef.current = requestAnimationFrame(animate)
        }
      }

      animate()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [
    icons,
    images,
    iconPositions,
    isDragging,
    isPaused,
    mousePos,
    targetRotation,
  ])

  return (
    <div className="relative inline-block max-w-full">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="h-auto max-w-full rounded-lg"
        aria-label="Interactive 3D Icon Cloud"
        role="img"
      />
      {showControl && (
        <button
          type="button"
          onClick={() => setPauseOverride(!isPaused)}
          aria-label={isPaused ? "Play Animation" : "Pause Animation"}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground"
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  onClose: () => void
}

export default function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.25))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = src
    a.download = src.split('/').pop() || 'image'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.toolbar} onClick={e => e.stopPropagation()}>
        <button style={styles.toolBtn} onClick={() => setZoom(z => Math.min(z + 0.25, 4))} title="Zoom +">
          <ZoomIn size={18} />
        </button>
        <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button style={styles.toolBtn} onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} title="Zoom -">
          <ZoomOut size={18} />
        </button>
        <button style={styles.toolBtn} onClick={handleDownload} title="Télécharger">
          <Download size={18} />
        </button>
        <button style={{ ...styles.toolBtn, marginLeft: 8 }} onClick={onClose} title="Fermer">
          <X size={20} />
        </button>
      </div>
      <div style={styles.imageWrap} onClick={e => e.stopPropagation()}>
        <img
          src={src}
          alt=""
          style={{
            ...styles.image,
            transform: `scale(${zoom})`,
          }}
          onWheel={e => {
            e.preventDefault()
            setZoom(z => Math.min(Math.max(z + (e.deltaY < 0 ? 0.1 : -0.1), 0.25), 4))
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.85)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease both',
  },
  toolbar: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(0,0,0,.5)',
    borderRadius: 12,
    padding: '6px 10px',
    backdropFilter: 'blur(8px)',
    zIndex: 10,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  zoomLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,.7)',
    minWidth: 40,
    textAlign: 'center' as any,
    fontVariantNumeric: 'tabular-nums',
  },
  imageWrap: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain' as any,
    borderRadius: 8,
    transition: 'transform 0.15s ease',
    cursor: 'zoom-in',
    userSelect: 'none' as any,
  },
}

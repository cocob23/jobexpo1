// src/components/ui/ImageGallery.tsx
import React, { useState } from 'react'
import { Card } from './Card'
import { FaExpand, FaTimes, FaTrash, FaUpload, FaPlus } from 'react-icons/fa'

interface Image {
  id: string
  url: string
  name: string
  size?: string
  uploadedAt?: string
}

interface ImageGalleryProps {
  images: Image[]
  onImageAdd?: (files: FileList) => void
  onImageDelete?: (imageId: string) => void
  onImageView?: (image: Image) => void
  editable?: boolean
  maxImages?: number
  className?: string
  title?: string
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images = [],
  onImageAdd,
  onImageDelete,
  onImageView,
  editable = false,
  maxImages = 10,
  className = '',
  title = 'Galería de Imágenes',
}) => {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = (files: FileList) => {
    if (files.length === 0) return
    if (images.length + files.length > maxImages) {
      alert(`Máximo ${maxImages} imágenes permitidas`)
      return
    }
    onImageAdd?.(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    handleFileUpload(files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files)
    }
  }

  const openModal = (image: Image) => {
    setSelectedImage(image)
    onImageView?.(image)
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  return (
    <div className={`image-gallery ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <span style={styles.counter}>
          {images.length} / {maxImages} imágenes
        </span>
      </div>

      {/* Upload Area */}
      {editable && images.length < maxImages && (
        <div
          style={{
            ...styles.uploadArea,
            ...(dragOver ? styles.uploadAreaDragOver : {}),
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FaUpload style={styles.uploadIcon} />
          <p style={styles.uploadText}>
            Arrastra imágenes aquí o{' '}
            <label style={styles.uploadLabel}>
              selecciona archivos
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInputChange}
                style={styles.hiddenInput}
              />
            </label>
          </p>
          <p style={styles.uploadSubtext}>
            Formatos: JPG, PNG, WebP. Máximo 5MB por imagen.
          </p>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 ? (
        <div style={styles.grid}>
          {images.map((image) => (
            <Card
              key={image.id}
              variant="elevated"
              padding="sm"
              style={styles.imageCard}
              className="image-card"
            >
              <div style={styles.imageContainer}>
                <img
                  src={image.url}
                  alt={image.name}
                  style={styles.image}
                  onClick={() => openModal(image)}
                />
                
                {/* Overlay with actions */}
                <div style={styles.overlay}>
                  <button
                    style={styles.actionButton}
                    onClick={() => openModal(image)}
                    title="Ver imagen completa"
                  >
                    <FaExpand />
                  </button>
                  
                  {editable && onImageDelete && (
                    <button
                      style={{ ...styles.actionButton, ...styles.deleteButton }}
                      onClick={() => onImageDelete(image.id)}
                      title="Eliminar imagen"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Image Info */}
              <div style={styles.imageInfo}>
                <p style={styles.imageName}>{image.name}</p>
                {image.size && (
                  <p style={styles.imageSize}>{image.size}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        !editable && (
          <Card variant="default" padding="lg" style={styles.emptyState}>
            <p style={styles.emptyText}>No hay imágenes disponibles</p>
          </Card>
        )
      )}

      {/* Modal for full-size image view */}
      {selectedImage && (
        <div style={styles.modal} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={closeModal}>
              <FaTimes />
            </button>
            
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              style={styles.modalImage}
            />
            
            <div style={styles.modalInfo}>
              <h4 style={styles.modalTitle}>{selectedImage.name}</h4>
              {selectedImage.size && (
                <p style={styles.modalSize}>Tamaño: {selectedImage.size}</p>
              )}
              {selectedImage.uploadedAt && (
                <p style={styles.modalDate}>
                  Subido: {new Date(selectedImage.uploadedAt).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },

  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    margin: 0,
  },

  counter: {
    fontSize: '0.875rem',
    color: 'var(--neutral-500)',
    padding: '0.25rem 0.75rem',
    backgroundColor: 'var(--neutral-100)',
    borderRadius: '1rem',
    fontWeight: '500',
  },

  uploadArea: {
    border: '2px dashed var(--neutral-300)',
    borderRadius: '1rem',
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: 'var(--neutral-50)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '1.5rem',
  },

  uploadAreaDragOver: {
    borderColor: 'var(--primary-500)',
    backgroundColor: 'var(--primary-50)',
    transform: 'scale(1.02)',
  },

  uploadIcon: {
    fontSize: '2rem',
    color: 'var(--neutral-400)',
    marginBottom: '1rem',
  },

  uploadText: {
    fontSize: '1rem',
    color: 'var(--neutral-600)',
    margin: '0 0 0.5rem 0',
  },

  uploadSubtext: {
    fontSize: '0.875rem',
    color: 'var(--neutral-500)',
    margin: 0,
  },

  uploadLabel: {
    color: 'var(--primary-500)',
    fontWeight: '600',
    textDecoration: 'underline',
    cursor: 'pointer',
  },

  hiddenInput: {
    display: 'none',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },

  imageCard: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    position: 'relative',
  },

  imageContainer: {
    position: 'relative',
    paddingBottom: '75%', // 4:3 aspect ratio
    overflow: 'hidden',
    borderRadius: '0.5rem',
  },

  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.2s ease',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },

  actionButton: {
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: 'var(--neutral-700)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '1rem',
  },

  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
  },

  imageInfo: {
    padding: '0.75rem 0 0 0',
  },

  imageName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--neutral-700)',
    margin: '0 0 0.25rem 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  imageSize: {
    fontSize: '0.75rem',
    color: 'var(--neutral-500)',
    margin: 0,
  },

  emptyState: {
    textAlign: 'center',
  },

  emptyText: {
    color: 'var(--neutral-500)',
    fontSize: '1rem',
    margin: 0,
  },

  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '1rem',
  },

  modalContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
    backgroundColor: 'white',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-2xl)',
  },

  modalImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '70vh',
    objectFit: 'contain',
  },

  modalInfo: {
    padding: '1rem',
  },

  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    margin: '0 0 0.5rem 0',
  },

  modalSize: {
    fontSize: '0.875rem',
    color: 'var(--neutral-600)',
    margin: '0 0 0.25rem 0',
  },

  modalDate: {
    fontSize: '0.875rem',
    color: 'var(--neutral-500)',
    margin: 0,
  },

  closeButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1.25rem',
    zIndex: 1,
    transition: 'all 0.2s ease',
  },
}

// Add CSS for hover effects
const globalStyles = `
.image-card:hover .image-card img {
  transform: scale(1.05);
}

.image-card:hover .overlay {
  opacity: 1;
}

.image-gallery button:hover {
  transform: translateY(-1px);
}
`

// Inject global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = globalStyles
  document.head.appendChild(style)
}
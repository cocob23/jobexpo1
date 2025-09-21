// src/superadmin/inventario-armas.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaArrowLeft, 
  FaPlus, 
  FaFilter, 
  FaSearch, 
  FaShieldAlt,
  FaBolt,
  FaCrosshairs 
} from 'react-icons/fa'
import { Card, Button, Input, ImageGallery } from '../components/ui'

interface Weapon {
  id: string
  nombre: string
  categoria: 'pistola' | 'rifle' | 'escopeta' | 'subfusil'
  calibre: string
  marca: string
  modelo: string
  numeroSerie: string
  precio: number
  stock: number
  descripcion: string
  imagenes: Array<{
    id: string
    url: string
    name: string
    size: string
    uploadedAt: string
  }>
  fechaCreacion: string
}

const SAMPLE_WEAPONS: Weapon[] = [
  {
    id: '1',
    nombre: 'Glock 17 Gen 5',
    categoria: 'pistola',
    calibre: '9mm',
    marca: 'Glock',
    modelo: 'G17 Gen 5',
    numeroSerie: 'ABC123456',
    precio: 85000,
    stock: 5,
    descripcion: 'Pistola semiautomática de alta calidad, ideal para uso profesional y deportivo.',
    imagenes: [
      { id: '1', url: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400', name: 'glock-17-frente.jpg', size: '2.1 MB', uploadedAt: '2024-01-15' },
      { id: '2', url: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=400', name: 'glock-17-lateral.jpg', size: '1.8 MB', uploadedAt: '2024-01-15' },
    ],
    fechaCreacion: '2024-01-15'
  },
  {
    id: '2',
    nombre: 'AR-15 Tactical',
    categoria: 'rifle',
    calibre: '.223 Rem',
    marca: 'Smith & Wesson',
    modelo: 'M&P15 Sport II',
    numeroSerie: 'DEF789012',
    precio: 145000,
    stock: 2,
    descripcion: 'Rifle de asalto táctico con sistema modular y accesorios intercambiables.',
    imagenes: [
      { id: '3', url: 'https://images.unsplash.com/photo-1566823447960-ac3b556c9d35?w=400', name: 'ar15-completo.jpg', size: '3.2 MB', uploadedAt: '2024-01-16' },
    ],
    fechaCreacion: '2024-01-16'
  }
]

export default function InventarioArmas() {
  const navigate = useNavigate()
  const [weapons, setWeapons] = useState<Weapon[]>(SAMPLE_WEAPONS)
  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const filteredWeapons = weapons.filter(weapon => {
    const matchesSearch = weapon.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         weapon.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         weapon.modelo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || weapon.categoria === filterCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pistola': return <FaShieldAlt />
      case 'rifle': return <FaCrosshairs />
      case 'escopeta': return <FaBolt />
      case 'subfusil': return <FaShieldAlt />
      default: return <FaShieldAlt />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pistola': return 'var(--primary-500)'
      case 'rifle': return 'var(--secondary-500)'
      case 'escopeta': return 'var(--success-500)'
      case 'subfusil': return 'var(--warning-500)'
      default: return 'var(--neutral-500)'
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price)
  }

  const handleImageAdd = (weaponId: string, files: FileList) => {
    // En un caso real, aquí subirías las imágenes al servidor
    console.log(`Agregando ${files.length} imágenes al arma ${weaponId}`)
    // Simulamos la adición de imágenes
    const newImages = Array.from(files).map((file, index) => ({
      id: `${weaponId}-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString()
    }))

    setWeapons(prev => prev.map(weapon => 
      weapon.id === weaponId 
        ? { ...weapon, imagenes: [...weapon.imagenes, ...newImages] }
        : weapon
    ))
  }

  const handleImageDelete = (weaponId: string, imageId: string) => {
    setWeapons(prev => prev.map(weapon => 
      weapon.id === weaponId 
        ? { ...weapon, imagenes: weapon.imagenes.filter(img => img.id !== imageId) }
        : weapon
    ))
  }

  return (
    <div style={styles.container} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/superadmin')}
          >
            <FaArrowLeft style={{ marginRight: '0.5rem' }} />
            Volver
          </Button>
          <div style={styles.titleContainer}>
            <FaShieldAlt style={styles.titleIcon} />
            <div>
              <h1 style={styles.title}>Inventario de Armas</h1>
              <p style={styles.subtitle}>Gestión de armamento y equipos tácticos</p>
            </div>
          </div>
        </div>

        <div style={styles.headerActions}>
          <Button variant="primary" size="md">
            <FaPlus style={{ marginRight: '0.5rem' }} />
            Agregar Arma
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card variant="elevated" padding="md" style={styles.filtersCard}>
        <div style={styles.filters}>
          <div style={styles.searchContainer}>
            <Input
              placeholder="Buscar armas por nombre, marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<FaSearch />}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.categoryFilters}>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={styles.categorySelect}
            >
              <option value="all">Todas las categorías</option>
              <option value="pistola">Pistolas</option>
              <option value="rifle">Rifles</option>
              <option value="escopeta">Escopetas</option>
              <option value="subfusil">Subfusiles</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      <div style={styles.results}>
        <p style={styles.resultsText}>
          Mostrando {filteredWeapons.length} de {weapons.length} armas
        </p>
      </div>

      {/* Weapons Grid */}
      <div style={styles.weaponsGrid}>
        {filteredWeapons.map((weapon) => (
          <Card
            key={weapon.id}
            variant="elevated"
            padding="lg"
            style={styles.weaponCard}
            onClick={() => setSelectedWeapon(weapon)}
          >
            {/* Category Badge */}
            <div 
              style={{
                ...styles.categoryBadge,
                backgroundColor: getCategoryColor(weapon.categoria),
              }}
            >
              {getCategoryIcon(weapon.categoria)}
              <span>{weapon.categoria.toUpperCase()}</span>
            </div>

            {/* Weapon Image */}
            <div style={styles.weaponImageContainer}>
              {weapon.imagenes.length > 0 ? (
                <img
                  src={weapon.imagenes[0].url}
                  alt={weapon.nombre}
                  style={styles.weaponImage}
                />
              ) : (
                <div style={styles.noImage}>
                  <FaShieldAlt style={styles.noImageIcon} />
                  <span>Sin imagen</span>
                </div>
              )}
            </div>

            {/* Weapon Info */}
            <div style={styles.weaponInfo}>
              <h3 style={styles.weaponName}>{weapon.nombre}</h3>
              <p style={styles.weaponDetails}>
                {weapon.marca} {weapon.modelo} • {weapon.calibre}
              </p>
              <p style={styles.weaponSerial}>Serie: {weapon.numeroSerie}</p>
              
              <div style={styles.weaponMetrics}>
                <div style={styles.priceContainer}>
                  <span style={styles.price}>{formatPrice(weapon.precio)}</span>
                </div>
                <div style={styles.stockContainer}>
                  <span style={styles.stock}>Stock: {weapon.stock}</span>
                </div>
              </div>
              
              <div style={styles.imageCount}>
                📷 {weapon.imagenes.length} imagen{weapon.imagenes.length !== 1 ? 'es' : ''}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weapon Detail Modal */}
      {selectedWeapon && (
        <div style={styles.modal} onClick={() => setSelectedWeapon(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{selectedWeapon.nombre}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWeapon(null)}
              >
                ✕
              </Button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.weaponDetailGrid}>
                <div style={styles.weaponDetailLeft}>
                  <Card variant="default" padding="md">
                    <h4 style={styles.sectionTitle}>Información General</h4>
                    <div style={styles.detailRow}>
                      <strong>Marca:</strong> {selectedWeapon.marca}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>Modelo:</strong> {selectedWeapon.modelo}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>Calibre:</strong> {selectedWeapon.calibre}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>N° Serie:</strong> {selectedWeapon.numeroSerie}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>Precio:</strong> {formatPrice(selectedWeapon.precio)}
                    </div>
                    <div style={styles.detailRow}>
                      <strong>Stock:</strong> {selectedWeapon.stock} unidades
                    </div>
                    <div style={styles.detailRow}>
                      <strong>Descripción:</strong>
                      <p style={styles.description}>{selectedWeapon.descripcion}</p>
                    </div>
                  </Card>
                </div>

                <div style={styles.weaponDetailRight}>
                  <ImageGallery
                    images={selectedWeapon.imagenes}
                    title="Imágenes del Arma"
                    editable={true}
                    maxImages={8}
                    onImageAdd={(files) => handleImageAdd(selectedWeapon.id, files)}
                    onImageDelete={(imageId) => handleImageDelete(selectedWeapon.id, imageId)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },

  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },

  titleIcon: {
    fontSize: '2rem',
    color: 'var(--primary-500)',
  },

  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--neutral-800)',
    margin: 0,
  },

  subtitle: {
    fontSize: '1rem',
    color: 'var(--neutral-600)',
    margin: 0,
  },

  headerActions: {
    display: 'flex',
    gap: '1rem',
  },

  filtersCard: {
    marginBottom: '1.5rem',
  },

  filters: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  searchContainer: {
    flex: 1,
    minWidth: '300px',
  },

  searchInput: {
    width: '100%',
  },

  categoryFilters: {
    display: 'flex',
    gap: '1rem',
  },

  categorySelect: {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--neutral-300)',
    backgroundColor: 'white',
    color: 'var(--neutral-700)',
    minWidth: '200px',
  },

  results: {
    marginBottom: '1rem',
  },

  resultsText: {
    color: 'var(--neutral-600)',
    fontSize: '0.875rem',
    margin: 0,
  },

  weaponsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },

  weaponCard: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },

  categoryBadge: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    zIndex: 1,
  },

  weaponImageContainer: {
    width: '100%',
    height: '200px',
    overflow: 'hidden',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  },

  weaponImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.2s ease',
  },

  noImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--neutral-100)',
    color: 'var(--neutral-400)',
  },

  noImageIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },

  weaponInfo: {
    padding: '0.5rem 0',
  },

  weaponName: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    margin: '0 0 0.5rem 0',
  },

  weaponDetails: {
    fontSize: '0.875rem',
    color: 'var(--neutral-600)',
    margin: '0 0 0.25rem 0',
  },

  weaponSerial: {
    fontSize: '0.75rem',
    color: 'var(--neutral-500)',
    margin: '0 0 1rem 0',
    fontFamily: 'monospace',
  },

  weaponMetrics: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },

  priceContainer: {},

  price: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: 'var(--success-600)',
  },

  stockContainer: {},

  stock: {
    fontSize: '0.875rem',
    color: 'var(--neutral-600)',
  },

  imageCount: {
    fontSize: '0.75rem',
    color: 'var(--primary-500)',
    fontWeight: '500',
  },

  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    maxWidth: '1000px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-2xl)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    borderBottom: '1px solid var(--neutral-200)',
  },

  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    margin: 0,
  },

  modalBody: {
    padding: '2rem',
    overflow: 'auto',
    maxHeight: 'calc(90vh - 100px)',
  },

  weaponDetailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
  },

  weaponDetailLeft: {},

  weaponDetailRight: {},

  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    margin: '0 0 1rem 0',
  },

  detailRow: {
    marginBottom: '0.75rem',
    fontSize: '0.875rem',
    color: 'var(--neutral-700)',
  },

  description: {
    marginTop: '0.5rem',
    lineHeight: '1.6',
    color: 'var(--neutral-600)',
  },
}
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import './responsive.css'

export default function PerfilMantenimiento() {
  const [usuario, setUsuario] = useState<any>(null)
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate('/mantenimiento')
  }

  useEffect(() => {
    void fetchUsuario()
  }, [])

  const fetchUsuario = async () => {
    const { data } = await supabase.auth.getUser()
    setUsuario(data?.user)

    if (data?.user?.id) {
      const { data: usuarioTabla } = await supabase
        .from('usuarios')
        .select('nombre, apellido')
        .eq('id', data.user.id)
        .single()

      setPerfilUsuario(usuarioTabla)
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const cambiarFotoPerfil = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    try {
      const userId = usuario?.id
      const nombre = `${userId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(nombre, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(nombre)
      const publicUrl = urlData.publicUrl

      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      if (updateError) throw updateError

      alert('Foto actualizada')
      await fetchUsuario()
    } catch (err: any) {
      console.error(err)
      alert('Error al subir la imagen: ' + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      <button 
        onClick={handleGoBack} 
        style={{
          position: 'fixed',
          top: 90,
          left: 20,
          backgroundColor: '#6b7280',
          color: '#fff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: 6,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 14,
          zIndex: 999,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        ← Volver
      </button>
      <img src="/logo.png" alt="logo" style={styles.logo as React.CSSProperties} />

      <div style={styles.avatarContainer as React.CSSProperties}>
        <img
          src={usuario?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfilUsuario?.nombre || 'User')}`}
          style={styles.avatar as React.CSSProperties}
          alt="avatar"
        />
        <div>
          <label style={styles.linkCambiarFoto as React.CSSProperties}>
            <input type="file" accept="image/*" onChange={cambiarFotoPerfil} style={{ display: 'none' }} />
            {uploading ? 'Subiendo...' : 'Cambiar foto'}
          </label>
        </div>
      </div>

      <div style={styles.card as React.CSSProperties}>
        {perfilUsuario && (
          <>
            <div style={styles.label as React.CSSProperties}>Nombre:</div>
            <div style={styles.valor as React.CSSProperties}>{perfilUsuario.nombre}</div>

            <div style={styles.label as React.CSSProperties}>Apellido:</div>
            <div style={styles.valor as React.CSSProperties}>{perfilUsuario.apellido}</div>
          </>
        )}

        {usuario && (
          <>
            <div style={styles.label as React.CSSProperties}>Email:</div>
            <div style={styles.valor as React.CSSProperties}>{usuario.email}</div>
          </>
        )}
      </div>

      <button style={styles.botonCerrar as React.CSSProperties} onClick={cerrarSesion}>Cerrar sesión</button>
    </div>
  )
}

const styles = {
  container: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
  },
  logo: {
    width: 270,
    height: 90,
    objectFit: 'contain' as const,
    marginTop: 30,
    marginBottom: 20,
  },
  avatarContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 24,
    flexDirection: 'column' as const,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: '50%',
    border: '3px solid #1e40af',
    boxShadow: '0 3px 6px rgba(0,0,0,0.25)',
  },
  linkCambiarFoto: {
    marginTop: 10,
    color: '#2563EB',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
  card: {
    backgroundColor: '#f8fafc',
    width: '100%',
    maxWidth: 720,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 10,
  },
  valor: {
    fontSize: 16,
    color: '#111827',
  },
  botonCerrar: {
    backgroundColor: '#dc2626',
    padding: '12px 40px',
    borderRadius: 30,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type React from 'react'

export default function PerfilFM() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [mensaje, setMensaje] = useState('')
  const inputFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    fetchUsuario()
  }, [])

  const fetchUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUsuario(user)

    if (user?.id) {
      const { data } = await supabase
        .from('usuarios')
        .select('nombre, apellido')
        .eq('id', user.id)
        .single()

      setPerfil(data)
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const cambiarFotoPerfil = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo || !usuario?.id) return

    const nombreArchivo = `${usuario.id}/${Date.now()}_${archivo.name}`

    const { error: errorUpload } = await supabase.storage
      .from('avatars')
      .upload(nombreArchivo, archivo)

    if (errorUpload) {
      setMensaje(`Error al subir imagen: ${errorUpload.message}`)
      return
    }

    const urlPublica = supabase
      .storage
      .from('avatars')
      .getPublicUrl(nombreArchivo).data.publicUrl

    const { error: errorUpdate } = await supabase.auth.updateUser({
      data: { avatar_url: urlPublica },
    })

    if (errorUpdate) {
      setMensaje(`Error al actualizar perfil: ${errorUpdate.message}`)
    } else {
      setMensaje('Foto de perfil actualizada ✅')
      fetchUsuario()
      if (inputFileRef.current) inputFileRef.current.value = ''
    }
  }

  return (
    <div style={styles.contenedor}>
      <div style={styles.headerContainer}>
        <button onClick={() => navigate('/fm')} style={styles.botonVolver}>
          ← Volver
        </button>
      </div>

      <div style={styles.perfilContainer}>
        <img
          src={
            usuario?.user_metadata?.avatar_url ||
            'https://ui-avatars.com/api/?name=FM&background=ccc&color=000&size=128'
          }
          alt="foto perfil"
          style={styles.avatar}
        />

        {/* Input oculto */}
        <input
          ref={inputFileRef}
          type="file"
          accept="image/*"
          onChange={cambiarFotoPerfil}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => inputFileRef.current?.click()}
          style={styles.botonCambiarFoto}
        >
          Cambiar foto
        </button>
      </div>

      {perfil && (
        <div style={styles.card}>
          <p><strong>Nombre:</strong> {perfil.nombre}</p>
          <p><strong>Apellido:</strong> {perfil.apellido}</p>
        </div>
      )}

      {usuario && (
        <div style={styles.card}>
          <p><strong>Email:</strong> {usuario.email}</p>
        </div>
      )}

      {mensaje && <p style={{ marginTop: '0.75rem', color: '#2563EB', fontWeight: 500 }}>{mensaje}</p>}

      <button onClick={cerrarSesion} style={styles.botonCerrar}>
        Cerrar sesión
      </button>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  contenedor: {
    maxWidth: '450px',
    margin: 'auto',
    padding: '2rem',
    textAlign: 'center'
  },
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  titulo: {
    fontSize: '1.8rem',
    fontWeight: 700,
    margin: 0,
    color: '#1e293b',
    flex: 1,
    textAlign: 'center'
  },
  botonVolver: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  perfilContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  avatar: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    border: '3px solid #1e40af',
    objectFit: 'cover'
  },
  botonCambiarFoto: {
    backgroundColor: '#2563EB',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none'
  },
  card: {
    backgroundColor: '#f1f5f9',
    padding: '0.9rem',
    marginTop: '0.8rem',
    borderRadius: '10px',
    textAlign: 'left'
  },
  botonCerrar: {
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '10px 20px',
    marginTop: '1.5rem',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
}

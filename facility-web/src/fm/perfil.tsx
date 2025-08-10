import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
// import type React from 'react' // ← descomentá si TS te pide el tipo React

export default function PerfilFM() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [mensaje, setMensaje] = useState('')

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
      setMensaje(`error al subir imagen: ${errorUpload.message}`)
      return
    }

    const urlPublica = supabase.storage.from('avatars').getPublicUrl(nombreArchivo).data.publicUrl

    const { error: errorUpdate } = await supabase.auth.updateUser({
      data: { avatar_url: urlPublica },
    })

    if (errorUpdate) {
      setMensaje(`error al actualizar perfil: ${errorUpdate.message}`)
    } else {
      setMensaje('foto de perfil actualizada ✅')
      fetchUsuario()
    }
  }

  return (
    <div style={styles.contenedor}>
      <div style={styles.headerContainer}>
        <button onClick={() => navigate('/fm')} style={styles.botonVolver}>
          ← Volver
        </button>
        <h2 style={styles.titulo}>mi perfil</h2>
      </div>

      <img
        src={
          usuario?.user_metadata?.avatar_url ||
          'https://ui-avatars.com/api/?name=FM&background=ccc&color=000&size=128'
        }
        alt="foto perfil"
        style={styles.avatar}
      />

      <label style={{ marginTop: '1rem' }}>
        <input type="file" accept="image/*" onChange={cambiarFotoPerfil} />
      </label>

      {perfil && (
        <div style={styles.card}>
          <p><strong>nombre:</strong> {perfil.nombre}</p>
          <p><strong>apellido:</strong> {perfil.apellido}</p>
        </div>
      )}

      {usuario && (
        <div style={styles.card}>
          <p><strong>email:</strong> {usuario.email}</p>
        </div>
      )}

      {mensaje && <p>{mensaje}</p>}

      <button onClick={cerrarSesion} style={styles.botonCerrar}>
        cerrar sesión
      </button>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  contenedor: { maxWidth: '500px', margin: 'auto', padding: '2rem', textAlign: 'center' },
  avatar: { width: '130px', height: '130px', borderRadius: '50%', border: '3px solid #1e40af', objectFit: 'cover' },
  card: { backgroundColor: '#f1f5f9', padding: '1rem', marginTop: '1rem', borderRadius: '12px', textAlign: 'left' },
  botonCerrar: { backgroundColor: '#dc2626', color: 'white', padding: '12px 24px', marginTop: '1.5rem', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  headerContainer: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  titulo: { fontSize: '2.2rem', fontWeight: 700, marginBottom: '0', color: '#1e293b', textAlign: 'center', flex: 1 },
  botonVolver: { backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
}

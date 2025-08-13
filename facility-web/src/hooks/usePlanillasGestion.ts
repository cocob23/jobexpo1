import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PlanillaGestion } from '../lib/types';

export const usePlanillasGestion = () => {
  const [planillas, setPlanillas] = useState<PlanillaGestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanillas = async (fm_id?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('planillas_gestion')
        .select(`
          *,
          usuarios!planillas_gestion_fm_id_fkey (
            nombre,
            apellido,
            email
          )
        `)
        .order('fecha_subida', { ascending: false });

      if (fm_id) {
        query = query.eq('fm_id', fm_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setPlanillas(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar planillas');
    } finally {
      setLoading(false);
    }
  };

  const subirPlanilla = async (
    fm_id: string,
    mes: number,
    año: number,
    archivo: File,
    tipo: 'gastos' | 'gestion'
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Subir archivo a Supabase Storage
      const fileName = `${tipo}_${fm_id}_${año}_${mes.toString().padStart(2, '0')}.xlsx`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('planillas')
        .upload(fileName, archivo);

      if (uploadError) throw uploadError;

      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('planillas')
        .getPublicUrl(fileName);

      // Crear registro en la base de datos
      const { data, error: createError } = await supabase
        .from('planillas_gestion')
        .insert([{
          fm_id,
          mes,
          año,
          archivo_url: urlData.publicUrl,
          tipo
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      setPlanillas(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir planilla');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const eliminarPlanilla = async (id: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('planillas_gestion')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setPlanillas(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar planilla');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    planillas,
    loading,
    error,
    fetchPlanillas,
    subirPlanilla,
    eliminarPlanilla
  };
};

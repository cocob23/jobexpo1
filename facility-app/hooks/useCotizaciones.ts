import { useState, useEffect } from 'react';
import { supabase } from '../constants/supabase';
import { Cotizacion } from '../types';

export const useCotizaciones = () => {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCotizaciones = async (filters?: {
    fm_id?: string;
    cliente?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  }, currentUserId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('cotizaciones')
        .select('*')
        .order('created_at', { ascending: false });

      // Si se proporciona un currentUserId, filtrar solo las cotizaciones del usuario
      if (currentUserId) {
        query = query.eq('subida_por', currentUserId);
      } else if (filters?.fm_id) {
        query = query.eq('subida_por', filters.fm_id);
      }
      
      if (filters?.cliente) {
        query = query.ilike('cliente', `%${filters.cliente}%`);
      }
      if (filters?.fecha_inicio) {
        query = query.gte('fecha', filters.fecha_inicio);
      }
      if (filters?.fecha_fin) {
        query = query.lte('fecha', filters.fecha_fin);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setCotizaciones(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const crearCotizacion = async (cotizacion: Omit<Cotizacion, 'id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: createError } = await supabase
        .from('cotizaciones')
        .insert([cotizacion])
        .select()
        .single();

      if (createError) throw createError;
      
      setCotizaciones(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cotización');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (id: number, nuevoEstado: Cotizacion['estado']) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: updateError } = await supabase
        .from('cotizaciones')
        .update({ estado: nuevoEstado })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      setCotizaciones(prev => 
        prev.map(cot => cot.id === id ? data : cot)
      );
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    cotizaciones,
    loading,
    error,
    fetchCotizaciones,
    crearCotizacion,
    actualizarEstado
  };
};

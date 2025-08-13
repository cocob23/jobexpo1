export interface Cotizacion {
  id: number;
  cliente: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: 'Cotizado' | 'Aprobado' | 'Cerrado' | 'Facturado' | 'Desestimado';
  subida_por: string;
  created_at?: string;
}

export interface PlanillaGestion {
  id: number;
  fm_id: string;
  mes: number;
  año: number;
  archivo_url: string;
  fecha_subida: string;
  tipo: 'gastos' | 'gestion';
}

export interface Usuario {
  id: string;
  email: string;
  role: 'fm' | 'superadmin' | 'tecnicos-externos';
  nombre?: string;
  apellido?: string;
}

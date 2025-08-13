import React from 'react';

const CotizacionesSuperadmin: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Gestión de Cotizaciones</h1>
        <p className="text-gray-600 text-lg max-w-3xl mx-auto">
          Visualiza y gestiona todas las cotizaciones del sistema. Puedes filtrar por nombre del FM, cliente o fecha.
        </p>
      </div>

      <div className="p-4 border border-gray-300 rounded-lg">
        <p className="text-gray-600">[Aquí iría la lista de cotizaciones]</p>
      </div>
    </div>
  );
};

export default CotizacionesSuperadmin;

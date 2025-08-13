import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const CotizacionesFM: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Gestión de Cotizaciones</h1>
        <p className="text-gray-600 text-lg">
          Crea y gestiona tus cotizaciones de manera eficiente
        </p>
      </div>

      <div className="text-center mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transform hover:scale-105 transition-all duration-200 font-semibold text-lg shadow-lg"
        >
          {showForm ? (
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Ocultar Formulario</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Nueva Cotización</span>
            </div>
          )}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-4 border border-gray-300 rounded-lg">
          <p className="text-gray-600">[Aquí iría el formulario de cotización]</p>
        </div>
      )}

      <div className="p-4 border border-gray-300 rounded-lg">
        <p className="text-gray-600">[Aquí iría la lista de cotizaciones]</p>
      </div>
    </div>
  );
};

export default CotizacionesFM;

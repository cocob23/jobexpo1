import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useCotizaciones } from '../../hooks/useCotizaciones';
import { Cotizacion } from '../../types';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';

const CotizacionesFM: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { cotizaciones, loading, error, fetchCotizaciones, crearCotizacion, actualizarEstado } = useCotizaciones();

  const [formData, setFormData] = useState({
    cliente: '',
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'Cotizado' as Cotizacion['estado']
  });

  useEffect(() => {
    if (user) {
      fetchCotizaciones(undefined, user.id);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchCotizaciones(undefined, user.id);
    }
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!formData.cliente || !formData.descripcion || !formData.monto) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await crearCotizacion({
        ...formData,
        monto: parseFloat(formData.monto),
        subida_por: user!.id
      });
      
      // Limpiar formulario
      setFormData({
        cliente: '',
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        estado: 'Cotizado'
      });
      
      setShowForm(false);
      Alert.alert('Éxito', 'Cotización creada correctamente');
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear la cotización');
    }
  };

  const handleEstadoChange = async (id: number, nuevoEstado: Cotizacion['estado']) => {
    try {
      await actualizarEstado(id, nuevoEstado);
      Alert.alert('Éxito', 'Estado actualizado correctamente');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const getEstadoColor = (estado: Cotizacion['estado']) => {
    const colors = {
      'Cotizado': '#fbbf24',
      'Aprobado': '#10b981',
      'Cerrado': '#3b82f6',
      'Facturado': '#8b5cf6',
      'Desestimado': '#ef4444'
    };
    return colors[estado] || '#6b7280';
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>📊 Gestión de Cotizaciones</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.buttonText}>
            {showForm ? '❌ Ocultar' : '📝 Nueva Cotización'}
          </Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>📝 Nueva Cotización</Text>
          
          <Text style={styles.label}>Cliente *</Text>
          <TextInput
            style={styles.input}
            value={formData.cliente}
            onChangeText={(text) => setFormData(prev => ({ ...prev, cliente: text }))}
            placeholder="Nombre del cliente"
          />

          <Text style={styles.label}>Descripción *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.descripcion}
            onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion: text }))}
            placeholder="Descripción del trabajo o servicio"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Monto *</Text>
          <TextInput
            style={styles.input}
            value={formData.monto}
            onChangeText={(text) => setFormData(prev => ({ ...prev, monto: text }))}
            placeholder="0.00"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Fecha *</Text>
          <TextInput
            style={styles.input}
            value={formData.fecha}
            onChangeText={(text) => setFormData(prev => ({ ...prev, fecha: text }))}
            placeholder="YYYY-MM-DD"
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>✅ Crear Cotización</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>📋 Mis Cotizaciones ({cotizaciones.length})</Text>
        
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : cotizaciones.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No hay cotizaciones para mostrar</Text>
          </View>
        ) : (
          cotizaciones.map((cotizacion) => (
            <View key={cotizacion.id} style={styles.cotizacionCard}>
              <View style={styles.cotizacionHeader}>
                <Text style={styles.cotizacionNumber}>#{cotizacion.id}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(cotizacion.estado) }]}>
                  <Text style={styles.estadoText}>{cotizacion.estado}</Text>
                </View>
              </View>
              
              <Text style={styles.clienteText}>{cotizacion.cliente}</Text>
              <Text style={styles.descripcionText}>{cotizacion.descripcion}</Text>
              
              <View style={styles.cotizacionFooter}>
                <Text style={styles.montoText}>${cotizacion.monto.toFixed(2)}</Text>
                <Text style={styles.fechaText}>
                  {new Date(cotizacion.fecha).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.estadoSelector}>
                <Text style={styles.estadoLabel}>Cambiar Estado:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={cotizacion.estado}
                    onValueChange={(value) => handleEstadoChange(cotizacion.id, value)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="📋 Cotizado" value="Cotizado" />
                    <Picker.Item label="✅ Aprobado" value="Aprobado" />
                    <Picker.Item label="🔒 Cerrado" value="Cerrado" />
                    <Picker.Item label="💰 Facturado" value="Facturado" />
                    <Picker.Item label="❌ Desestimado" value="Desestimado" />
                  </Picker>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1f2937',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
    textAlign: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  cotizacionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cotizacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cotizacionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  estadoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  clienteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  descripcionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  cotizacionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  montoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fechaText: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  estadoSelector: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  estadoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },
  picker: {
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: 16,
    color: '#374151',
  },
});

export default CotizacionesFM;

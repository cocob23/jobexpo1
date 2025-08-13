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
  Linking,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { usePlanillasGestion } from '../../hooks/usePlanillasGestion';
import { PlanillaGestion } from '../../types';
import { Picker } from '@react-native-picker/picker';

const PlanillasTecnicosExternos: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { 
    planillas, 
    loading, 
    error, 
    fetchPlanillas, 
    seleccionarArchivo, 
    subirPlanilla, 
    eliminarPlanilla 
  } = usePlanillasGestion();

  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    año: new Date().getFullYear(),
    tipo: 'gestion' as 'gastos' | 'gestion'
  });

  const [archivoSeleccionado, setArchivoSeleccionado] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchPlanillas(user.id);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchPlanillas(user.id);
    }
    setRefreshing(false);
  };

  const handleSeleccionarArchivo = async () => {
    const archivo = await seleccionarArchivo();
    if (archivo) {
      setArchivoSeleccionado(archivo);
      Alert.alert('Archivo Seleccionado', `Archivo: ${archivo.name}`);
    }
  };

  const handleSubmit = async () => {
    if (!archivoSeleccionado) {
      Alert.alert('Error', 'Por favor selecciona un archivo Excel');
      return;
    }

    try {
      await subirPlanilla(
        user!.id,
        formData.mes,
        formData.año,
        archivoSeleccionado,
        formData.tipo
      );
      
      // Limpiar formulario
      setArchivoSeleccionado(null);
      setShowForm(false);
      Alert.alert('Éxito', 'Planilla subida correctamente');
    } catch (err) {
      Alert.alert('Error', 'No se pudo subir la planilla');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que quieres eliminar esta planilla?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarPlanilla(id);
              Alert.alert('Éxito', 'Planilla eliminada correctamente');
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la planilla');
            }
          },
        },
      ]
    );
  };

  const handleVerArchivo = (url: string) => {
    Linking.openURL(url);
  };

  const meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

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
        <Text style={styles.title}>Planillas de Gestión</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.buttonText}>
            {showForm ? 'Ocultar Formulario' : 'Subir Planilla'}
          </Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Subir Planilla de Gestión</Text>
          
          <Text style={styles.label}>Tipo de Planilla *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.tipo}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Planilla de Gestión" value="gestion" />
              <Picker.Item label="Planilla de Gastos" value="gastos" />
            </Picker>
          </View>

          <Text style={styles.label}>Mes *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.mes}
              onValueChange={(value) => setFormData(prev => ({ ...prev, mes: value }))}
              style={styles.picker}
            >
              {meses.map(mes => (
                <Picker.Item key={mes.value} label={mes.label} value={mes.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Año *</Text>
          <TextInput
            style={styles.input}
            value={formData.año.toString()}
            onChangeText={(text) => setFormData(prev => ({ ...prev, año: parseInt(text) || prev.año }))}
            placeholder="2024"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Archivo Excel *</Text>
          <TouchableOpacity style={styles.fileButton} onPress={handleSeleccionarArchivo}>
            <Text style={styles.fileButtonText}>
              {archivoSeleccionado ? 'Archivo Seleccionado' : 'Seleccionar Archivo'}
            </Text>
          </TouchableOpacity>
          {archivoSeleccionado && (
            <Text style={styles.fileInfo}>Archivo: {archivoSeleccionado.name}</Text>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, !archivoSeleccionado && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={!archivoSeleccionado}
          >
            <Text style={styles.submitButtonText}>Subir Planilla</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Mis Planillas ({planillas.length})</Text>
        
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : planillas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay planillas subidas</Text>
          </View>
        ) : (
          planillas.map((planilla) => (
            <View key={planilla.id} style={styles.planillaCard}>
              <View style={styles.planillaHeader}>
                <View style={[
                  styles.tipoBadge, 
                  { backgroundColor: planilla.tipo === 'gestion' ? '#3b82f6' : '#10b981' }
                ]}>
                  <Text style={styles.tipoText}>
                    {planilla.tipo === 'gestion' ? 'Gestión' : 'Gastos'}
                  </Text>
                </View>
                <Text style={styles.fechaText}>
                  {new Date(planilla.fecha_subida).toLocaleDateString()}
                </Text>
              </View>
              
              <Text style={styles.periodoText}>
                {meses[planilla.mes - 1]?.label} {planilla.año}
              </Text>

              <View style={styles.planillaActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleVerArchivo(planilla.archivo_url)}
                >
                  <Text style={styles.actionButtonText}>Ver Archivo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(planilla.id)}
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Eliminar</Text>
                </TouchableOpacity>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  fileButton: {
    backgroundColor: '#6b7280',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  fileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 20,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
  planillaCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planillaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tipoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  fechaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  periodoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  planillaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: 'white',
  },
});

export default PlanillasTecnicosExternos;

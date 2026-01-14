import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, Download, Upload, ArrowLeft } from 'lucide-react';
import defaultHincasData from '@/lib/hincasData.json';
import { Link } from 'wouter';

interface Distance {
  value: number;
}

interface Configuration {
  id: string;
  name: string;
  color: string;
  distances: number[];
  totalDistance: number;
}

interface Stage {
  id: string;
  name: string;
  configurations: Configuration[];
}

interface HincasData {
  stages: Stage[];
  tolerance: {
    individual: number;
    total: number;
  };
}

export default function Admin() {
  const [hincasData, setHincasData] = useState<HincasData>(defaultHincasData);
  const [activeTab, setActiveTab] = useState<'stages' | 'tolerance' | 'import-export'>('stages');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingDistanceIndex, setEditingDistanceIndex] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('hincasData');
    if (savedData) {
      try {
        setHincasData(JSON.parse(savedData));
      } catch (e) {
        console.error('Error loading data:', e);
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('hincasData', JSON.stringify(hincasData));
  }, [hincasData]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEditDistance = (stageId: string, configId: string, distanceIndex: number) => {
    const stage = hincasData.stages.find(s => s.id === stageId);
    const config = stage?.configurations.find(c => c.id === configId);
    if (config) {
      setEditingStageId(stageId);
      setEditingConfigId(configId);
      setEditingDistanceIndex(distanceIndex);
      setTempValue(config.distances[distanceIndex].toString());
    }
  };

  const handleSaveDistance = () => {
    if (editingStageId && editingConfigId && editingDistanceIndex !== null) {
      const newData = JSON.parse(JSON.stringify(hincasData));
      const stage = newData.stages.find((s: Stage) => s.id === editingStageId);
      const config = stage?.configurations.find((c: Configuration) => c.id === editingConfigId);
      
      if (config) {
        const newValue = parseFloat(tempValue);
        
        // Validación
        if (!tempValue.trim()) {
          showMessage('error', 'El campo no puede estar vacío');
          return;
        }
        
        if (isNaN(newValue)) {
          showMessage('error', 'Por favor ingresa un valor numérico válido');
          return;
        }
        
        if (newValue <= 0) {
          showMessage('error', 'El valor debe ser mayor a 0');
          return;
        }
        
        if (newValue > 100) {
          showMessage('error', 'El valor no puede ser mayor a 100 m');
          return;
        }

        config.distances[editingDistanceIndex] = Math.round(newValue * 10000) / 10000;
        config.totalDistance = Math.round(
          config.distances.reduce((a: number, b: number) => a + b, 0) * 10000
        ) / 10000;

        setHincasData(newData);
        setEditingStageId(null);
        setEditingConfigId(null);
        setEditingDistanceIndex(null);
        setTempValue('');
        showMessage('success', 'Distancia actualizada correctamente');
      }
    }
  };

  const handleAddConfiguration = (stageId: string) => {
    const newData = JSON.parse(JSON.stringify(hincasData));
    const stage = newData.stages.find((s: Stage) => s.id === stageId);
    
    if (stage) {
      const newConfigId = `${stageId}_NEW_${Date.now()}`;
      const newConfig: Configuration = {
        id: newConfigId,
        name: `Nueva Configuración ${stage.configurations.length + 1}`,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        distances: Array(11).fill(0),
        totalDistance: 0
      };
      stage.configurations.push(newConfig);
      setHincasData(newData);
      showMessage('success', 'Nueva configuración agregada');
    }
  };

  const handleDeleteConfiguration = (stageId: string, configId: string) => {
    const stage = hincasData.stages.find(s => s.id === stageId);
    const config = stage?.configurations.find(c => c.id === configId);
    
    if (confirm(`¿Estás seguro de que deseas eliminar la configuración "${config?.name}"?`)) {
      const newData = JSON.parse(JSON.stringify(hincasData));
      const newStage = newData.stages.find((s: Stage) => s.id === stageId);
      if (newStage) {
        newStage.configurations = newStage.configurations.filter((c: Configuration) => c.id !== configId);
        setHincasData(newData);
        showMessage('success', 'Configuración eliminada correctamente');
      }
    }
  };

  const handleUpdateConfigName = (stageId: string, configId: string, newName: string) => {
    if (!newName.trim()) {
      showMessage('error', 'El nombre no puede estar vacío');
      return;
    }
    
    if (newName.length > 50) {
      showMessage('error', 'El nombre no puede exceder 50 caracteres');
      return;
    }
    
    const newData = JSON.parse(JSON.stringify(hincasData));
    const stage = newData.stages.find((s: Stage) => s.id === stageId);
    const config = stage?.configurations.find((c: Configuration) => c.id === configId);
    if (config) {
      config.name = newName.trim();
      setHincasData(newData);
      showMessage('success', 'Nombre actualizado correctamente');
    }
  };

  const handleUpdateConfigColor = (stageId: string, configId: string, newColor: string) => {
    // Validar que sea un color hexadecimal válido
    if (!/^#[0-9A-F]{6}$/i.test(newColor)) {
      showMessage('error', 'Color inválido');
      return;
    }
    
    const newData = JSON.parse(JSON.stringify(hincasData));
    const stage = newData.stages.find((s: Stage) => s.id === stageId);
    const config = stage?.configurations.find((c: Configuration) => c.id === configId);
    if (config) {
      config.color = newColor;
      setHincasData(newData);
      showMessage('success', 'Color actualizado correctamente');
    }
  };

  const handleUpdateTolerance = (type: 'individual' | 'total', value: string) => {
    if (!value.trim()) {
      showMessage('error', 'El campo no puede estar vacío');
      return;
    }
    
    const newValue = parseFloat(value);
    
    if (isNaN(newValue)) {
      showMessage('error', 'Por favor ingresa un valor numérico válido');
      return;
    }
    
    if (newValue <= 0) {
      showMessage('error', 'La tolerancia debe ser mayor a 0');
      return;
    }
    
    if (newValue >= 1) {
      showMessage('error', 'La tolerancia debe ser menor a 1 m');
      return;
    }

    const newData = JSON.parse(JSON.stringify(hincasData));
    newData.tolerance[type] = Math.round(newValue * 10000) / 10000;
    setHincasData(newData);
    showMessage('success', `Tolerancia ${type} actualizada a ±${(Math.round(newValue * 10000) / 10000).toFixed(4)} m`);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(hincasData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hincas-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('success', 'Configuración exportada');
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar extensión
    if (!file.name.endsWith('.json')) {
      showMessage('error', 'Por favor selecciona un archivo JSON válido');
      return;
    }

    // Validar tamaño (máximo 1MB)
    if (file.size > 1024 * 1024) {
      showMessage('error', 'El archivo es demasiado grande (máximo 1MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        
        // Validar estructura
        if (!imported.stages || !Array.isArray(imported.stages)) {
          showMessage('error', 'Estructura inválida: falta el campo "stages"');
          return;
        }
        
        if (!imported.tolerance || typeof imported.tolerance !== 'object') {
          showMessage('error', 'Estructura inválida: falta el campo "tolerance"');
          return;
        }
        
        if (typeof imported.tolerance.individual !== 'number' || typeof imported.tolerance.total !== 'number') {
          showMessage('error', 'Estructura inválida: tolerancia debe contener valores numéricos');
          return;
        }
        
        // Validar que cada stage tenga configuraciones
        for (const stage of imported.stages) {
          if (!stage.configurations || !Array.isArray(stage.configurations)) {
            showMessage('error', 'Estructura inválida: cada stage debe tener configuraciones');
            return;
          }
        }
        
        setHincasData(imported);
        showMessage('success', 'Configuración importada correctamente');
      } catch (error) {
        showMessage('error', 'Error al importar el archivo: formato JSON inválido');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    if (confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS tus cambios y restaurará la configuración original.\n\n¿Estás seguro de que deseas continuar?')) {
      setHincasData(defaultHincasData);
      localStorage.removeItem('hincasData');
      showMessage('success', 'Configuración restaurada a valores por defecto');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                className="border-slate-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-slate-900">Panel de Administración</h1>
          </div>
        </div>

        {message && (
          <Card className={`p-4 mb-6 border-l-4 ${
            message.type === 'success'
              ? 'bg-green-50 border-l-green-500'
              : 'bg-red-50 border-l-red-500'
          }`}>
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('stages')}
            variant={activeTab === 'stages' ? 'default' : 'outline'}
            className={activeTab === 'stages' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-300'}
          >
            Configuraciones
          </Button>
          <Button
            onClick={() => setActiveTab('tolerance')}
            variant={activeTab === 'tolerance' ? 'default' : 'outline'}
            className={activeTab === 'tolerance' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-300'}
          >
            Tolerancias
          </Button>
          <Button
            onClick={() => setActiveTab('import-export')}
            variant={activeTab === 'import-export' ? 'default' : 'outline'}
            className={activeTab === 'import-export' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-300'}
          >
            Importar/Exportar
          </Button>
        </div>

        {/* Stages Tab */}
        {activeTab === 'stages' && (
          <div className="space-y-6">
            {hincasData.stages.map((stage) => (
              <Card key={stage.id} className="p-6 border-slate-200 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{stage.name}</h2>

                <div className="space-y-4">
                  {stage.configurations.map((config) => (
                    <Card key={config.id} className="p-4 border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={config.color}
                            onChange={(e) => handleUpdateConfigColor(stage.id, config.id, e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.name}
                            onChange={(e) => handleUpdateConfigName(stage.id, config.id, e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded font-medium text-slate-900"
                          />
                        </div>
                        <Button
                          onClick={() => handleDeleteConfiguration(stage.id, config.id)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {config.distances.map((distance, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700 w-16">Hinc {idx + 1}:</label>
                            {editingStageId === stage.id && editingConfigId === config.id && editingDistanceIndex === idx ? (
                              <div className="flex gap-2 flex-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  className="flex-1 border-slate-300"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleSaveDistance}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditDistance(stage.id, config.id, idx)}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded text-right font-mono text-slate-900 hover:bg-white cursor-pointer"
                              >
                                {distance.toFixed(4)} m
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-900">Total:</span>
                          <span className="font-mono font-bold text-lg text-slate-900">{config.totalDistance.toFixed(4)} m</span>
                        </div>
                      </div>
                    </Card>
                  ))}

                  <Button
                    onClick={() => handleAddConfiguration(stage.id)}
                    variant="outline"
                    className="w-full border-dashed border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Nueva Configuración
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tolerance Tab */}
        {activeTab === 'tolerance' && (
          <Card className="p-6 border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Configurar Tolerancias</h2>

            <div className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tolerancia Individual (m)
                </label>
                <p className="text-xs text-slate-600 mb-2">
                  Tolerancia máxima permitida para cada medición individual
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={hincasData.tolerance.individual}
                    onBlur={(e) => handleUpdateTolerance('individual', e.target.value)}
                    className="border-slate-300"
                  />
                  <span className="text-slate-600 font-mono self-center">±{hincasData.tolerance.individual.toFixed(4)} m</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tolerancia Total (m)
                </label>
                <p className="text-xs text-slate-600 mb-2">
                  Tolerancia máxima permitida para la suma total de mediciones
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={hincasData.tolerance.total}
                    onBlur={(e) => handleUpdateTolerance('total', e.target.value)}
                    className="border-slate-300"
                  />
                  <span className="text-slate-600 font-mono self-center">±{hincasData.tolerance.total.toFixed(4)} m</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600 mb-3">
                  <strong>Nota:</strong> La validación es estricta: si CUALQUIER medición individual O el total está fuera de tolerancia, el registro es INVÁLIDO.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Import/Export Tab */}
        {activeTab === 'import-export' && (
          <div className="space-y-4">
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Exportar Configuración</h2>
              <p className="text-slate-600 mb-4">
                Descarga tu configuración actual como archivo JSON para hacer backup o compartir
              </p>
              <Button
                onClick={handleExportData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Configuración
              </Button>
            </Card>

            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Importar Configuración</h2>
              <p className="text-slate-600 mb-4">
                Carga una configuración guardada anteriormente
              </p>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-file"
                />
                <Button
                  onClick={() => document.getElementById('import-file')?.click()}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar Archivo
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 shadow-sm border-red-200 bg-red-50">
              <h2 className="text-2xl font-bold text-red-900 mb-4">Restaurar Valores Por Defecto</h2>
              <p className="text-red-700 mb-4">
                Esto eliminará todos los cambios y restaurará la configuración original
              </p>
              <Button
                onClick={handleResetToDefault}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Restaurar Configuración Por Defecto
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

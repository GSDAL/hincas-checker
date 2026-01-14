import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, Download, Upload, ArrowLeft, Edit2, Check, X } from 'lucide-react';
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
      const newConfig: Configuration = {
        id: `config_${Date.now()}`,
        name: `Nueva Configuración`,
        color: '#3b82f6',
        distances: Array(8).fill(0),
        totalDistance: 0,
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
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="md:min-h-screen md:p-6 p-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white">Panel de Administración</h1>
              <p className="text-slate-400 text-sm mt-1">Gestiona configuraciones, tolerancias e importa/exporta datos</p>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <Card className={`p-4 mb-6 border-l-4 backdrop-blur-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/50 border-l-emerald-500 text-emerald-200'
              : 'bg-red-950/50 border-l-red-500 text-red-200'
          }`}>
            <p className="font-medium">{message.text}</p>
          </Card>
        )}

        {/* Tabs - Desktop */}
        <div className="hidden md:flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('stages')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'stages'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Configuraciones
          </button>
          <button
            onClick={() => setActiveTab('tolerance')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'tolerance'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Tolerancias
          </button>
          <button
            onClick={() => setActiveTab('import-export')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'import-export'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Importar/Exportar
          </button>
        </div>

        {/* Tabs - Mobile (Vertical Scroll) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 flex gap-2 p-4 bg-slate-900/95 border-t border-slate-700 z-50">
          <button
            onClick={() => setActiveTab('stages')}
            className={`flex-1 px-3 py-2 font-semibold transition-all border-b-2 text-sm ${
              activeTab === 'stages'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Configuraciones
          </button>
          <button
            onClick={() => setActiveTab('tolerance')}
            className={`flex-1 px-3 py-2 font-semibold transition-all border-b-2 text-sm ${
              activeTab === 'tolerance'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Tolerancias
          </button>
          <button
            onClick={() => setActiveTab('import-export')}
            className={`flex-1 px-3 py-2 font-semibold transition-all border-b-2 text-sm ${
              activeTab === 'import-export'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Importar/Exportar
          </button>
        </div>
        
        {/* Mobile Content Padding */}
        <div className="md:hidden pb-24"></div>

        {/* Stages Tab */}
        {activeTab === 'stages' && (
          <div className="space-y-8 md:space-y-8">
            {hincasData.stages.map((stage) => (
              <div key={stage.id} className="space-y-4">
                <h2 className="text-2xl font-bold text-white px-2">{stage.name}</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {stage.configurations.map((config) => (
                    <Card key={config.id} className="bg-slate-800 border-slate-700 p-6 hover:border-slate-600 transition-colors">
                      {/* Config Header */}
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-slate-600 cursor-pointer hover:border-slate-500 transition-colors"
                          style={{ backgroundColor: config.color }}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'color';
                            input.value = config.color;
                            input.onchange = (e: any) => handleUpdateConfigColor(stage.id, config.id, e.target.value);
                            input.click();
                          }}
                          title="Haz clic para cambiar color"
                        />
                        <input
                          type="text"
                          value={config.name}
                          onChange={(e) => handleUpdateConfigName(stage.id, config.id, e.target.value)}
                          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-semibold"
                        />
                        <Button
                          onClick={() => handleDeleteConfiguration(stage.id, config.id)}
                          variant="destructive"
                          size="sm"
                          className="bg-red-900 hover:bg-red-800 text-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Distances Grid */}
                      <div className="space-y-3 mb-6">
                        {config.distances.map((distance, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-400 w-20">Hinc {idx + 1}:</span>
                            {editingStageId === stage.id && editingConfigId === config.id && editingDistanceIndex === idx ? (
                              <div className="flex gap-2 flex-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  className="flex-1 bg-slate-700 border-slate-600 text-white"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleSaveDistance}
                                  size="sm"
                                  className="bg-green-700 hover:bg-green-600"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingStageId(null);
                                    setEditingConfigId(null);
                                    setEditingDistanceIndex(null);
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 text-slate-300"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditDistance(stage.id, config.id, idx)}
                                className="flex-1 text-right px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 text-white font-mono transition-colors group flex items-center justify-between"
                              >
                                <span>{distance.toFixed(4)} m</span>
                                <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="pt-4 border-t border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-400">Total:</span>
                          <span className="text-lg font-bold text-blue-400">{config.totalDistance.toFixed(4)} m</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Add Configuration Button */}
                <Button
                  onClick={() => handleAddConfiguration(stage.id)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Nueva Configuración
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tolerance Tab */}
        {activeTab === 'tolerance' && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-8">Configurar Tolerancias</h2>
              
              <div className="space-y-8">
                {/* Individual Tolerance */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-300">
                    Tolerancia Individual (m)
                  </label>
                  <p className="text-sm text-slate-400">Tolerancia máxima permitida para cada medición individual</p>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="0.0001"
                        value={hincasData.tolerance.individual}
                        onChange={(e) => handleUpdateTolerance('individual', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-lg font-mono"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Rango actual:</p>
                      <p className="text-lg font-bold text-blue-400">
                        ±{hincasData.tolerance.individual.toFixed(4)} m
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Tolerance */}
                <div className="space-y-3 pt-6 border-t border-slate-700">
                  <label className="block text-sm font-semibold text-slate-300">
                    Tolerancia Total (m)
                  </label>
                  <p className="text-sm text-slate-400">Tolerancia máxima permitida para la suma total de mediciones</p>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="0.0001"
                        value={hincasData.tolerance.total}
                        onChange={(e) => handleUpdateTolerance('total', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-lg font-mono"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Rango actual:</p>
                      <p className="text-lg font-bold text-blue-400">
                        ±{hincasData.tolerance.total.toFixed(4)} m
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-8 p-4 bg-blue-950/50 border border-blue-800 rounded-lg">
                <p className="text-sm text-blue-200">
                  <span className="font-semibold">ℹ️ Nota:</span> La validación es estricta: CUALQUIER medición individual O el total está fuera de tolerancia, el registro es INVÁLIDO.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Import/Export Tab */}
        {activeTab === 'import-export' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Export */}
            <Card className="bg-slate-800 border-slate-700 p-6 lg:col-span-1">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-400" />
                Exportar
              </h3>
              <p className="text-sm text-slate-400 mb-4">Descarga tu configuración actual como archivo JSON para hacer backup o compartir</p>
              <Button
                onClick={handleExportData}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Configuración
              </Button>
            </Card>

            {/* Import */}
            <Card className="bg-slate-800 border-slate-700 p-6 lg:col-span-1">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-400" />
                Importar
              </h3>
              <p className="text-sm text-slate-400 mb-4">Carga una configuración guardada anteriormente</p>
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
                <Button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                    input?.click();
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar Archivo
                </Button>
              </label>
            </Card>

            {/* Reset */}
            <Card className="bg-slate-800 border-slate-700 p-6 lg:col-span-1">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <X className="w-5 h-5 text-red-400" />
                Restaurar
              </h3>
              <p className="text-sm text-slate-400 mb-4">Vuelve a los valores originales (no se puede deshacer)</p>
              <Button
                onClick={handleResetToDefault}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Restaurar Valores Por Defecto
              </Button>
            </Card>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

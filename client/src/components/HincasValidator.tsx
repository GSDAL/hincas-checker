import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, AlertCircle, Trash2, Download } from 'lucide-react';
import hincasData from '@/lib/hincasData.json';

interface ValidationResult {
  index: number;
  expected: number;
  measured: number;
  difference: number;
  isValid: boolean;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  stage: string;
  configuration: string;
  measurements: number[];
  total: number;
  results: ValidationResult[];
  totalValidation: {
    expected: number;
    measured: number;
    difference: number;
    isValid: boolean;
  };
  description?: string;
}

interface HincasValidatorProps {
  onValidationComplete?: (results: ValidationResult[]) => void;
}

export default function HincasValidator({ onValidationComplete }: HincasValidatorProps) {
  const [selectedStage, setSelectedStage] = useState<string>('162M');
  const [selectedConfig, setSelectedConfig] = useState<string>('2R_EXT_162');
  const [measurements, setMeasurements] = useState<(number | null)[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [description, setDescription] = useState<string>('');

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('hincasHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('hincasHistory', JSON.stringify(history));
  }, [history]);

  const currentStage = hincasData.stages.find(s => s.id === selectedStage);
  const currentConfig = currentStage?.configurations.find(c => c.id === selectedConfig);

  // Reset measurements when configuration changes
  const expectedDistances = useMemo(() => {
    if (!currentConfig) return [];
    return currentConfig.distances;
  }, [currentConfig]);

  const handleStageChange = (stageId: string) => {
    setSelectedStage(stageId);
    const stage = hincasData.stages.find(s => s.id === stageId);
    if (stage && stage.configurations.length > 0) {
      setSelectedConfig(stage.configurations[0].id);
    }
    setMeasurements([]);
  };

  const handleConfigChange = (configId: string) => {
    setSelectedConfig(configId);
    setMeasurements([]);
  };

  const handleMeasurementChange = (index: number, value: string) => {
    const newMeasurements = [...measurements];
    newMeasurements[index] = value === '' ? null : parseFloat(value);
    setMeasurements(newMeasurements);
  };

  // Calculate total automatically
  const calculatedTotal = useMemo(() => {
    const validMeasurements = measurements.filter(m => m !== null && m !== undefined) as number[];
    if (validMeasurements.length === expectedDistances.length) {
      return validMeasurements.reduce((sum, m) => sum + m, 0);
    }
    return null;
  }, [measurements, expectedDistances]);

  const validationResults = useMemo(() => {
    const results: ValidationResult[] = [];
    
    expectedDistances.forEach((expected, index) => {
      const measured = measurements[index];
      if (measured !== null && measured !== undefined) {
        const difference = measured - expected;
        const isValid = Math.abs(difference) <= hincasData.tolerance.individual;
        results.push({
          index,
          expected,
          measured,
          difference,
          isValid
        });
      }
    });

    return results;
  }, [measurements, expectedDistances]);

  const totalValidation = useMemo(() => {
    if (!currentConfig || calculatedTotal === null) {
      return null;
    }
    const difference = calculatedTotal - currentConfig.totalDistance;
    const isValid = Math.abs(difference) <= hincasData.tolerance.total;
    return {
      expected: currentConfig.totalDistance,
      measured: calculatedTotal,
      difference,
      isValid
    };
  }, [calculatedTotal, currentConfig]);

  const allValid = validationResults.length > 0 && 
                   validationResults.every(r => r.isValid) &&
                   (totalValidation === null || totalValidation.isValid);

  const handleValidate = () => {
    if (onValidationComplete) {
      onValidationComplete(validationResults);
    }
  };

  const handleSaveToHistory = () => {
    if (totalValidation && calculatedTotal !== null && validationResults.length > 0) {
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('es-ES'),
        stage: currentStage?.name || '',
        configuration: selectedConfig,
        measurements: measurements as number[],
        total: calculatedTotal,
        results: validationResults,
        totalValidation,
        description: description || undefined
      };
      setHistory([entry, ...history]);
      setMeasurements([]);
      setDescription('');
    }
  };

  const handleClear = () => {
    setMeasurements([]);
  };

  const handleDeleteHistoryEntry = (id: string) => {
    setHistory(history.filter(entry => entry.id !== id));
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;

    const headers = ['Fecha/Hora', 'Stage', 'Configuración', 'Hinc 1', 'Hinc 2', 'Hinc 3', 'Hinc 4', 'Hinc 5', 'Hinc 6', 'Hinc 7', 'Hinc 8', 'Hinc 9', 'Hinc 10', 'Hinc 11', 'Total Medido', 'Total Esperado', 'Diferencia Total', 'Estado', 'Descripción'];
    const rows = history.map(entry => {
      const hincValues = Array(11).fill('').map((_, i) => entry.measurements[i]?.toFixed(4) || '');
      return [
        entry.timestamp,
        entry.stage,
        entry.configuration,
        ...hincValues,
        entry.total.toFixed(4),
        entry.totalValidation.expected.toFixed(4),
        entry.totalValidation.difference.toFixed(4),
        entry.totalValidation.isValid ? 'Válido' : 'Inválido',
        entry.description ? `"${entry.description}"` : ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hincas_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Comprobador de Hincas</h1>
            <p className="text-slate-600">Validación de distancias entre hincas con tolerancia ±0.04 m</p>
          </div>
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant="outline"
            className="border-slate-300"
          >
            {showHistory ? 'Ocultar' : 'Ver'} Histórico ({history.length})
          </Button>
        </div>

        {showHistory ? (
          // History View
          <Card className="p-6 border-slate-200 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Histórico de Validaciones</h2>
            
            {history.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No hay validaciones registradas</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex gap-2">
                  <Button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm('¿Estás seguro de que quieres eliminar todo el histórico?')) {
                        setHistory([]);
                      }
                    }}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpiar Todo
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        entry.totalValidation.isValid
                          ? 'bg-green-50 border-green-500'
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-slate-900">{entry.stage}</div>
                          <div className="text-sm text-slate-600">{entry.configuration}</div>
                          <div className="text-xs text-slate-500">{entry.timestamp}</div>
                        </div>
                        <div className="flex gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            entry.totalValidation.isValid
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {entry.totalValidation.isValid ? 'Válido' : 'Inválido'}
                          </span>
                          <Button
                            onClick={() => handleDeleteHistoryEntry(entry.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="font-mono text-sm space-y-1">
                        <div>Total: {entry.total.toFixed(4)} m (Esperado: {entry.totalValidation.expected.toFixed(4)} m)</div>
                        <div>Diferencia: {entry.totalValidation.difference > 0 ? '+' : ''}{entry.totalValidation.difference.toFixed(4)} m</div>
                        {entry.description && (
                          <div className="mt-2 p-2 bg-slate-100 rounded text-slate-700 text-xs italic">
                            "{entry.description}"
                          </div>
                        )}
                        <div className="mt-2 text-xs text-slate-600 max-h-20 overflow-y-auto">
                          <div className="font-semibold mb-1">Mediciones:</div>
                          <div className="grid grid-cols-2 gap-1">
                            {entry.measurements.map((m, idx) => (
                              <div key={idx} className="text-slate-600">
                                Hinc {idx + 1}: {m.toFixed(4)} m
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        ) : (
          // Main Validator View
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Configuration */}
            <div className="lg:col-span-1">
              <Card className="p-6 border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuración</h2>
                
                {/* Stage Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Stage
                  </label>
                  <Select value={selectedStage} onValueChange={handleStageChange}>
                    <SelectTrigger className="w-full border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hincasData.stages.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Configuration Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Configuración
                  </label>
                  <Select value={selectedConfig} onValueChange={handleConfigChange}>
                    <SelectTrigger className="w-full border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentStage?.configurations.map(config => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Distancias Esperadas (m)
                  </h3>
                  <div className="space-y-2 mb-4">
                    {expectedDistances.map((distance, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Hinc {index + 1}:</span>
                        <span className="font-mono font-semibold text-slate-900">{distance.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-100 rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Total:</span>
                      <span className="font-mono font-bold text-slate-900 text-lg">
                        {currentConfig?.totalDistance.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Middle Column - Measurements */}
            <div className="lg:col-span-1">
              <Card className="p-6 border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Mediciones (m)</h2>
                
                <div className="space-y-3 mb-6">
                  {expectedDistances.map((_, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Hinc {index + 1}
                      </label>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder={`${expectedDistances[index].toFixed(4)}`}
                        value={measurements[index] ?? ''}
                        onChange={(e) => handleMeasurementChange(index, e.target.value)}
                        className="border-slate-300 font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Medido (m)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder={`${currentConfig?.totalDistance.toFixed(4)}`}
                    value={calculatedTotal?.toFixed(4) ?? ''}
                    readOnly
                    className="border-slate-300 font-mono font-bold text-base bg-slate-50"
                  />
                  <p className="text-xs text-slate-500 mt-2">Se calcula automáticamente</p>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={handleValidate}
                    disabled={calculatedTotal === null || validationResults.length === 0}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-400"
                  >
                    Validar
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="flex-1 border-slate-300"
                  >
                    Limpiar
                  </Button>
                </div>

                {validationResults.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      placeholder="Añade una nota o descripción para este registro..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-sm resize-none h-20 font-sans"
                    />
                    <Button
                      onClick={handleSaveToHistory}
                      disabled={calculatedTotal === null || validationResults.length === 0}
                      className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Guardar en Histórico
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-1">
              <Card className="p-6 border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Validación</h2>
                
                {validationResults.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Ingresa mediciones para validar</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-6">
                      {validationResults.map((result) => (
                        <div
                          key={result.index}
                          className={`flex items-center justify-between p-3 rounded border-l-4 ${
                            result.isValid
                              ? 'bg-green-50 border-green-500'
                              : 'bg-red-50 border-red-500'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              Hinc {result.index + 1}
                            </div>
                            <div className="text-xs text-slate-600">
                              {result.measured.toFixed(4)} m
                            </div>
                          </div>
                          <div className="text-right mr-3">
                            <div className="font-mono text-sm font-semibold">
                              {result.difference > 0 ? '+' : ''}{result.difference.toFixed(4)}
                            </div>
                            <div className="text-xs text-slate-600">
                              {Math.abs(result.difference).toFixed(4)} m
                            </div>
                          </div>
                          {result.isValid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {totalValidation && (
                      <div className="border-t border-slate-200 pt-4">
                        <div
                          className={`p-4 rounded-lg border-2 ${
                            totalValidation.isValid
                              ? 'bg-green-50 border-green-500'
                              : 'bg-red-50 border-red-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-900">Total</span>
                            {totalValidation.isValid ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="font-mono text-sm mb-1">
                            Medido: {totalValidation.measured.toFixed(4)} m
                          </div>
                          <div className="font-mono text-sm mb-2">
                            Esperado: {totalValidation.expected.toFixed(4)} m
                          </div>
                          <div className="font-mono text-sm font-semibold">
                            Diferencia: {totalValidation.difference > 0 ? '+' : ''}{totalValidation.difference.toFixed(4)} m
                          </div>
                        </div>
                      </div>
                    )}

                    {allValid && (
                      <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                        <p className="text-green-800 font-semibold text-center">
                          ✓ Todas las mediciones son válidas
                        </p>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Tolerancia individual: ±{(hincasData.tolerance.individual).toFixed(4)} m | Tolerancia total: ±{(hincasData.tolerance.total).toFixed(4)} m</p>
        </div>
      </div>
    </div>
  );
}

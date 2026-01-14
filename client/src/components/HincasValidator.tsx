import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, AlertCircle, Trash2, Download, FileDown, CheckSquare2 } from 'lucide-react';
import { Link } from 'wouter';
import jsPDF from 'jspdf';
import defaultHincasData from '@/lib/hincasData.json';

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
  const [hincasData, setHincasData] = useState(defaultHincasData);
  const [selectedStage, setSelectedStage] = useState<string>('162M');
  const [selectedConfig, setSelectedConfig] = useState<string>('2R_EXT_162');
  const [measurements, setMeasurements] = useState<(number | null)[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [description, setDescription] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFilter, setExportFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [csvContent, setCsvContent] = useState<string>('');
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [configColor, setConfigColor] = useState<string>('#000000');

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

  const currentStage = useMemo(() => hincasData.stages.find(s => s.id === selectedStage), [hincasData, selectedStage]);
  const currentConfig = useMemo(() => currentStage?.configurations.find(c => c.id === selectedConfig), [currentStage, selectedConfig]);

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
    const config = currentStage?.configurations.find(c => c.id === configId);
    if (config) {
      setConfigColor(config.color);
    }
  };

  useEffect(() => {
    if (currentConfig) {
      setConfigColor(currentConfig.color);
    }
  }, [currentConfig]);

  const handleMeasurementChange = (index: number, value: string) => {
    const newMeasurements = [...measurements];
    newMeasurements[index] = value === '' ? null : parseFloat(value);
    setMeasurements(newMeasurements);
  };

  const calculatedTotal = useMemo(() => {
    const validMeasurements = measurements.filter(m => m !== null && m !== undefined) as number[];
    if (validMeasurements.length === 0) return null;
    return Math.round(validMeasurements.reduce((a, b) => a + b, 0) * 10000) / 10000;
  }, [measurements]);

  const validationResults = useMemo(() => {
    const results: ValidationResult[] = [];
    
    expectedDistances.forEach((expected, index) => {
      const measured = measurements[index];
      if (measured !== null && measured !== undefined) {
        const difference = measured - expected;
        const roundedDifference = Math.round(Math.abs(difference) * 10000) / 10000;
        const isValid = roundedDifference <= hincasData.tolerance.individual;
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
  }, [measurements, expectedDistances, hincasData.tolerance.individual]);

  const totalValidation = useMemo(() => {
    if (!currentConfig || calculatedTotal === null) {
      return null;
    }
    const difference = calculatedTotal - currentConfig.totalDistance;
    const roundedDifference = Math.round(Math.abs(difference) * 10000) / 10000;
    const isValid = roundedDifference <= hincasData.tolerance.total;
    return {
      expected: currentConfig.totalDistance,
      measured: calculatedTotal,
      difference,
      isValid
    };
  }, [currentConfig, calculatedTotal, hincasData.tolerance.total]);

  const allValid = useMemo(() => {
    if (validationResults.length === 0 || !totalValidation) return false;
    return validationResults.every(r => r.isValid) && totalValidation.isValid;
  }, [validationResults, totalValidation]);

  const generatePDF = () => {
    const recordsToExport = Array.from(selectedRecords).map(id => history.find(h => h.id === id)).filter(Boolean) as HistoryEntry[];
    if (recordsToExport.length === 0) return;

    const doc = new jsPDF();
    let yPosition = 10;

    recordsToExport.forEach((record, idx) => {
      if (idx > 0) {
        doc.addPage();
        yPosition = 10;
      }

      doc.setFontSize(14);
      doc.text(`Validación ${idx + 1}`, 12, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.text(`Fecha: ${record.timestamp}`, 12, yPosition);
      yPosition += 5;
      doc.text(`Stage: ${record.stage}`, 12, yPosition);
      yPosition += 5;
      doc.text(`Configuración: ${record.configuration}`, 12, yPosition);
      yPosition += 5;
      doc.text(`Estado: ${record.totalValidation.isValid ? 'Válido ✓' : 'Inválido ✗'}`, 12, yPosition);
      yPosition += 8;

      doc.text('Mediciones:', 12, yPosition);
      yPosition += 5;
      record.measurements.forEach((m, i) => {
        const expected = record.results[i]?.expected || 0;
        const diff = record.results[i]?.difference || 0;
        doc.setTextColor(diff <= 0.04 && diff >= -0.04 ? 0 : 255, 0, 0);
        doc.text(`  Hinc ${i + 1}: ${expected.toFixed(4)} → ${m.toFixed(4)} | ${diff >= 0 ? '+' : ''}${diff.toFixed(4)}`, 12, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;
      });

      doc.text(`Total: ${record.totalValidation.expected.toFixed(4)} → ${record.total.toFixed(4)} | ${record.totalValidation.difference >= 0 ? '+' : ''}${record.totalValidation.difference.toFixed(4)}`, 12, yPosition);
      yPosition += 8;

      if (record.description) {
        doc.text(`Descripción: ${record.description}`, 12, yPosition);
        yPosition += 6;
      }

      yPosition += 2;
    });

    doc.save(`hincas_history_${new Date().toISOString().split('T')[0]}.pdf`);
    setSelectedRecords(new Set());
    setShowExportDialog(false);
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

  const handleDeleteRecord = (id: string) => {
    setHistory(history.filter(h => h.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todo el histórico?')) {
      setHistory([]);
    }
  };

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === history.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(history.map(h => h.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Comprobador de Hincas</h1>
            <p className="text-slate-600">Validación de distancias entre hincas con tolerancia ±0.04 m</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              className="border-slate-300"
            >
              {showHistory ? 'Ocultar' : 'Ver'} Histórico ({history.length})
            </Button>
            <Link href="/admin">
              <Button variant="outline" className="border-slate-300">
                ⚙️ Administración
              </Button>
            </Link>
          </div>
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
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                  >
                    {selectedRecords.size === history.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </Button>
                  {selectedRecords.size > 0 && (
                    <Button
                      onClick={() => setShowExportDialog(true)}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Exportar PDF ({selectedRecords.size})
                    </Button>
                  )}
                  <Button
                    onClick={handleClearAll}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpiar Todo
                  </Button>
                </div>

                {showExportDialog && (
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <h3 className="font-semibold mb-3">Seleccionar registros para exportar</h3>
                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                      {history.map(record => (
                        <label key={record.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRecords.has(record.id)}
                            onChange={() => handleSelectRecord(record.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            {record.timestamp} - {record.configuration} - {record.totalValidation.isValid ? '✓ Válido' : '✗ Inválido'}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={generatePDF} className="bg-green-600 hover:bg-green-700">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar PDF
                      </Button>
                      <Button onClick={() => setShowExportDialog(false)} variant="outline">
                        Cancelar
                      </Button>
                    </div>
                  </Card>
                )}

                <div className="space-y-3">
                  {history.map((record) => (
                    <Card
                      key={record.id}
                      className={`p-4 border-l-4 ${
                        record.totalValidation.isValid
                          ? 'border-l-green-500 bg-green-50'
                          : 'border-l-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{record.timestamp}</p>
                          <p className="text-sm text-slate-600">{record.stage} - {record.configuration}</p>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="checkbox"
                            checked={selectedRecords.has(record.id)}
                            onChange={() => handleSelectRecord(record.id)}
                            className="w-4 h-4"
                          />
                          <Button
                            onClick={() => handleDeleteRecord(record.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-sm space-y-1 mb-2">
                        <p>
                          <strong>Total:</strong> {record.totalValidation.expected.toFixed(4)} → {record.total.toFixed(4)} | {record.totalValidation.difference >= 0 ? '+' : ''}{record.totalValidation.difference.toFixed(4)} m
                        </p>
                        <p>
                          <strong>Estado:</strong>{' '}
                          {record.totalValidation.isValid ? (
                            <span className="text-green-600">✓ Válido</span>
                          ) : (
                            <span className="text-red-600">✗ Inválido</span>
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        {record.measurements.map((m, i) => {
                          const result = record.results[i];
                          return (
                            <div key={i} className={result?.isValid ? 'text-green-700' : 'text-red-700'}>
                              Hinc {i + 1}: {result?.expected.toFixed(4)} → {m.toFixed(4)} | {result?.difference >= 0 ? '+' : ''}{result?.difference.toFixed(4)}
                            </div>
                          );
                        })}
                      </div>

                      {record.description && (
                        <p className="text-xs text-slate-600 italic">Nota: {record.description}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          // Main Validator View
          <div className="grid grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuración</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Stage</label>
                  <Select value={selectedStage} onValueChange={handleStageChange}>
                    <SelectTrigger className="border-slate-300">
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Configuración</label>
                  <Select value={selectedConfig} onValueChange={handleConfigChange}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentStage?.configurations.map(config => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: config.color }}
                            />
                            {config.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div
                    className="p-3 rounded border-2"
                    style={{ borderColor: configColor, backgroundColor: configColor + '20' }}
                  >
                    <p className="text-sm font-medium text-slate-700">{selectedConfig}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Distancias Esperadas (m)</h3>
                  <div className="space-y-2 text-sm">
                    {expectedDistances.map((dist, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-slate-600">Hinc {idx + 1}:</span>
                        <span className="font-mono font-semibold text-slate-900">{dist.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Total:</span>
                    <span className="font-mono font-bold text-lg text-slate-900">{currentConfig?.totalDistance.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Measurements Panel */}
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Mediciones (m)</h2>

              <div className="space-y-3 mb-6">
                {expectedDistances.map((_, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Hinc {idx + 1}</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={measurements[idx] ?? ''}
                      onChange={(e) => handleMeasurementChange(idx, e.target.value)}
                      placeholder={expectedDistances[idx]?.toFixed(4)}
                      className="border-slate-300"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Total Medido (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={calculatedTotal ?? ''}
                  readOnly
                  className="border-slate-300 bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1">Se calcula automáticamente</p>
              </div>

              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-slate-700">Descripción (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Agregar nota..."
                  className="w-full p-2 border border-slate-300 rounded text-sm"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveToHistory}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={validationResults.length === 0}
                >
                  <CheckSquare2 className="w-4 h-4 mr-2" />
                  Guardar en Histórico
                </Button>
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </Card>

            {/* Validation Panel */}
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Validación</h2>

              {validationResults.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Ingresa mediciones para validar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {validationResults.map((result) => (
                    <div
                      key={result.index}
                      className={`p-3 rounded border-l-4 ${
                        result.isValid
                          ? 'bg-green-50 border-l-green-500'
                          : 'bg-red-50 border-l-red-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">Hinc {result.index + 1}</p>
                          <p className="text-xs text-slate-600 font-mono">
                            {result.expected.toFixed(4)} → {result.measured.toFixed(4)}
                          </p>
                          <p className={`text-xs font-semibold ${result.isValid ? 'text-green-700' : 'text-red-700'}`}>
                            {result.difference >= 0 ? '+' : ''}{result.difference.toFixed(4)} m
                          </p>
                        </div>
                        {result.isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}

                  {totalValidation && (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <div
                        className={`p-4 rounded-lg border-2 ${
                          totalValidation.isValid
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-900 mb-2">Total</p>
                        <p className="text-sm font-mono text-slate-700 mb-2">
                          {totalValidation.expected.toFixed(4)} → {totalValidation.measured.toFixed(4)}
                        </p>
                        <p className={`text-sm font-bold ${totalValidation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                          {totalValidation.difference >= 0 ? '+' : ''}{totalValidation.difference.toFixed(4)} m
                        </p>
                      </div>

                      <div className="mt-4">
                        {allValid ? (
                          <div className="p-3 rounded-lg bg-green-100 border border-green-300 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-700" />
                            <span className="text-sm font-semibold text-green-700">✓ Todas las mediciones son válidas</span>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-red-100 border border-red-300 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-700" />
                            <span className="text-sm font-semibold text-red-700">✗ Hay mediciones fuera de tolerancia</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
                <p>Tolerancia individual: ±{hincasData.tolerance.individual.toFixed(4)} m | Tolerancia total: ±{hincasData.tolerance.total.toFixed(4)} m</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

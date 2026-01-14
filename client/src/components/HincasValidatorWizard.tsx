import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Save, FileDown } from 'lucide-react';
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

type WizardStep = 'stage' | 'config' | 'measurements' | 'results';

export default function HincasValidatorWizard() {
  const [hincasData, setHincasData] = useState(defaultHincasData);
  const [currentStep, setCurrentStep] = useState<WizardStep>('stage');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [measurements, setMeasurements] = useState<(number | null)[]>([]);
  const [currentHincaIndex, setCurrentHincaIndex] = useState(0);
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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

  const expectedDistances = useMemo(() => {
    if (!currentConfig) return [];
    return currentConfig.distances;
  }, [currentConfig]);

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

  const handleStageSelect = (stageId: string) => {
    setSelectedStage(stageId);
    const stage = hincasData.stages.find(s => s.id === stageId);
    if (stage && stage.configurations.length > 0) {
      setSelectedConfig('');
    }
    setCurrentStep('config');
  };

  const handleConfigSelect = (configId: string) => {
    setSelectedConfig(configId);
    const config = currentStage?.configurations.find(c => c.id === configId);
    if (config) {
      setMeasurements(new Array(config.distances.length).fill(null));
      setCurrentHincaIndex(0);
    }
    setCurrentStep('measurements');
  };

  const handleMeasurementInput = (value: string) => {
    const newMeasurements = [...measurements];
    newMeasurements[currentHincaIndex] = value === '' ? null : parseFloat(value);
    setMeasurements(newMeasurements);
  };

  const handleNextHinca = () => {
    if (currentHincaIndex < expectedDistances.length - 1) {
      setCurrentHincaIndex(currentHincaIndex + 1);
    } else {
      setCurrentStep('results');
    }
  };

  const handlePrevHinca = () => {
    if (currentHincaIndex > 0) {
      setCurrentHincaIndex(currentHincaIndex - 1);
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
      handleReset();
    }
  };

  const handleReset = () => {
    setCurrentStep('stage');
    setSelectedStage('');
    setSelectedConfig('');
    setMeasurements([]);
    setCurrentHincaIndex(0);
    setDescription('');
  };

  const generatePDF = () => {
    if (!totalValidation) return;

    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(16);
    doc.text('Validación de Hincas', 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString('es-ES')}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Stage: ${currentStage?.name}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Configuración: ${selectedConfig}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Estado: ${allValid ? 'Válido ✓' : 'Inválido ✗'}`, 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.text('Mediciones:', 20, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    validationResults.forEach((result, i) => {
      const color = result.isValid ? [0, 128, 0] : [255, 0, 0];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(
        `Hinc ${i + 1}: ${result.expected.toFixed(4)} m → ${result.measured.toFixed(4)} m | ${result.difference >= 0 ? '+' : ''}${result.difference.toFixed(4)} m`,
        20,
        yPosition
      );
      yPosition += 5;
    });

    doc.setTextColor(0, 0, 0);
    yPosition += 5;
    doc.setFontSize(10);
    doc.text(
      `Total: ${totalValidation.expected.toFixed(4)} m → ${totalValidation.measured.toFixed(4)} m | ${totalValidation.difference >= 0 ? '+' : ''}${totalValidation.difference.toFixed(4)} m`,
      20,
      yPosition
    );

    if (description) {
      yPosition += 10;
      doc.text(`Descripción: ${description}`, 20, yPosition);
    }

    doc.save(`validacion_hincas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const currentMeasurement = measurements[currentHincaIndex];
  const currentExpected = expectedDistances[currentHincaIndex];
  const currentValidation = validationResults.find(r => r.index === currentHincaIndex);

  const canProceed = () => {
    if (currentStep === 'stage') return selectedStage !== '';
    if (currentStep === 'config') return selectedConfig !== '';
    if (currentStep === 'measurements') return currentMeasurement !== null && currentMeasurement !== undefined;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Comprobador de Hincas</h1>
            <p className="text-slate-600">Validación de distancias entre hincas con tolerancia ±{hincasData.tolerance.individual.toFixed(2)} m</p>
          </div>
          <div className="flex gap-2">
            <Link href="/?view=history">
              <Button variant="outline" className="border-slate-300">
                Ver Histórico ({history.length})
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" className="border-slate-300">
                ⚙️ Administración
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {(['stage', 'config', 'measurements', 'results'] as WizardStep[]).map((step, idx) => {
              const stepLabels = {
                stage: 'Seleccionar Stage',
                config: 'Seleccionar Configuración',
                measurements: 'Ingresar Mediciones',
                results: 'Revisar Resultados'
              };
              const isActive = currentStep === step;
              const isCompleted = 
                (step === 'stage' && selectedStage !== '') ||
                (step === 'config' && selectedConfig !== '') ||
                (step === 'measurements' && measurements.every(m => m !== null)) ||
                (step === 'results' && currentStep === 'results');

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                    </div>
                    <p className={`text-xs mt-2 text-center ${isActive ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {stepLabels[step]}
                    </p>
                  </div>
                  {idx < 3 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        isCompleted ? 'bg-green-600' : 'bg-slate-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 border-slate-200 shadow-lg">
          {/* Step 1: Select Stage */}
          {currentStep === 'stage' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Selecciona el Tipo de Stage</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hincasData.stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageSelect(stage.id)}
                    className={`p-6 border-2 rounded-lg transition-all hover:shadow-md ${
                      selectedStage === stage.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{stage.name}</h3>
                    <p className="text-sm text-slate-600">{stage.configurations.length} configuraciones</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Configuration */}
          {currentStep === 'config' && currentStage && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Button
                  onClick={() => setCurrentStep('stage')}
                  variant="ghost"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Volver
                </Button>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Selecciona la Configuración</h2>
              <p className="text-slate-600 mb-6">Stage: {currentStage.name}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentStage.configurations.map((config) => (
                  <button
                    key={config.id}
                    onClick={() => handleConfigSelect(config.id)}
                    className={`p-6 border-2 rounded-lg transition-all hover:shadow-md text-left ${
                      selectedConfig === config.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <h3 className="text-lg font-semibold text-slate-900">{config.name}</h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      {config.distances.length} hincas | Total: {config.totalDistance.toFixed(4)} m
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Input Measurements */}
          {currentStep === 'measurements' && currentConfig && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Button
                  onClick={() => setCurrentStep('config')}
                  variant="ghost"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Volver
                </Button>
              </div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingresa las Mediciones</h2>
                <p className="text-slate-600">
                  Configuración: {selectedConfig} | Progreso: {currentHincaIndex + 1} de {expectedDistances.length}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>Hinca {currentHincaIndex + 1}</span>
                  <span>{Math.round(((currentHincaIndex + 1) / expectedDistances.length) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${((currentHincaIndex + 1) / expectedDistances.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Measurement Input */}
              <div className="bg-slate-50 p-8 rounded-lg border-2 border-slate-200 mb-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Hinca {currentHincaIndex + 1}</h3>
                  <p className="text-3xl font-bold text-slate-900 mb-1">
                    {currentExpected?.toFixed(4)} m
                  </p>
                  <p className="text-sm text-slate-600">Distancia esperada</p>
                </div>

                <div className="max-w-md mx-auto">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ingresa la medida real (metros)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={currentMeasurement ?? ''}
                    onChange={(e) => handleMeasurementInput(e.target.value)}
                    placeholder={currentExpected?.toFixed(4)}
                    className="text-2xl h-16 text-center border-slate-300"
                    autoFocus
                  />
                </div>

                {/* Validation Feedback */}
                {currentMeasurement !== null && currentMeasurement !== undefined && currentValidation && (
                  <div className={`mt-6 p-4 rounded-lg ${currentValidation.isValid ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                    <div className="flex items-center justify-center gap-2">
                      {currentValidation.isValid ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                          <span className="font-semibold text-green-700">Medida válida</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-600" />
                          <span className="font-semibold text-red-700">Medida fuera de tolerancia</span>
                        </>
                      )}
                    </div>
                    <p className="text-center text-sm mt-2 text-slate-700">
                      Diferencia: {currentValidation.difference >= 0 ? '+' : ''}{currentValidation.difference.toFixed(4)} m
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  onClick={handlePrevHinca}
                  variant="outline"
                  disabled={currentHincaIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <div className="text-sm text-slate-600">
                  {measurements.filter(m => m !== null).length} de {expectedDistances.length} completadas
                </div>
                <Button
                  onClick={handleNextHinca}
                  disabled={!canProceed()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentHincaIndex === expectedDistances.length - 1 ? 'Finalizar' : 'Siguiente'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && totalValidation && (
            <div>
              <div className="text-center mb-8">
                <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-lg ${allValid ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                  {allValid ? (
                    <>
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                      <div className="text-left">
                        <h2 className="text-2xl font-bold text-green-700">Validación Exitosa</h2>
                        <p className="text-green-600">Todas las medidas están dentro de tolerancia</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-10 h-10 text-red-600" />
                      <div className="text-left">
                        <h2 className="text-2xl font-bold text-red-700">Validación Fallida</h2>
                        <p className="text-red-600">Algunas medidas están fuera de tolerancia</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Results Table */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Resumen de Mediciones</h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Hinca</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Esperada (m)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Medida (m)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Diferencia (m)</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResults.map((result) => (
                        <tr key={result.index} className={result.isValid ? 'bg-white' : 'bg-red-50'}>
                          <td className="px-4 py-3 text-sm text-slate-900">Hinc {result.index + 1}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-slate-900">{result.expected.toFixed(4)}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-slate-900">{result.measured.toFixed(4)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-mono ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {result.difference >= 0 ? '+' : ''}{result.difference.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {result.isValid ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-4 py-3 text-sm text-slate-900">Total</td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-slate-900">{totalValidation.expected.toFixed(4)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-slate-900">{totalValidation.measured.toFixed(4)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-mono ${totalValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {totalValidation.difference >= 0 ? '+' : ''}{totalValidation.difference.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {totalValidation.isValid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Agregar nota sobre esta validación..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveToHistory}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar en Histórico
                </Button>
                <Button
                  onClick={generatePDF}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Nueva Validación
                </Button>
              </div>

              <div className="mt-4 text-center">
                <Button
                  onClick={() => setCurrentStep('measurements')}
                  variant="ghost"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Volver a editar mediciones
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

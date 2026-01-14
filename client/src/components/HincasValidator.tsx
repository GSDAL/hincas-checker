import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import hincasData from '@/lib/hincasData.json';

interface ValidationResult {
  index: number;
  expected: number;
  measured: number;
  difference: number;
  isValid: boolean;
}

interface HincasValidatorProps {
  onValidationComplete?: (results: ValidationResult[]) => void;
}

export default function HincasValidator({ onValidationComplete }: HincasValidatorProps) {
  const [selectedStage, setSelectedStage] = useState<string>('162M');
  const [selectedConfig, setSelectedConfig] = useState<string>('2R_EXT_162');
  const [measurements, setMeasurements] = useState<(number | null)[]>([]);
  const [totalMeasurement, setTotalMeasurement] = useState<number | null>(null);

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
    setTotalMeasurement(null);
  };

  const handleConfigChange = (configId: string) => {
    setSelectedConfig(configId);
    setMeasurements([]);
    setTotalMeasurement(null);
  };

  const handleMeasurementChange = (index: number, value: string) => {
    const newMeasurements = [...measurements];
    newMeasurements[index] = value === '' ? null : parseFloat(value);
    setMeasurements(newMeasurements);
  };

  const handleTotalChange = (value: string) => {
    setTotalMeasurement(value === '' ? null : parseFloat(value));
  };

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
    if (!currentConfig || totalMeasurement === null) {
      return null;
    }
    const difference = totalMeasurement - currentConfig.totalDistance;
    const isValid = Math.abs(difference) <= hincasData.tolerance.total;
    return {
      expected: currentConfig.totalDistance,
      measured: totalMeasurement,
      difference,
      isValid
    };
  }, [totalMeasurement, currentConfig]);

  const allValid = validationResults.length > 0 && 
                   validationResults.every(r => r.isValid) &&
                   (totalValidation === null || totalValidation.isValid);

  const handleValidate = () => {
    if (onValidationComplete) {
      onValidationComplete(validationResults);
    }
  };

  const handleClear = () => {
    setMeasurements([]);
    setTotalMeasurement(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Comprobador de Hincas</h1>
          <p className="text-slate-600">Validación de distancias entre hincas con tolerancia ±4 cm</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
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
                  Distancias Esperadas (cm)
                </h3>
                <div className="space-y-2 mb-4">
                  {expectedDistances.map((distance, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Hinc {index + 1}:</span>
                      <span className="font-mono font-semibold text-slate-900">{distance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-100 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Total:</span>
                    <span className="font-mono font-bold text-slate-900 text-lg">
                      {currentConfig?.totalDistance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Middle Column - Measurements */}
          <div className="lg:col-span-1">
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Mediciones (cm)</h2>
              
              <div className="space-y-3 mb-6">
                {expectedDistances.map((_, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hinc {index + 1}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={`${expectedDistances[index].toFixed(2)}`}
                      value={measurements[index] ?? ''}
                      onChange={(e) => handleMeasurementChange(index, e.target.value)}
                      className="border-slate-300 font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Medido
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={`${currentConfig?.totalDistance.toFixed(2)}`}
                  value={totalMeasurement ?? ''}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  className="border-slate-300 font-mono font-bold text-base"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={handleValidate}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
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
                            {result.measured.toFixed(2)} cm
                          </div>
                        </div>
                        <div className="text-right mr-3">
                          <div className="font-mono text-sm font-semibold">
                            {result.difference > 0 ? '+' : ''}{result.difference.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-600">
                            {Math.abs(result.difference).toFixed(2)} cm
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
                          Medido: {totalValidation.measured.toFixed(2)} cm
                        </div>
                        <div className="font-mono text-sm mb-2">
                          Esperado: {totalValidation.expected.toFixed(2)} cm
                        </div>
                        <div className="font-mono text-sm font-semibold">
                          Diferencia: {totalValidation.difference > 0 ? '+' : ''}{totalValidation.difference.toFixed(2)} cm
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

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Tolerancia individual: ±{(hincasData.tolerance.individual * 10).toFixed(1)} cm | Tolerancia total: ±{(hincasData.tolerance.total * 10).toFixed(1)} cm</p>
        </div>
      </div>
    </div>
  );
}

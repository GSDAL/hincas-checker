import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Edit2, Save, X } from "lucide-react";

interface HincasData {
  stages: Array<{
    id: string;
    name: string;
    configurations: Array<{
      id: string;
      name: string;
      color: string;
      distances: number[];
      totalDistance: number;
    }>;
  }>;
  tolerance: {
    individual: number;
    total: number;
  };
}

export default function AdminPanel() {
  const [data, setData] = useState<HincasData | null>(null);
  const [editingConfig, setEditingConfig] = useState<{
    stageId: string;
    configId: string;
  } | null>(null);
  const [editValues, setEditValues] = useState<number[]>([]);
  const [editTolerance, setEditTolerance] = useState({ individual: 0.04, total: 0.04 });

  useEffect(() => {
    // Cargar datos del localStorage
    const stored = localStorage.getItem("hincasData");
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      // Cargar datos por defecto
      fetch("/hincasData.json")
        .then(res => res.json())
        .then(json => {
          setData(json);
          localStorage.setItem("hincasData", JSON.stringify(json));
        });
    }
  }, []);

  const handleEditDistance = (stageId: string, configId: string, distances: number[]) => {
    setEditingConfig({ stageId, configId });
    setEditValues([...distances]);
  };

  const handleSaveDistance = () => {
    if (!data || !editingConfig) return;

    const newData = JSON.parse(JSON.stringify(data));
    const stage = newData.stages.find((s: any) => s.id === editingConfig.stageId);
    const config = stage.configurations.find((c: any) => c.id === editingConfig.configId);

    config.distances = editValues;
    config.totalDistance = Math.round(editValues.reduce((a: number, b: number) => a + b, 0) * 10000) / 10000;

    setData(newData);
    localStorage.setItem("hincasData", JSON.stringify(newData));
    setEditingConfig(null);
  };

  const handleSaveTolerance = () => {
    if (!data) return;

    const newData = JSON.parse(JSON.stringify(data));
    newData.tolerance = editTolerance;

    setData(newData);
    localStorage.setItem("hincasData", JSON.stringify(newData));
  };

  const handleResetToDefault = () => {
    localStorage.removeItem("hincasData");
    window.location.reload();
  };

  if (!data) return <div>Cargando...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Panel de Administración</h1>

      {/* Sección de Tolerancia */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Tolerancia</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tolerancia Individual (m)</label>
            <Input
              type="number"
              step="0.001"
              value={editTolerance.individual}
              onChange={(e) => setEditTolerance({ ...editTolerance, individual: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tolerancia Total (m)</label>
            <Input
              type="number"
              step="0.001"
              value={editTolerance.total}
              onChange={(e) => setEditTolerance({ ...editTolerance, total: parseFloat(e.target.value) })}
            />
          </div>
        </div>
        <Button onClick={handleSaveTolerance} className="mt-4">
          <Save className="w-4 h-4 mr-2" />
          Guardar Tolerancia
        </Button>
      </Card>

      {/* Sección de Configuraciones */}
      <div className="space-y-4">
        {data.stages.map((stage) => (
          <Card key={stage.id} className="p-4">
            <h3 className="text-lg font-semibold mb-4">{stage.name}</h3>
            <div className="space-y-3">
              {stage.configurations.map((config) => (
                <div key={config.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDistance(stage.id, config.id, config.distances)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {editingConfig?.stageId === stage.id && editingConfig?.configId === config.id ? (
                    <div className="space-y-2 bg-white p-3 rounded">
                      <div className="grid grid-cols-3 gap-2">
                        {editValues.map((val, idx) => (
                          <Input
                            key={idx}
                            type="number"
                            step="0.01"
                            value={val}
                            onChange={(e) => {
                              const newValues = [...editValues];
                              newValues[idx] = parseFloat(e.target.value) || 0;
                              setEditValues(newValues);
                            }}
                            placeholder={`Hinc ${idx + 1}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveDistance} className="flex-1">
                          <Save className="w-4 h-4 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingConfig(null)}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <p>Distancias: {config.distances.join(", ")} m</p>
                      <p>Total: {config.totalDistance} m</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Botón de Reset */}
      <Button
        onClick={handleResetToDefault}
        variant="destructive"
        className="w-full"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Restaurar Valores por Defecto
      </Button>
    </div>
  );
}

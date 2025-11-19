"use client";

import { FormEvent, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type Neighborhood = {
  id: number;
  x: number;
  y: number;
  cluster: number;
};

type Hospital = {
  id: number;
  x: number;
  y: number;
};

type Metrics = {
  avg_distance: number;
  max_distance: number;
  inertia: number;
  iterations: number;
  history?: number[];
};

type HospitalSummary = {
  hospital_id: number;
  vecindarios_asignados: number;
  avg_distance?: number;
  coordinates?: {
    x: number;
    y: number;
  };
};

type SimulationResponse = {
  grid_size: number;
  hospitals: Hospital[];
  neighborhoods: Neighborhood[];
  metrics: Metrics;
  mensaje?: string;
  resumen_hospitales?: HospitalSummary[];
};

type FormState = {
  m: number;
  num_neighborhoods: number;
  k: number;
  random_seed?: number | "";
};

const clusterPalette = [
  "#3D8B7D",
  "#8FBC91",
  "#DBC557",
  "#ECBDBF",
  "#F9DFE0",
  "#579487",
  "#C28D5F",
  "#9E6D9A",
];

const initialForm: FormState = {
  m: 100,
  num_neighborhoods: 600,
  k: 5,
  random_seed: 42,
};

const formatNumber = (value?: number, digits = 2) => {
  if (value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return value.toFixed(digits);
};

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<"grafico" | "resumen" | "resultados">("grafico");

  const resumen = useMemo(() => {
    if (!result?.resumen_hospitales) return [];
    return result.resumen_hospitales;
  }, [result]);

  const handleNumberChange = (field: keyof FormState, value: string): void => {
    if (field === "random_seed") {
      setForm((prev) => ({
        ...prev,
        random_seed: value === "" ? "" : Number(value),
      }));
      return;
    }

    const safeValue = value === "" ? 0 : Number(value);
    setForm((prev) => ({
      ...prev,
      [field]: safeValue,
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!form.m || form.m <= 0) errors.push("m debe ser mayor a 0.");
    if (!form.num_neighborhoods || form.num_neighborhoods <= 0)
      errors.push("El número de vecindarios debe ser mayor a 0.");
    if (!form.k || form.k <= 0) errors.push("K debe ser mayor a 0.");
    if (
      typeof form.num_neighborhoods === "number" &&
      typeof form.k === "number" &&
      form.k > form.num_neighborhoods
    ) {
      errors.push("K no puede superar al número de vecindarios.");
    }
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validateForm();
    if (errors.length > 0) {
      setErrorMessage(errors.join(" "));
      return;
    }

    try {
      setLoading(true);
      const payload: {
        m: number;
        num_neighborhoods: number;
        k: number;
        random_seed?: number;
      } = {
        m: Number(form.m),
        num_neighborhoods: Number(form.num_neighborhoods),
        k: Number(form.k),
      };

      if (form.random_seed !== "" && form.random_seed !== undefined) {
        payload.random_seed = Number(form.random_seed);
      }

      const response = await fetch(`${API_BASE_URL}/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          detail || "No pudimos completar la simulación. Intenta de nuevo."
        );
      }

      const json: SimulationResponse = await response.json();
      setResult(json);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al comunicarse con el backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flat">
      <section className="config-area">
        <div className="config-form-wrapper">
          <h2>Configuración</h2>
          <form className="config-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                Hospitales (K)
                <input
                  type="number"
                  min={1}
                  value={form.k}
                  onChange={(event) => handleNumberChange("k", event.target.value)}
                  required
                />
              </label>
              <label>
                Vecindarios
                <input
                  type="number"
                  min={10}
                  value={form.num_neighborhoods}
                  onChange={(event) =>
                    handleNumberChange("num_neighborhoods", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                Tamaño m (km)
                <input
                  type="number"
                  min={10}
                  value={form.m}
                  onChange={(event) => handleNumberChange("m", event.target.value)}
                  required
                />
              </label>
              <label>
                Semilla (opcional)
                <input
                  type="number"
                  value={form.random_seed ?? ""}
                  onChange={(event) =>
                    handleNumberChange("random_seed", event.target.value)
                  }
                />
              </label>
            </div>
            <button className="primary-button block" type="submit" disabled={loading}>
              {loading ? "Procesando…" : "Ejecutar simulación"}
            </button>
            {errorMessage && (
              <p role="alert" className="error-message">
                {errorMessage}
              </p>
            )}
          </form>
        </div>
        <div className="tips-panel">
          <h3>Consejos rápidos</h3>
          <ul>
            <li>Usa K menor al número de vecindarios para evitar clusters vacíos.</li>
            <li>Prueba distintas semillas para comparar distribuciones.</li>
            <li>Observa la inercia: valores planos sugieren un K adecuado.</li>
          </ul>
        </div>
      </section>

      <section className="description-panel">
        <p>
          Esta calculadora ejecuta K-means sobre una cuadrícula m × m interpretada
          como kilómetros. Los puntos representan vecindarios generados
          aleatoriamente y los marcadores corresponden a hospitales. Explora cada
          pestaña para revisar el gráfico, los análisis y un listado detallado de
          resultados.
        </p>
      </section>

      <section className="tabs-panel">
        <div className="tabs-row">
          <button
            type="button"
            className={activeTab === "grafico" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("grafico")}
          >
            Vista gráfica
          </button>
          <button
            type="button"
            className={activeTab === "resumen" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("resumen")}
          >
            Resumen analítico
          </button>
          <button
            type="button"
            className={activeTab === "resultados" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("resultados")}
          >
            Resultados detallados
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "grafico" && (
            <GraphPanel result={result} loading={loading} />
          )}
          {activeTab === "resumen" && result && (
            <ResumenPanel metrics={result.metrics} resumen={resumen} />
          )}
          {activeTab === "resultados" && (
            <ResultsPanel result={result} resumen={resumen} />
          )}
          {!result && activeTab !== "grafico" && (
            <div className="empty-state">
              <p>
                Ejecuta una simulación para habilitar esta sección. Aquí verás los
                análisis cuando existan datos disponibles.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function GraphPanel({
  result,
  loading,
}: {
  result: SimulationResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="graph-card">
        <p>Calculando…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="graph-card empty-state">
        <p>
          Aún no hay datos. Configura los parámetros y presiona “Ejecutar
          simulación” para visualizar la cuadrícula.
        </p>
      </div>
    );
  }

  return (
    <div className="graph-card">
      <h3>Distribución de vecindarios y hospitales</h3>
      <SimulationPlot result={result} />
      <div className="legend">
        <span className="legend-item">
          <span className="dot" />
          Vecindarios por hospital
        </span>
        <span className="legend-item">
          <span className="dot hospital" />
          Hospitales (H0…H{result.hospitals.length - 1})
        </span>
      </div>
    </div>
  );
}

function ResumenPanel({
  metrics,
  resumen,
}: {
  metrics: Metrics;
  resumen: HospitalSummary[];
}) {
  return (
    <div className="resumen-grid">
      <article className="analytics-card">
        <div className="panel-header">
          <div>
            <h3>Tendencia de convergencia</h3>
            <p>Inercia de K-means por iteración.</p>
          </div>
        </div>
        <ConvergenceChart history={metrics.history ?? []} />
      </article>
      <article className="analytics-card">
        <div className="panel-header">
          <div>
            <h3>Carga por hospital</h3>
            <p>Cuántos vecindarios atiende cada hospital.</p>
          </div>
        </div>
        <ClusterLoadChart resumen={resumen} />
      </article>
    </div>
  );
}

function ResultsPanel({
  result,
  resumen,
}: {
  result: SimulationResponse | null;
  resumen: HospitalSummary[];
}) {
  if (!result) return null;
  return (
    <div className="results-grid">
      <article>
        <h3>Métricas principales</h3>
        <QuickMetrics metrics={result.metrics} />
      </article>
      <article>
        <h3>Interpretación</h3>
        <p>
          El algoritmo ubicó {result.hospitals.length} hospitales para cubrir{" "}
          {result.neighborhoods.length} vecindarios en una cuadrícula de{" "}
          {result.grid_size} km. La distancia promedio es{" "}
          {formatNumber(result.metrics.avg_distance)} km y la máxima alcanza{" "}
          {formatNumber(result.metrics.max_distance)} km. Estas cifras representan
          el esfuerzo aproximado que realizaría una persona para llegar a su
          hospital más cercano.
        </p>
        <p>
          Revisa las iteraciones empleadas (
          {result.metrics.iterations}) y la historia de inercia para evaluar si el
          algoritmo convergió rápidamente o si debes reconfigurar parámetros como
          la semilla o el número de iteraciones máximas.
        </p>
      </article>
      <article>
        <h3>Detalle por hospital</h3>
        <HospitalList resumen={resumen} />
      </article>
    </div>
  );
}

function QuickMetrics({ metrics }: { metrics: Metrics }) {
  const items = [
    {
      label: "Distancia promedio",
      value: formatNumber(metrics.avg_distance),
      unit: " km",
    },
    {
      label: "Distancia máxima",
      value: formatNumber(metrics.max_distance),
      unit: " km",
    },
    {
      label: "Inercia (km²)",
      value: formatNumber(metrics.inertia, 0),
      unit: "",
    },
    { label: "Iteraciones", value: metrics.iterations.toString(), unit: "" },
  ];

  return (
    <div className="quick-metrics">
      {items.map((metric) => (
        <article key={metric.label} className="metric-card">
          <p className="metric-label">{metric.label}</p>
          <p className="metric-value">
            {metric.value}
            {metric.unit}
          </p>
        </article>
      ))}
    </div>
  );
}

function SimulationPlot({ result }: { result: SimulationResponse }) {
  const { grid_size, neighborhoods, hospitals } = result;
  const invertedY = (y: number) => grid_size - y;

  return (
    <div className="plot-wrapper">
      <svg
        viewBox={`0 0 ${grid_size} ${grid_size}`}
        className="plot"
        role="img"
        aria-label="Cuadrícula de vecindarios y hospitales"
      >
        <rect width="100%" height="100%" fill="#ffffff" stroke="#b5b5b5" />
        {neighborhoods.map((neigh) => (
          <circle
            key={neigh.id}
            cx={neigh.x}
            cy={invertedY(neigh.y)}
            r={1.5}
            fill={clusterPalette[neigh.cluster % clusterPalette.length]}
            opacity={0.85}
          />
        ))}
        {hospitals.map((hospital) => (
          <g key={hospital.id}>
            <rect
              x={hospital.x - 3}
              y={invertedY(hospital.y) - 3}
              width={6}
              height={6}
              fill="#1d1d1b"
            />
            <text
              x={hospital.x}
              y={invertedY(hospital.y) + 10}
              textAnchor="middle"
              fontSize={4}
              fill="#1d1d1b"
            >
              H{hospital.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ConvergenceChart({ history }: { history: number[] }) {
  if (!history.length) return null;
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const points = history.map((value, index) => {
    const x = (index / Math.max(history.length - 1, 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  });
  const first = history[0];
  const last = history[history.length - 1];

  return (
    <div className="line-chart-wrapper">
      <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect className="chart-surface" width="100" height="100" />
        <line className="chart-axis" x1="0" y1="100" x2="100" y2="100" />
        <line className="chart-axis" x1="0" y1="0" x2="0" y2="100" />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#3D8B7D"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="chart-caption">
        Inercia inicial: {formatNumber(first, 0)} • Final: {formatNumber(last, 0)}
      </p>
    </div>
  );
}

function ClusterLoadChart({ resumen }: { resumen: HospitalSummary[] }) {
  if (!resumen.length) return null;
  const max = Math.max(...resumen.map((item) => item.vecindarios_asignados), 1);

  return (
    <div className="load-list">
      {resumen.map((item) => (
        <div key={item.hospital_id} className="load-row">
          <div className="load-label">
            <strong>H{item.hospital_id}</strong>
            <span>{item.vecindarios_asignados} vecindarios</span>
          </div>
          <div className="load-bar">
            <div
              className="load-bar-fill"
              style={{
                width: `${(item.vecindarios_asignados / max) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HospitalList({ resumen }: { resumen: HospitalSummary[] }) {
  if (!resumen.length) return null;
  return (
    <div className="hospital-list flat">
      {resumen.map((item) => (
        <article key={item.hospital_id} className="hospital-item">
          <header>
            <p>Hospital #{item.hospital_id + 1}</p>
            <strong>{item.vecindarios_asignados} vecindarios</strong>
          </header>
          <div>
            <span>Coordenadas (km)</span>
            <p>
              {formatNumber(item.coordinates?.x)} ·{" "}
              {formatNumber(item.coordinates?.y)}
            </p>
          </div>
          <div>
            <span>Distancia media</span>
            <p>{formatNumber(item.avg_distance)} km</p>
          </div>
        </article>
      ))}
    </div>
  );
}

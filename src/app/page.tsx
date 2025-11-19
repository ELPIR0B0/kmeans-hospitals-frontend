"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
  const [activeView, setActiveView] =
    useState<"grafica" | "resumen" | "mapa">("grafica");

  useEffect(() => {
    setActiveView("grafica");
  }, [result?.metrics.iterations]);

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
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Simulación educativa</p>
          <h1>Calculadora K-means para hospitales</h1>
          <p className="subtitle">
            Define cuántos hospitales necesitas en una cuadrícula m × m, genera
            vecindarios sintéticos y analiza los resultados con gráficos claros.
          </p>
        </div>
        <div className="hero-badge">
          <span>Backend</span>
          <code>{API_BASE_URL.replace(/^https?:\/\//, "")}</code>
        </div>
      </header>

      <section className="workspace">
        <aside className="config-card">
          <h2>Configuración</h2>
          <form className="config-form" onSubmit={handleSubmit}>
            <label>
              Número de hospitales (K)
              <input
                type="number"
                min={1}
                value={form.k}
                onChange={(event) => handleNumberChange("k", event.target.value)}
                required
              />
            </label>
            <label>
              Número de vecindarios
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
              Tamaño de la cuadrícula (m)
              <input
                type="number"
                min={10}
                value={form.m}
                onChange={(event) => handleNumberChange("m", event.target.value)}
                required
              />
            </label>
            <label>
              Semilla aleatoria (opcional)
              <input
                type="number"
                value={form.random_seed ?? ""}
                onChange={(event) =>
                  handleNumberChange("random_seed", event.target.value)
                }
              />
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Calculando…" : "Calcular"}
            </button>
          </form>

          {errorMessage && (
            <p role="alert" className="error-message">
              {errorMessage}
            </p>
          )}

          {result ? (
            <QuickMetrics metrics={result.metrics} />
          ) : (
            <p className="micro-copy">
              Ejecuta una simulación para obtener distancias promedio, inercia e
              iteraciones del algoritmo.
            </p>
          )}

          <div className="info-block">
            <h3>Consejos rápidos</h3>
            <ul>
              <li>
                Mantén K por debajo del número de vecindarios para evitar clusters
                vacíos.
              </li>
              <li>
                Usa la misma semilla para comparar escenarios o modifícala para
                nuevas distribuciones.
              </li>
              <li>
                Observa la inercia: si deja de bajar drásticamente, puede ser
                suficiente número de hospitales.
              </li>
            </ul>
          </div>
        </aside>

        <section className="main-area">
          <ViewSwitch active={activeView} onChange={setActiveView} />
          <div className="view-panel">
            {activeView === "grafica" && (
              <GraphPanel result={result} loading={loading} />
            )}
            {activeView === "resumen" && result && (
              <ResumenPanel metrics={result.metrics} resumen={resumen} />
            )}
            {activeView === "mapa" && <MapHint />}
          </div>
        </section>
      </section>

      <section className="explain-card">
        <h2>Interpretación de los resultados</h2>
        <p>
          Cada punto representa un vecindario y se asigna al hospital más cercano
          según la distancia euclidiana. Las distancias expresadas en kilómetros
          ayudan a estimar tiempos de traslado. Revisa también las cargas por
          hospital: si hay desequilibrio o distancias altas, considera ajustar
          los parámetros.
        </p>
        <p>
          En un escenario real, estos resultados sirven como punto de partida
          para evaluar inversión, cobertura y tiempos de respuesta en servicios
          de salud urbanos.
        </p>
      </section>
    </div>
  );
}

function ViewSwitch({
  active,
  onChange,
}: {
  active: "grafica" | "resumen" | "mapa";
  onChange: (value: "grafica" | "resumen" | "mapa") => void;
}) {
  return (
    <div className="view-switch">
      <button
        type="button"
        className={`view-button ${active === "grafica" ? "active" : ""}`}
        onClick={() => onChange("grafica")}
      >
        Ver gráfico
      </button>
      <button
        type="button"
        className={`view-button ${active === "resumen" ? "active" : ""}`}
        onClick={() => onChange("resumen")}
      >
        Resumen analítico
      </button>
      <button
        type="button"
        className={`view-button ${active === "mapa" ? "active" : ""}`}
        onClick={() => onChange("mapa")}
      >
        Vista mapa
      </button>
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
          Aún no hay datos. Configura los parámetros y presiona “Calcular” para
          visualizar la cuadrícula.
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
          Vecindarios (clusters)
        </span>
        <span className="legend-item">
          <span className="dot hospital" />
          Hospitales
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
            <p>Observa cómo disminuye la inercia por iteración.</p>
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
      <article className="analytics-card full-width">
        <div className="panel-header">
          <div>
            <h3>Detalle por hospital</h3>
            <p>Coordenadas y distancia media asignada.</p>
          </div>
        </div>
        <HospitalList resumen={resumen} />
      </article>
    </div>
  );
}

function MapHint() {
  return (
    <div className="graph-card map-hint">
      <h3>Vista mapa (conceptual)</h3>
      <p>
        Aquí podrías integrar un visor geográfico como Leaflet o Mapbox para
        posicionar los hospitales sobre calles reales. Por ahora mostramos una
        descripción y mantenemos la coherencia con la cuadrícula.
      </p>
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
        <rect
          width="100%"
          height="100%"
          rx={18}
          fill="#ffffff"
          stroke="#ECBDBF"
          strokeWidth={1}
        />
        {neighborhoods.map((neigh) => (
          <circle
            key={neigh.id}
            cx={neigh.x}
            cy={invertedY(neigh.y)}
            r={1.4}
            fill={clusterPalette[neigh.cluster % clusterPalette.length]}
            opacity={0.8}
          />
        ))}
        {hospitals.map((hospital) => (
          <g key={hospital.id}>
            <circle
              cx={hospital.x}
              cy={invertedY(hospital.y)}
              r={4.5}
              fill="#FFFFFF"
              stroke="#3D8B7D"
              strokeWidth={1.5}
            />
            <text
              x={hospital.x}
              y={invertedY(hospital.y) + 10}
              textAnchor="middle"
              fontSize={4}
              fill="#3D8B7D"
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
        <rect className="chart-surface" x="0" y="0" width="100" height="100" />
        <line className="chart-axis" x1="0" y1="100" x2="100" y2="100" />
        <line className="chart-axis" x1="0" y1="0" x2="0" y2="100" />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="var(--color-viridian)"
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
    <div className="hospital-list">
      {resumen.map((item) => (
        <article key={item.hospital_id} className="hospital-item">
          <header>
            <p>Hospital #{item.hospital_id + 1}</p>
            <strong>{item.vecindarios_asignados} vecindarios</strong>
          </header>
          <div className="hospital-meta">
            <div>
              <span>Coordenadas</span>
              <p>
                {formatNumber(item.coordinates?.x)} km ·{" "}
                {formatNumber(item.coordinates?.y)} km
              </p>
            </div>
            <div>
              <span>Distancia media</span>
              <p>{formatNumber(item.avg_distance)} km</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

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
  const [accent, setAccent] = useState<string>("visual");

  useEffect(() => {
    setAccent("visual");
  }, [result?.metrics.iterations]);

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

  const resumen = useMemo(() => {
    if (!result?.resumen_hospitales) return [];
    return result.resumen_hospitales;
  }, [result]);

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Simulación educativa</p>
          <h1>Planificador de hospitales con K-means</h1>
          <p className="subtitle">
            Construye escenarios para ubicar hospitales en una cuadrícula m × m
            (cada unidad equivale a 1 km) y observa el impacto en las distancias.
          </p>
        </div>
        <div className="hero-badge">
          <span>Backend conectado</span>
          <code>{API_BASE_URL.replace(/^https?:\/\//, "")}</code>
        </div>
      </header>

      <main className="layout-grid">
        <section className="smart-panel">
          <h2>Parámetros de simulación</h2>
          <p className="card-description">
            Ajusta los valores y ejecuta la simulación para generar vecindarios
            sintéticos y ubicar K hospitales automáticamente.
          </p>

          <form className="form-grid" onSubmit={handleSubmit}>
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
              {loading ? "Calculando…" : "Simular"}
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
              Después de simular verás aquí las distancias promedio, la inercia y
              las iteraciones empleadas por K-means.
            </p>
          )}

          <div className="info-block">
            <h3>¿Qué significa cada métrica?</h3>
            <ul>
              <li>
                <strong>Distancia promedio:</strong> traslado típico desde un
                vecindario al hospital más cercano.
              </li>
              <li>
                <strong>Inercia:</strong> suma de distancias al cuadrado; indica
                qué tan compactos son los clusters.
              </li>
              <li>
                <strong>Iteraciones:</strong> pasos necesarios para converger;
                ayuda a entender la estabilidad del modelo.
              </li>
            </ul>
          </div>
        </section>

        <section className="visual-panel">
          {result ? (
            <>
              <SimulationPlot result={result} />
              <div className="summary-strip">
                <ConvergenceBadge iterations={result.metrics.iterations} />
                <p>
                  Se agruparon {result.neighborhoods.length} vecindarios dentro
                  de una cuadrícula de {result.grid_size} km, ubicando{" "}
                  {result.hospitals.length} hospitales.
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>
                Aún no hay resultados. Configura una simulación y observa cómo se
                distribuyen los vecindarios por hospital.
              </p>
            </div>
          )}
        </section>
      </main>

      {result && (
        <>
          <section className="analytics-section">
            <article className="analytics-card">
              <div className="panel-header">
                <div>
                  <h3>Tendencia de convergencia</h3>
                  <p>Inercia por iteración</p>
                </div>
              </div>
              <ConvergenceChart history={result.metrics.history ?? []} />
            </article>

            <article className="analytics-card">
              <div className="panel-header">
                <div>
                  <h3>Carga por hospital</h3>
                  <p>Vecindarios atendidos y equilibrio de clusters</p>
                </div>
              </div>
              <ClusterLoadChart resumen={resumen} />
            </article>
          </section>

          <section className="hospital-section">
            <div className="hospital-header">
              <div>
                <h2>Hospitales sugeridos</h2>
                <p>
                  Coordenadas finales y cobertura de cada hospital en kilómetros.
                </p>
              </div>
              <button
                type="button"
                className={`toggle ${accent === "visual" ? "active" : ""}`}
                onClick={() => setAccent("visual")}
              >
                Resaltar en mapa
              </button>
            </div>
            <HospitalList resumen={resumen} />
          </section>
        </>
      )}

      <section className="explain-card">
        <h2>¿Cómo interpretar estos resultados?</h2>
        <p>
          K-means agrupa vecindarios por proximidad y cada grupo recibe un
          hospital. El término <em>cluster</em> alude al conjunto de puntos que
          comparten el mismo hospital más cercano. Las distancias que ves (en km)
          aproximan el esfuerzo de traslado.
        </p>
        <p>
          Usa los gráficos para detectar saturaciones: si un hospital concentra
          demasiados vecindarios o tiene distancias medias altas, quizá debas
          incrementar K o reajustar parámetros como m y la semilla.
        </p>
      </section>
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

function ConvergenceBadge({ iterations }: { iterations?: number }) {
  if (iterations === undefined) return null;
  return (
    <div className="pill">
      Convergió en {iterations}{" "}
      {iterations === 1 ? "iteración" : "iteraciones"}.
    </div>
  );
}

function QuickMetrics({ metrics }: { metrics: Metrics }) {
  const items = [
    { label: "Distancia promedio", value: formatNumber(metrics.avg_distance), unit: " km" },
    { label: "Distancia máxima", value: formatNumber(metrics.max_distance), unit: " km" },
    { label: "Inercia (km²)", value: formatNumber(metrics.inertia, 0), unit: "" },
    { label: "Iteraciones", value: metrics.iterations.toString(), unit: "" },
  ];
  return (
    <div className="quick-metrics">
      {items.map((item) => (
        <article key={item.label} className="metric-card">
          <p className="metric-label">{item.label}</p>
          <p className="metric-value">
            {item.value}
            {item.unit}
          </p>
        </article>
      ))}
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

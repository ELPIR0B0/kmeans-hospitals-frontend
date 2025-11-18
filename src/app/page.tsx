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
};

type HospitalSummary = {
  hospital_id: number;
  vecindarios_asignados: number;
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
  "#3D8B7D", // Viridian
  "#8FBC91", // Norway
  "#DBC557", // Tacha
  "#ECBDBF", // Beauty Bush
  "#F9DFE0", // We Peep
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
    return "—";
  }
  return value.toFixed(digits);
};

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            Experimenta con una cuadrícula m × m y descubre dónde ubicar K
            hospitales para cubrir vecindarios sintéticos.
          </p>
        </div>
        <div className="hero-badge">
          <span>Backend:</span>
          <code>{API_BASE_URL.replace(/^https?:\/\//, "")}</code>
        </div>
      </header>

      <main className="dashboard">
        <section className="card form-card">
          <h2>Parámetros de la simulación</h2>
          <p className="card-description">
            Ajusta los valores y presiona <strong>Simular</strong> para pedirle
            al backend una nueva corrida de K-means.
          </p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Tamaño de la cuadrícula (m)
              <input
                type="number"
                min={10}
                value={form.m}
                onChange={(event) =>
                  handleNumberChange("m", event.target.value)
                }
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
        </section>

        <section className="card results-card">
          <div className="results-header">
            <div>
              <h2>Resultados</h2>
              <p className="card-description">
                Visualiza cómo quedan los vecindarios agrupados, revisa métricas
                e interpreta la simulación.
              </p>
            </div>
            {loading && <span className="badge">Ejecutando K-means…</span>}
          </div>

          {result ? (
            <>
              <SimulationPlot result={result} />
              <MetricsPanel metrics={result.metrics} />
              <HospitalsTable resumen={resumen} hospitals={result.hospitals} />
            </>
          ) : (
            <div className="empty-state">
              <p>
                Ejecuta tu primera simulación para ver la cuadrícula y las
                métricas de distancia.
              </p>
            </div>
          )}
        </section>

        <section className="card explain-card">
          <h2>¿Cómo interpretar estos resultados?</h2>
          <p>
            K-means agrupa vecindarios por proximidad y cada grupo recibe un
            hospital. El término <em>cluster</em> alude al conjunto de puntos
            que comparten el mismo hospital más cercano. Las distancias
            promedio indican el esfuerzo logístico; un valor bajo significa que,
            en general, las familias llegan rápido a su hospital asignado.
          </p>
          <p>
            Usa el histograma de distancias y la distribución de vecindarios
            por hospital (en la tabla) para detectar saturaciones o zonas
            desatendidas. Si aumentas K verás cómo la inercia y la distancia
            promedio disminuyen, pero con un costo operativo mayor.
          </p>
        </section>
      </main>
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

function MetricsPanel({ metrics }: { metrics: Metrics }) {
  const items = [
    { label: "Distancia promedio", value: formatNumber(metrics.avg_distance) },
    { label: "Distancia máxima", value: formatNumber(metrics.max_distance) },
    { label: "Inercia", value: formatNumber(metrics.inertia, 0) },
    { label: "Iteraciones", value: metrics.iterations.toString() },
  ];

  return (
    <div className="metrics-grid">
      {items.map((metric) => (
        <article key={metric.label} className="metric-card">
          <p className="metric-label">{metric.label}</p>
          <p className="metric-value">{metric.value}</p>
        </article>
      ))}
    </div>
  );
}

function HospitalsTable({
  resumen,
  hospitals,
}: {
  resumen: HospitalSummary[];
  hospitals: Hospital[];
}) {
  if (hospitals.length === 0) {
    return null;
  }

  const rows = hospitals.map((hospital) => {
    const matching = resumen.find(
      (item) => item.hospital_id === hospital.id
    ) ?? { vecindarios_asignados: 0 };
    return {
      ...hospital,
      vecindarios_asignados: matching.vecindarios_asignados,
    };
  });

  return (
    <div className="table-wrapper">
      <h3>Hospitales sugeridos</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>X</th>
            <th>Y</th>
            <th>Vecindarios</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>H{row.id}</td>
              <td>{formatNumber(row.x)}</td>
              <td>{formatNumber(row.y)}</td>
              <td>{row.vecindarios_asignados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

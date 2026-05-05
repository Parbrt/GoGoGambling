import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface HistoryPoint {
  value_share_A: number;
  value_share_B: number;
  time_update: string;
}

interface ShareChartProps {
  history: HistoryPoint[];
  currentPriceA: number;
  currentPriceB: number;
  playerShares: {
    nb_share_A: number;
    avg_share_A_value: number;
    nb_share_B: number;
    avg_share_B_value: number;
  };
}

interface ChartPoint {
  price: number;
  label: string;
  timestamp: number;
}

interface TooltipData {
  point: ChartPoint;
  x: number;
  y: number;
}

const CHART_WIDTH = 780;
const CHART_HEIGHT = 300;
const PADDING = { top: 24, right: 64, bottom: 36, left: 16 };
const MAX_POINTS = 50;

const SHARE_COLORS = {
  A: "#3860BE",
  B: "#9A3A0A",
};

function buildRawPoints(history: HistoryPoint[], shareType: "A" | "B"): ChartPoint[] {
  if (history.length === 0) return [];
  const key = shareType === "A" ? "value_share_A" as const : "value_share_B" as const;
  const sorted = [...history].sort(
    (a, b) => new Date(a.time_update).getTime() - new Date(b.time_update).getTime()
  );
  return sorted.map(p => {
    const d = new Date(p.time_update);
    return {
      price: p[key],
      label: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      timestamp: d.getTime(),
    };
  });
}

function normalizePoints(raw: ChartPoint[]): ChartPoint[] {
  if (raw.length === 0) return [];
  if (raw.length >= MAX_POINTS) return raw.slice(-MAX_POINTS);
  const pad = MAX_POINTS - raw.length;
  const first = raw[0];
  const interval = raw.length > 1 ? (raw[1].timestamp - raw[0].timestamp) : 5000;
  const padded: ChartPoint[] = [];
  for (let i = pad - 1; i >= 0; i--) {
    padded.push({
      price: first.price,
      label: "",
      timestamp: first.timestamp - (i + 1) * interval,
    });
  }
  return [...padded, ...raw];
}

export function ShareChart({ history, currentPriceA, currentPriceB, playerShares }: ShareChartProps) {
  const [selectedShare, setSelectedShare] = useState<"A" | "B">("A");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const rawPoints = useMemo(
    () => buildRawPoints(history, selectedShare),
    [history, selectedShare]
  );

  const points = useMemo(() => normalizePoints(rawPoints), [rawPoints]);

  const currentPrice = selectedShare === "A" ? currentPriceA : currentPriceB;
  const avgBuyPrice = selectedShare === "A" ? playerShares.avg_share_A_value : playerShares.avg_share_B_value;
  const nbShares = selectedShare === "A" ? playerShares.nb_share_A : playerShares.nb_share_B;
  const profit = nbShares > 0 ? (currentPrice - avgBuyPrice) * nbShares : 0;
  const profitPercent = avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;
  const accent = SHARE_COLORS[selectedShare];

  // Scale (based on visible points only to avoid including padded zeros)
  const visiblePoints = useMemo(() => points.filter(p => p.label), [points]);

  const { yMin, yMax, yScale, xScale } = useMemo(() => {
    if (visiblePoints.length === 0) {
      return {
        yMin: 0, yMax: 100,
        yScale: () => CHART_HEIGHT / 2,
        xScale: () => PADDING.left,
      };
    }
    const allPx = visiblePoints.map(p => p.price);
    allPx.push(currentPrice);
    if (avgBuyPrice > 0 && nbShares > 0) allPx.push(avgBuyPrice);
    const min = Math.min(...allPx);
    const max = Math.max(...allPx);
    const pad = Math.max((max - min) * 0.12, 2);
    const plotW = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    return {
      yMin: min - pad,
      yMax: max + pad,
      yScale: (v: number) => {
        const ratio = (v - (min - pad)) / ((max + pad) - (min - pad));
        return PADDING.top + plotH * (1 - ratio);
      },
      xScale: (i: number) => {
        const ratio = points.length > 1 ? i / (points.length - 1) : 0.5;
        return PADDING.left + ratio * plotW;
      },
    };
  }, [visiblePoints, points.length, currentPrice, avgBuyPrice, nbShares]);

  // Grid
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    const range = yMax - yMin;
    if (range <= 0) return lines;
    const step = range <= 5 ? 1 : range <= 20 ? 5 : range <= 50 ? 10 : range <= 100 ? 20 : range <= 200 ? 50 : range <= 500 ? 100 : range <= 1000 ? 200 : 500;
    let v = Math.ceil(yMin / step) * step;
    while (v <= yMax) {
      lines.push(v);
      v += step;
    }
    return lines;
  }, [yMin, yMax]);

  // SVG paths
  const { areaPath, linePath } = useMemo(() => {
    if (points.length === 0) return { areaPath: "", linePath: "" };
    const plotW = CHART_WIDTH - PADDING.left - PADDING.right;

    const lp = points.map((p, i) => {
      const x = points.length > 1
        ? PADDING.left + (i / (points.length - 1)) * plotW
        : PADDING.left + plotW / 2;
      const y = yScale(p.price);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    const baseY = yScale(yMin);
    const firstX = PADDING.left;
    const lastX = PADDING.left + plotW;
    const ap = `${lp} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${firstX.toFixed(1)} ${baseY.toFixed(1)} Z`;

    return { areaPath: ap, linePath: lp };
  }, [points, yScale, yMin]);

  // Hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || points.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = CHART_WIDTH / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const plotW = CHART_WIDTH - PADDING.left - PADDING.right;

      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        if (!points[i].label) continue;
        const px = PADDING.left + (i / (points.length - 1)) * plotW;
        const d = Math.abs(mx - px);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }

      const threshold = plotW / (Math.max(1, visiblePoints.length - 1)) / 2 + 8;
      if (bestDist <= threshold && points[bestIdx].label) {
        const p = points[bestIdx];
        const px = PADDING.left + (bestIdx / (points.length - 1)) * plotW;
        const py = yScale(p.price);
        setTooltip(prev => prev?.point.timestamp !== p.timestamp ? { point: p, x: px, y: py } : prev);
      } else {
        setTooltip(null);
      }
    },
    [points, yScale, visiblePoints.length]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const formatBigPrice = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toFixed(0);
    if (Math.abs(v) >= 100) return v.toFixed(1);
    return v.toFixed(2);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Cours des Actions
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={selectedShare === "A" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedShare("A")}
              className={selectedShare === "A" ? "bg-[#3860BE] hover:bg-[#2A4FA8] border-[#3860BE]" : "border-[#D1CDC7] text-[#696969]"}
            >
              GoGoCoin
            </Button>
            <Button
              variant={selectedShare === "B" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedShare("B")}
              className={selectedShare === "B" ? "bg-[#9A3A0A] hover:bg-[#7E2E08] border-[#9A3A0A]" : "border-[#D1CDC7] text-[#696969]"}
            >
              GamblingCoin
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price summary */}
        <div className="flex justify-between items-center p-4 bg-muted rounded-2xl">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">
              {selectedShare === "A" ? "GoGoCoin" : "GamblingCoin"}
            </p>
            <p className={`text-3xl font-medium tracking-[-0.03em] tabular-nums ${
              nbShares > 0 && profit >= 0 ? "text-[#1B7F4B]" :
              nbShares > 0 && profit < 0 ? "text-[#CF4500]" : "text-[#141413]"
            }`}>
              {formatBigPrice(currentPrice)} pts
            </p>
          </div>
          {nbShares > 0 && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.08em] text-[#696969] font-medium">Votre position</p>
              <p className="text-lg font-medium tracking-[-0.02em]">{nbShares} actions</p>
              <div className={`flex items-center justify-end gap-1 ${profit >= 0 ? "text-[#1B7F4B]" : "text-[#CF4500]"}`}>
                {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium tabular-nums tracking-[-0.02em]">
                  {profit >= 0 ? "+" : ""}{formatBigPrice(profit)} pts ({profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs text-[#696969]">Moyen: {formatBigPrice(avgBuyPrice)} pts</p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="w-full bg-[#FCFBFA] rounded-2xl border border-[#D1CDC7] overflow-hidden">
          {visiblePoints.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-[#696969]">Chargement des donnees...</p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-auto"
              style={{ minHeight: 300 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.01} />
                </linearGradient>
              </defs>

              {/* Background */}
              <rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="#FCFBFA" />

              {/* Grid lines */}
              {gridLines.map(v => (
                <g key={v}>
                  <line
                    x1={PADDING.left} y1={yScale(v)}
                    x2={CHART_WIDTH - PADDING.right} y2={yScale(v)}
                    stroke="#D1CDC7" strokeWidth={0.5} strokeDasharray="2 4"
                  />
                  <text
                    x={CHART_WIDTH - PADDING.right + 6}
                    y={yScale(v) + 4}
                    fill="#696969"
                    fontSize={10}
                    textAnchor="start"
                    fontFamily="Sofia Sans, sans-serif"
                    fontWeight={450}
                  >
                    {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {(() => {
                const indices: number[] = [];
                const vis = points.filter(p => p.label);
                if (vis.length <= 6) {
                  for (let i = 0; i < points.length; i++) {
                    if (points[i].label) indices.push(i);
                  }
                } else {
                  const step = Math.max(1, Math.floor(points.length / 5));
                  for (let i = 0; i < points.length; i += step) {
                    if (points[i].label || indices.length === 0) indices.push(i);
                  }
                  const lastVisible = points.length - 1 - [...points].reverse().findIndex(p => p.label);
                  if (lastVisible >= 0 && !indices.includes(lastVisible)) indices.push(lastVisible);
                }
                return indices.map(i => (
                  <text
                    key={points[i].timestamp}
                    x={xScale(i)}
                    y={CHART_HEIGHT - 4}
                    fill="#696969"
                    fontSize={9}
                    textAnchor="middle"
                    fontFamily="Sofia Sans, sans-serif"
                    fontWeight={450}
                  >
                    {points[i].label}
                  </text>
                ));
              })()}

              {/* Area fill */}
              <path
                key={`area-${selectedShare}`}
                d={areaPath}
                fill="url(#areaGrad)"
                stroke="none"
              />

              {/* Line */}
              <path
                key={`line-${selectedShare}`}
                d={linePath}
                fill="none"
                stroke={accent}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Reference line — avg buy price */}
              {nbShares > 0 && avgBuyPrice > 0 && (
                <g>
                  <line
                    x1={PADDING.left} y1={yScale(avgBuyPrice)}
                    x2={CHART_WIDTH - PADDING.right} y2={yScale(avgBuyPrice)}
                    stroke={accent} strokeWidth={1} strokeDasharray="5 4" opacity={0.35}
                  />
                  <rect
                    x={CHART_WIDTH - PADDING.right + 2}
                    y={yScale(avgBuyPrice) - 7}
                    width={58}
                    height={14}
                    rx={7}
                    fill={accent}
                    opacity={0.12}
                  />
                  <text
                    x={CHART_WIDTH - PADDING.right + 31}
                    y={yScale(avgBuyPrice) + 4}
                    fill={accent}
                    fontSize={10}
                    fontWeight={600}
                    textAnchor="middle"
                    fontFamily="Sofia Sans, sans-serif"
                  >
                    {avgBuyPrice >= 1000 ? `${(avgBuyPrice / 1000).toFixed(1)}k` : avgBuyPrice.toFixed(0)}
                  </text>
                </g>
              )}

              {/* Crosshair + tooltip */}
              {tooltip && (
                <g>
                  <line
                    x1={tooltip.x} y1={PADDING.top - 4}
                    x2={tooltip.x} y2={CHART_HEIGHT - PADDING.bottom + 4}
                    stroke={accent} strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
                  />
                  <line
                    x1={PADDING.left - 4} y1={tooltip.y}
                    x2={CHART_WIDTH - PADDING.right + 4} y2={tooltip.y}
                    stroke={accent} strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
                  />
                  <circle cx={tooltip.x} cy={tooltip.y} r={4} fill={accent} stroke="#FCFBFA" strokeWidth={2} />

                  <rect
                    x={Math.min(Math.max(tooltip.x - 54, PADDING.left + 4), CHART_WIDTH - PADDING.right - 116)}
                    y={Math.max(tooltip.y - 56, PADDING.top)}
                    width={112}
                    height={44}
                    rx={10}
                    fill="#FFFFFF"
                    stroke="#D1CDC7"
                    strokeWidth={0.5}
                    style={{ filter: "drop-shadow(0px 4px 12px rgba(0,0,0,0.06))" }}
                  />
                  <text
                    x={Math.min(Math.max(tooltip.x, PADDING.left + 18), CHART_WIDTH - PADDING.right - 102)}
                    y={Math.max(tooltip.y - 34, PADDING.top + 14)}
                    fill="#696969"
                    fontSize={10}
                    fontWeight={450}
                    fontFamily="Sofia Sans, sans-serif"
                    textAnchor="middle"
                  >
                    {tooltip.point.label}
                  </text>
                  <text
                    x={Math.min(Math.max(tooltip.x, PADDING.left + 18), CHART_WIDTH - PADDING.right - 102)}
                    y={Math.max(tooltip.y - 14, PADDING.top + 34)}
                    fill={accent}
                    fontSize={14}
                    fontWeight={600}
                    fontFamily="Sofia Sans, sans-serif"
                    textAnchor="middle"
                  >
                    {formatBigPrice(tooltip.point.price)} pts
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-[#3860BE]" />
            <span className="text-xs text-[#696969]">GoGoCoin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full bg-[#9A3A0A]" />
            <span className="text-xs text-[#696969]">GamblingCoin</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

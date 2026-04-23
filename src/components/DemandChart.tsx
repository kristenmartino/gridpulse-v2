"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { DemandRow, ForecastPoint } from "@/lib/types";

interface DemandChartProps {
  data: DemandRow[];
  forecast?: ForecastPoint[];
  width?: number;
  height?: number;
}

const COLORS = {
  actual: "#3b82f6",
  actualFill: "#3b82f6",
  forecast: "#f97316",
  grid: "rgba(255,255,255,0.04)",
  axis: "#52525b",
  axisText: "#71717a",
  tooltipBg: "#18181b",
  tooltipBorder: "rgba(255,255,255,0.1)",
};

export default function DemandChart({
  data,
  forecast,
  width = 960,
  height = 380,
}: DemandChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 16, bottom: 36, left: 56 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parsed = data.map((d) => ({
      date: new Date(d.period),
      value: d.demand_mw,
    }));

    const parsedForecast = (forecast ?? []).map((f) => ({
      date: new Date(f.period),
      value: f.forecast_mw,
      ciLower: f.ci_lower,
      ciUpper: f.ci_upper,
    }));

    // Scales
    const allDates = [...parsed.map((d) => d.date), ...parsedForecast.map((d) => d.date)];
    const xExtent = d3.extent(allDates) as [Date, Date];
    const x = d3.scaleTime().domain(xExtent).range([0, w]);

    const allValues = [
      ...parsed.map((d) => d.value),
      ...parsedForecast.map((d) => d.value),
      ...parsedForecast.map((d) => d.ciUpper),
      ...parsedForecast.map((d) => d.ciLower),
    ];
    const yMax = d3.max(allValues) ?? 0;
    const yMin = d3.min(allValues) ?? 0;
    const yPad = (yMax - yMin) * 0.12;
    const y = d3.scaleLinear().domain([yMin - yPad, yMax + yPad]).range([h, 0]);

    const defs = svg.append("defs");

    // Grid
    g.append("g")
      .selectAll("line")
      .data(y.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", COLORS.grid);

    // Gradient
    const grad = defs
      .append("linearGradient")
      .attr("id", "gp-fill")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    grad.append("stop").attr("offset", "0%").attr("stop-color", COLORS.actualFill).attr("stop-opacity", 0.2);
    grad.append("stop").attr("offset", "100%").attr("stop-color", COLORS.actualFill).attr("stop-opacity", 0);

    // Area
    const area = d3
      .area<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y0(h)
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path").datum(parsed).attr("fill", "url(#gp-fill)").attr("d", area);

    // Line
    const line = d3
      .line<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(parsed)
      .attr("fill", "none")
      .attr("stroke", COLORS.actual)
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Forecast
    if (parsedForecast.length > 0) {
      const fStart = parsedForecast[0].date;

      // Divider
      g.append("line")
        .attr("x1", x(fStart))
        .attr("x2", x(fStart))
        .attr("y1", 0)
        .attr("y2", h)
        .attr("stroke", COLORS.forecast)
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "4,4")
        .attr("opacity", 0.5);

      // Label
      g.append("text")
        .attr("x", x(fStart) + 6)
        .attr("y", 12)
        .attr("fill", COLORS.forecast)
        .attr("font-size", "10px")
        .attr("font-weight", "500")
        .attr("opacity", 0.7)
        .text("forecast");

      // CI
      const ciArea = d3
        .area<{ date: Date; ciLower: number; ciUpper: number }>()
        .x((d) => x(d.date))
        .y0((d) => y(d.ciLower))
        .y1((d) => y(d.ciUpper))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(parsedForecast)
        .attr("fill", COLORS.forecast)
        .attr("fill-opacity", 0.08)
        .attr("d", ciArea);

      // Forecast line bridged from last actual
      const lastActual = parsed[parsed.length - 1];
      const bridged = [{ date: lastActual.date, value: lastActual.value }, ...parsedForecast];

      g.append("path")
        .datum(bridged)
        .attr("fill", "none")
        .attr("stroke", COLORS.forecast)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,3")
        .attr("d", line);
    }

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(d3.timeDay.every(1))
          .tickFormat((d) => d3.timeFormat("%b %d")(d as Date))
          .tickSize(0)
      )
      .call((s) => s.select(".domain").remove())
      .call((s) =>
        s
          .selectAll(".tick text")
          .attr("fill", COLORS.axisText)
          .attr("font-size", "10px")
          .attr("dy", "1em")
      );

    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => {
            const v = d as number;
            return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`;
          })
          .tickSize(0)
      )
      .call((s) => s.select(".domain").remove())
      .call((s) =>
        s
          .selectAll(".tick text")
          .attr("fill", COLORS.axisText)
          .attr("font-size", "10px")
          .attr("dx", "-0.5em")
      );

    // Tooltip
    const allPoints = [
      ...parsed.map((d) => ({ ...d, type: "actual" as const })),
      ...parsedForecast.map((d) => ({ date: d.date, value: d.value, type: "forecast" as const })),
    ];

    const tooltipLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", h)
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1)
      .style("display", "none");

    const tooltipDot = g
      .append("circle")
      .attr("r", 3.5)
      .attr("stroke", COLORS.tooltipBg)
      .attr("stroke-width", 2)
      .style("display", "none");

    // Foreign object tooltip for styled HTML
    const tooltipFo = g
      .append("foreignObject")
      .attr("width", 140)
      .attr("height", 52)
      .style("display", "none")
      .style("pointer-events", "none");

    const tooltipDiv = tooltipFo
      .append("xhtml:div")
      .style("background", COLORS.tooltipBg)
      .style("border", `1px solid ${COLORS.tooltipBorder}`)
      .style("border-radius", "6px")
      .style("padding", "6px 8px")
      .style("font-family", "var(--font-geist-sans), system-ui")
      .style("white-space", "nowrap");

    const bisect = d3.bisector<(typeof allPoints)[0], Date>((d) => d.date).left;

    svg
      .append("rect")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("width", w)
      .attr("height", h)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const i = bisect(allPoints, date, 1);
        const d0 = allPoints[i - 1];
        const d1 = allPoints[i];
        if (!d0 || !d1) return;
        const d = date.getTime() - d0.date.getTime() > d1.date.getTime() - date.getTime() ? d1 : d0;
        const color = d.type === "forecast" ? COLORS.forecast : COLORS.actual;

        tooltipLine.style("display", null).attr("x1", x(d.date)).attr("x2", x(d.date));
        tooltipDot
          .style("display", null)
          .attr("cx", x(d.date))
          .attr("cy", y(d.value))
          .attr("fill", color);

        // Position tooltip
        const tx = Math.min(x(d.date) + 12, w - 150);
        const ty = Math.max(y(d.value) - 56, 0);
        tooltipFo.style("display", null).attr("x", tx).attr("y", ty);
        tooltipDiv.html(
          `<div style="font-size:10px;color:#71717a;margin-bottom:2px">${d3.timeFormat("%b %d, %H:%M")(d.date)}${d.type === "forecast" ? " (fcst)" : ""}</div>` +
          `<div style="font-size:13px;font-weight:600;color:${color};font-variant-numeric:tabular-nums">${d3.format(",.0f")(d.value)} MW</div>`
        );
      })
      .on("mouseleave", () => {
        tooltipLine.style("display", "none");
        tooltipDot.style("display", "none");
        tooltipFo.style("display", "none");
      });
  }, [data, forecast, width, height]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-auto"
      style={{ maxHeight: height }}
    />
  );
}

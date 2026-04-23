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

export default function DemandChart({ data, forecast, width = 960, height = 400 }: DemandChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 24, right: 24, bottom: 48, left: 72 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse demand data
    const parsed = data.map((d) => ({
      date: new Date(d.period),
      value: d.demand_mw,
    }));

    // Parse forecast data
    const parsedForecast = (forecast ?? []).map((f) => ({
      date: new Date(f.period),
      value: f.forecast_mw,
      ciLower: f.ci_lower,
      ciUpper: f.ci_upper,
    }));

    // Combined domain for x-axis
    const allDates = [...parsed.map((d) => d.date), ...parsedForecast.map((d) => d.date)];
    const xExtent = d3.extent(allDates) as [Date, Date];
    const x = d3.scaleTime().domain(xExtent).range([0, w]);

    // Combined domain for y-axis
    const allValues = [
      ...parsed.map((d) => d.value),
      ...parsedForecast.map((d) => d.value),
      ...parsedForecast.map((d) => d.ciUpper),
      ...parsedForecast.map((d) => d.ciLower),
    ];
    const yMax = d3.max(allValues) ?? 0;
    const yMin = d3.min(allValues) ?? 0;
    const yPadding = (yMax - yMin) * 0.1;
    const y = d3
      .scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([h, 0]);

    const defs = svg.append("defs");

    // Grid lines
    g.append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(y.ticks(6))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "#1a1a2e")
      .attr("stroke-width", 0.5);

    // Demand area gradient
    const gradientId = "demand-gradient";
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.3);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.02);

    // Demand area
    const area = d3
      .area<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y0(h)
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(parsed)
      .attr("fill", `url(#${gradientId})`)
      .attr("d", area);

    // Demand line
    const line = d3
      .line<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(parsed)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Forecast — confidence interval band
    if (parsedForecast.length > 0) {
      // Divider line at forecast boundary
      const forecastStart = parsedForecast[0].date;
      g.append("line")
        .attr("x1", x(forecastStart))
        .attr("x2", x(forecastStart))
        .attr("y1", 0)
        .attr("y2", h)
        .attr("stroke", "#f97316")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.6);

      // "Forecast" label
      g.append("text")
        .attr("x", x(forecastStart) + 8)
        .attr("y", 14)
        .attr("fill", "#f97316")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .text("Forecast →");

      // CI band
      const ciArea = d3
        .area<{ date: Date; ciLower: number; ciUpper: number }>()
        .x((d) => x(d.date))
        .y0((d) => y(d.ciLower))
        .y1((d) => y(d.ciUpper))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(parsedForecast)
        .attr("fill", "#f97316")
        .attr("fill-opacity", 0.1)
        .attr("d", ciArea);

      // Forecast line
      const forecastLine = d3
        .line<{ date: Date; value: number }>()
        .x((d) => x(d.date))
        .y((d) => y(d.value))
        .curve(d3.curveMonotoneX);

      // Connect actual to forecast with a bridge point
      const lastActual = parsed[parsed.length - 1];
      const bridgedForecast = [
        { date: lastActual.date, value: lastActual.value },
        ...parsedForecast,
      ];

      g.append("path")
        .datum(bridgedForecast)
        .attr("fill", "none")
        .attr("stroke", "#f97316")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,3")
        .attr("d", forecastLine);
    }

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(d3.timeDay.every(1))
          .tickFormat((d) => d3.timeFormat("%b %d")(d as Date))
      )
      .call((sel) => sel.select(".domain").attr("stroke", "#333"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#333"))
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#999").attr("font-size", "11px"));

    // Y axis
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickFormat((d) => d3.format(",.0f")(d as number) + " MW")
      )
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll(".tick line").remove())
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#999").attr("font-size", "11px"));

    // Tooltip — works for both actual and forecast
    const allPoints = [
      ...parsed.map((d) => ({ ...d, type: "actual" as const })),
      ...parsedForecast.map((d) => ({ date: d.date, value: d.value, type: "forecast" as const })),
    ];

    const tooltip = g.append("g").attr("class", "tooltip-group").style("display", "none");

    tooltip
      .append("line")
      .attr("class", "tooltip-line")
      .attr("y1", 0)
      .attr("y2", h)
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");

    tooltip
      .append("circle")
      .attr("class", "tooltip-dot")
      .attr("r", 4)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    const tooltipText = tooltip
      .append("text")
      .attr("class", "tooltip-text")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("text-anchor", "middle");

    const tooltipValue = tooltip
      .append("text")
      .attr("class", "tooltip-value")
      .attr("font-size", "13px")
      .attr("font-weight", "600")
      .attr("text-anchor", "middle");

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

        const color = d.type === "forecast" ? "#f97316" : "#3b82f6";

        tooltip.style("display", null);
        tooltip.select(".tooltip-line").attr("x1", x(d.date)).attr("x2", x(d.date));
        tooltip.select(".tooltip-dot").attr("cx", x(d.date)).attr("cy", y(d.value)).attr("fill", color);
        tooltipText
          .attr("x", x(d.date))
          .attr("y", -8)
          .text(d3.timeFormat("%b %d, %H:%M")(d.date));
        tooltipValue
          .attr("x", x(d.date))
          .attr("y", y(d.value) - 12)
          .attr("fill", color)
          .text(
            d3.format(",.0f")(d.value) + " MW" + (d.type === "forecast" ? " (forecast)" : "")
          );
      })
      .on("mouseleave", () => {
        tooltip.style("display", "none");
      });

    // Legend
    const legend = g.append("g").attr("transform", `translate(${w - 220}, ${h - 40})`);
    // Actual
    legend.append("line").attr("x1", 0).attr("x2", 20).attr("y1", 0).attr("y2", 0).attr("stroke", "#3b82f6").attr("stroke-width", 2);
    legend.append("text").attr("x", 26).attr("y", 4).attr("fill", "#999").attr("font-size", "11px").text("Actual Demand");
    // Forecast
    if (parsedForecast.length > 0) {
      legend.append("line").attr("x1", 0).attr("x2", 20).attr("y1", 18).attr("y2", 18).attr("stroke", "#f97316").attr("stroke-width", 2).attr("stroke-dasharray", "6,3");
      legend.append("text").attr("x", 26).attr("y", 22).attr("fill", "#999").attr("font-size", "11px").text("XGBoost Forecast (24h)");
    }
  }, [data, forecast, width, height]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-auto"
      style={{ maxHeight: height }}
    />
  );
}

"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { DemandRow } from "@/lib/types";

interface DemandChartProps {
  data: DemandRow[];
  width?: number;
  height?: number;
}

export default function DemandChart({ data, width = 960, height = 400 }: DemandChartProps) {
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

    // Parse dates and values
    const parsed = data.map((d) => ({
      date: new Date(d.period),
      value: d.demand_mw,
    }));

    // Scales
    const xExtent = d3.extent(parsed, (d) => d.date) as [Date, Date];
    const x = d3.scaleTime().domain(xExtent).range([0, w]);

    const yMax = d3.max(parsed, (d) => d.value) ?? 0;
    const yMin = d3.min(parsed, (d) => d.value) ?? 0;
    const yPadding = (yMax - yMin) * 0.1;
    const y = d3
      .scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([h, 0]);

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

    // Area fill
    const area = d3
      .area<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y0(h)
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    // Gradient
    const gradientId = "demand-gradient";
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.3);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.02);

    g.append("path")
      .datum(parsed)
      .attr("fill", `url(#${gradientId})`)
      .attr("d", area);

    // Line
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

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(d3.timeDay.every(1))
          .tickFormat((d) => d3.timeFormat("%b %d")(d as Date))
      )
      .call((g) => g.select(".domain").attr("stroke", "#333"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#333"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#999").attr("font-size", "11px"));

    // Y axis
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickFormat((d) => d3.format(",.0f")(d as number) + " MW")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#999").attr("font-size", "11px"));

    // Tooltip
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
      .attr("fill", "#3b82f6")
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
      .attr("fill", "#3b82f6")
      .attr("font-size", "13px")
      .attr("font-weight", "600")
      .attr("text-anchor", "middle");

    // Bisector for tooltip
    const bisect = d3.bisector<{ date: Date; value: number }, Date>((d) => d.date).left;

    svg
      .append("rect")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("width", w)
      .attr("height", h)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const i = bisect(parsed, date, 1);
        const d0 = parsed[i - 1];
        const d1 = parsed[i];
        if (!d0 || !d1) return;
        const d = date.getTime() - d0.date.getTime() > d1.date.getTime() - date.getTime() ? d1 : d0;

        tooltip.style("display", null);
        tooltip.select(".tooltip-line").attr("x1", x(d.date)).attr("x2", x(d.date));
        tooltip.select(".tooltip-dot").attr("cx", x(d.date)).attr("cy", y(d.value));
        tooltipText
          .attr("x", x(d.date))
          .attr("y", -8)
          .text(d3.timeFormat("%b %d, %H:%M")(d.date));
        tooltipValue
          .attr("x", x(d.date))
          .attr("y", y(d.value) - 12)
          .text(d3.format(",.0f")(d.value) + " MW");
      })
      .on("mouseleave", () => {
        tooltip.style("display", "none");
      });
  }, [data, width, height]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-auto"
      style={{ maxHeight: height }}
    />
  );
}

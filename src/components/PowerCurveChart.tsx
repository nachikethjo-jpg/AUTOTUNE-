import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Eye, TrendingUp, Info } from 'lucide-react';

interface PowerCurveChartProps {
  stockHp: number;
  stockTorque: number;
  tunedHp: number;
  tunedTorque: number;
  vehicleName: string;
}

interface DataPoint {
  rpm: number;
  stockHp: number;
  tunedHp: number;
  stockTorque: number;
  tunedTorque: number;
}

export const PowerCurveChart: React.FC<PowerCurveChartProps> = ({
  stockHp,
  stockTorque,
  tunedHp,
  tunedTorque,
  vehicleName
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverData, setHoverData] = useState<DataPoint | null>(null);

  // Define the RPM steps from 1000 to 7000
  const rpmSteps = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

  // Curve profile factors (simulating real engine dyno shape characteristics)
  // Torque starts moderate, peaks in midrange (3500-4500), then drops.
  const torqueFactors = {
    1000: 0.60,
    1500: 0.72,
    2000: 0.85,
    2500: 0.94,
    3000: 0.98,
    3500: 1.00, // Peak Torque
    4000: 0.99,
    4500: 0.95,
    5000: 0.88,
    5550: 0.80,
    6000: 0.70,
    6500: 0.58,
    7000: 0.45
  };

  const getTorqueFactor = (rpm: number): number => {
    const keys = Object.keys(torqueFactors).map(Number);
    const closest = keys.reduce((prev, curr) => Math.abs(curr - rpm) < Math.abs(prev - rpm) ? curr : prev);
    return torqueFactors[closest as keyof typeof torqueFactors] || 0.8;
  };

  // Generate curves matching stock & tuned parameters
  const generateData = (): DataPoint[] => {
    return rpmSteps.map(rpm => {
      const tf = getTorqueFactor(rpm);
      
      // HP is mathematically: (Torque * RPM) / 5252
      // We simulate HP based on normal scaling factors and the dyno peak
      // Rises with RPM, peaks around 5500-6000, then rolls off.
      const hpFactor = rpm < 5500 
        ? Math.sin((rpm / 5500) * (Math.PI / 2)) * 0.95 
        : 0.95 - Math.pow((rpm - 5500) / 2000, 2) * 0.45;

      const sTorque = Math.round(stockTorque * tf);
      const tTorque = Math.round(tunedTorque * tf);
      
      const sHp = Math.round(stockHp * hpFactor);
      const tHp = Math.round(tunedHp * hpFactor);

      return {
        rpm,
        stockHp: sHp,
        tunedHp: tHp,
        stockTorque: sTorque,
        tunedTorque: tTorque
      };
    });
  };

  const data = generateData();

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous drawing
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 30, right: 55, bottom: 40, left: 55 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = 260 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scale X - Engine RPM
    const xScale = d3.scaleLinear()
      .domain([1000, 7000])
      .range([0, width]);

    // Scale Y1 - Horsepower
    const y1Scale = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.stockHp, d.tunedHp))! * 1.15])
      .range([height, 0]);

    // Scale Y2 - Torque
    const y2Scale = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.stockTorque, d.tunedTorque))! * 1.15])
      .range([height, 0]);

    // Gridlines
    const y1Grid = d3.axisLeft(y1Scale)
      .tickSize(-width)
      .tickFormat(() => '');

    svg.append('g')
      .attr('class', 'grid-lines opacity-10')
      .style('stroke', '#4b5563')
      .style('stroke-dasharray', '2,2')
      .call(y1Grid);

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d => `${d} rpm`);

    const y1Axis = d3.axisLeft(y1Scale).ticks(5);
    const y2Axis = d3.axisRight(y2Scale).ticks(5);

    // Render X Axis
    svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .attr('class', 'text-[9px] text-zinc-500 font-mono')
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#8a8a8a')
      .attr('font-weight', 'bold');

    svg.select('.domain').attr('stroke', '#27272a');
    svg.selectAll('.tick line').attr('stroke', '#27272a');

    // Render Y1 Axis (HP)
    svg.append('g')
      .attr('class', 'text-[9px] text-zinc-500 font-mono')
      .call(y1Axis)
      .selectAll('text')
      .attr('fill', '#10b981') // Green for HP
      .attr('font-weight', 'bold');

    // Y1 Axis label
    svg.append('text')
      .attr('x', -height / 2)
      .attr('y', -38)
      .attr('transform', 'rotate(-90)')
      .attr('fill', '#10b981')
      .attr('text-anchor', 'middle')
      .attr('class', 'text-[8px] font-black uppercase tracking-wider font-mono')
      .text('Horsepower (HP)');

    // Render Y2 Axis (Torque)
    svg.append('g')
      .attr('transform', `translate(${width}, 0)`)
      .attr('class', 'text-[9px] text-zinc-500 font-mono')
      .call(y2Axis)
      .selectAll('text')
      .attr('fill', '#ef4444') // Red for Torque
      .attr('font-weight', 'bold');

    // Y2 Axis label
    svg.append('text')
      .attr('x', height / 2)
      .attr('y', -width - 38)
      .attr('transform', 'rotate(90)')
      .attr('fill', '#ef4444')
      .attr('text-anchor', 'middle')
      .attr('class', 'text-[8px] font-black uppercase tracking-wider font-mono')
      .text('Torque (Nm)');

    // Generator for line paths
    const lineStockHp = d3.line<DataPoint>()
      .x(d => xScale(d.rpm))
      .y(d => y1Scale(d.stockHp))
      .curve(d3.curveMonotoneX);

    const lineTunedHp = d3.line<DataPoint>()
      .x(d => xScale(d.rpm))
      .y(d => y1Scale(d.tunedHp))
      .curve(d3.curveMonotoneX);

    const lineStockTorque = d3.line<DataPoint>()
      .x(d => xScale(d.rpm))
      .y(d => y2Scale(d.stockTorque))
      .curve(d3.curveMonotoneX);

    const lineTunedTorque = d3.line<DataPoint>()
      .x(d => xScale(d.rpm))
      .y(d => y2Scale(d.tunedTorque))
      .curve(d3.curveMonotoneX);

    // Plotting pathways:
    // 1. Stock HP (Dashed green)
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#059669')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.5)
      .attr('d', lineStockHp);

    // 2. Tuned HP (Solid Bright Green)
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.5)
      .attr('d', lineTunedHp);

    // 3. Stock Torque (Dashed Red)
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#b91c1c')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.5)
      .attr('d', lineStockTorque);

    // 4. Tuned Torque (Solid Bright Red)
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2.5)
      .attr('d', lineTunedTorque);

    // Hover focus tooltip vertical line tracker
    const focusLine = svg.append('line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#71717a')
      .attr('stroke-width', 1)
      .style('stroke-dasharray', '2,2')
      .style('display', 'none');

    // Interactive Points circles highlight
    const focusStockHpCircle = svg.append('circle').attr('r', 3.5).attr('fill', '#059669').style('display', 'none');
    const focusTunedHpCircle = svg.append('circle').attr('r', 4.5).attr('fill', '#10b981').attr('stroke', '#18181b').attr('stroke-width', 1).style('display', 'none');
    const focusStockTrqCircle = svg.append('circle').attr('r', 3.5).attr('fill', '#b91c1c').style('display', 'none');
    const focusTunedTrqCircle = svg.append('circle').attr('r', 4.5).attr('fill', '#ef4444').attr('stroke', '#18181b').attr('stroke-width', 1).style('display', 'none');

    // Translucent overlay capture rect
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const mouseX = d3.pointer(event)[0];
        const rpmValue = xScale.invert(mouseX);
        
        // Find closest point
        const bisection = d3.bisector((d: DataPoint) => d.rpm).left;
        const index = bisection(data, rpmValue, 1);
        const prev = data[index - 1];
        const next = data[index];
        let d = prev;
        if (next && (rpmValue - prev.rpm > next.rpm - rpmValue)) {
          d = next;
        }

        if (d) {
          const cx = xScale(d.rpm);
          focusLine.attr('x1', cx).attr('x2', cx).style('display', null);

          focusStockHpCircle.attr('cx', cx).attr('cy', y1Scale(d.stockHp)).style('display', null);
          focusTunedHpCircle.attr('cx', cx).attr('cy', y1Scale(d.tunedHp)).style('display', null);
          focusStockTrqCircle.attr('cx', cx).attr('cy', y2Scale(d.stockTorque)).style('display', null);
          focusTunedTrqCircle.attr('cx', cx).attr('cy', y2Scale(d.tunedTorque)).style('display', null);

          setHoverData(d);
        }
      })
      .on('mouseleave', () => {
        focusLine.style('display', 'none');
        focusStockHpCircle.style('display', 'none');
        focusTunedHpCircle.style('display', 'none');
        focusStockTrqCircle.style('display', 'none');
        focusTunedTrqCircle.style('display', 'none');
        setHoverData(null);
      });

    // Cleanup resize updates
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth - margin.left - margin.right;
      d3.select(svgRef.current).attr('width', newWidth + margin.left + margin.right);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [stockHp, stockTorque, tunedHp, tunedTorque, vehicleName]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 font-mono space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
          <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-100">
            D3 Dynamic ECU Power Curves (Dyno Plot)
          </h4>
        </div>
        <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold px-1.5 py-0.5 uppercase tracking-widest">
          Active Tuning Analysis
        </span>
      </div>

      <div className="text-[10px] text-zinc-400 font-sans leading-relaxed flex items-start gap-1.5 bg-zinc-950/50 p-2 border border-zinc-850/40">
        <Info className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
        <p>
          Hover the interactive dyno chart below to trace exact metrics across the RPM range. Solid lines represent tuned map outputs, while dashed lines delineate stock vehicle factory bounds.
        </p>
      </div>

      <div ref={containerRef} className="w-full relative overflow-x-hidden pt-1">
        <svg ref={svgRef} className="mx-auto block" />
      </div>

      {/* Grid Live Status Information Block / Interactive Tooltip values */}
      <div className="bg-zinc-950 p-3 border border-zinc-900 grid grid-cols-2 gap-4 text-center">
        
        {/* Horsepower Indicator */}
        <div className="space-y-1 bg-zinc-900/50 p-2 border border-zinc-850">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">Horsepower comparison</span>
          {hoverData ? (
            <div className="space-y-0.5">
              <p className="text-sm font-black italic text-emerald-500">
                {hoverData.tunedHp} <span className="text-[9px] uppercase not-italic">HP @ {hoverData.rpm}</span>
              </p>
              <p className="text-[9px] text-zinc-500 font-bold">
                STOCK: {hoverData.stockHp} HP (Offset: <span className="text-emerald-500">+{hoverData.tunedHp - hoverData.stockHp} HP</span>)
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-sm font-black italic text-emerald-500">
                {tunedHp} <span className="text-[9px] uppercase not-italic">Peak HP</span>
              </p>
              <p className="text-[9px] text-zinc-505 font-bold">
                STOCK: {stockHp} HP (<span className="text-emerald-500">+{tunedHp - stockHp} HP peak gain</span>)
              </p>
            </div>
          )}
        </div>

        {/* Torque Indicator */}
        <div className="space-y-1 bg-zinc-900/50 p-2 border border-zinc-850">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">Torque Comparison</span>
          {hoverData ? (
            <div className="space-y-0.5">
              <p className="text-sm font-black italic text-rose-500">
                {hoverData.tunedTorque} <span className="text-[9px] uppercase not-italic">Nm @ {hoverData.rpm}</span>
              </p>
              <p className="text-[9px] text-zinc-500 font-bold">
                STOCK: {hoverData.stockTorque} Nm (Offset: <span className="text-rose-500">+{hoverData.tunedTorque - hoverData.stockTorque} Nm</span>)
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-sm font-black italic text-rose-500">
                {tunedTorque} <span className="text-[9px] uppercase not-italic">Peak Torque</span>
              </p>
              <p className="text-[9px] text-zinc-505 font-bold">
                STOCK: {stockTorque} Nm (<span className="text-rose-500">+{tunedTorque - stockTorque} Nm peak gain</span>)
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Mini Color Legend dots */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[9px] text-zinc-400 font-bold uppercase pt-1 border-t border-zinc-900">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-emerald-500 block" />
          <span>Tuned HP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 border-t border-dashed border-emerald-500 block opacity-50" />
          <span>Stock HP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-rose-500 block" />
          <span>Tuned Torque</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 border-t border-dashed border-rose-500 block opacity-50" />
          <span>Stock Torque</span>
        </div>
      </div>
    </div>
  );
};

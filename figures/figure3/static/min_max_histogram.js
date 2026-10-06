import { roundTo } from "./util.js";

async function histogram(svg, config) {
  // Constants
  const width =
    config["width"] - config["margin"].left - config["margin"].right;
  const height =
    config["height"] - config["margin"].top - config["margin"].bottom;

  const SCATTER_HEIGHT = 150;
  const SCATTER_WIDTH = width - 200;
  const BAR_PADDING = 2;
  const binWidth = config["histConfig"].binWidth;
  const domainStart = config["histConfig"].domainStart;
  const domainEnd = config["histConfig"].domainEnd;

  // Get input recomb data
  const data = await d3.csv(config["filename"]);

  const x = d3
    .scaleLinear()
    .domain([domainStart, domainEnd])
    .range([0, SCATTER_WIDTH]);

  const thresholds = d3
    .range(domainStart + binWidth, domainEnd + binWidth, binWidth)
    .map((val) => roundTo(val, 2));

  let histogram = d3
    .bin()
    .value((d) => parseFloat(d[config["Score"]]))
    .domain([domainStart, domainEnd])
    .thresholds(thresholds);

  let bins = histogram(data);
  const [minCount, maxCount] = d3.extent(bins.map((d) => d.length));

  // y-axis max value buffer
  const OCC_BUFFER = 10;
  const y = d3
    .scaleLinear()
    .domain([0, maxCount + OCC_BUFFER])
    .range([height, SCATTER_HEIGHT]);

  const xAxis = d3.axisBottom(x).ticks(20).tickSizeOuter(0);
  const yAxis = d3.axisLeft(y).tickSizeOuter(0);

  // main histogram
  svg
    .selectAll(".bar")
    .data(bins)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => {
      return x(d.x0);
    })
    .attr("y", (d) => {
      return y(d.length);
    })
    .attr("width", (d) => {
      return Math.max(0, x(d.x1) - x(d.x0) - BAR_PADDING);
    })
    .attr("height", (d) => {
      return height - y(d.length);
    })
    .style("fill", (d) => {
      const midpoint = (d.x0 + d.x1) / 2;
      if (midpoint < 0) {
        return "#D55E00";
      } else if (midpoint > 1) {
        return "#009E73";
      } else {
        return "#E0E0E0";
      }
    })
    .attr("stroke-width", 0.5)
    .attr("stroke", "black");

  // x-axis
  svg
    .append("g")
    .attr("class", "bottomAxis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .style("font-size", config["axisTickLabelSize"])
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)");

  // y-axis
  svg
    .append("g")
    .attr("class", "y0 axis")
    .call(yAxis)
    .style("font-size", config["axisTickLabelSize"])
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -300)
    .attr("y", -80)
    .attr("dominant-baseline", "central")
    .style("fill", "black")
    .style("font-size", "20px");

  // Vertical lines at x = 0 and x = 1
  svg
    .append("line")
    .attr("x1", x(1.0))
    .attr("y1", SCATTER_HEIGHT - 50)
    .attr("x2", x(1.0))
    .attr("y2", height)
    .style("stroke", "black")
    .style("stroke-dasharray", "10, 5")
    .style("stroke-width", "3px");

  svg
    .append("line")
    .attr("x1", x(0))
    .attr("y1", SCATTER_HEIGHT - 50)
    .attr("x2", x(0))
    .attr("y2", height)
    .style("stroke", "black")
    .style("stroke-dasharray", "10, 5")
    .style("stroke-width", "3px");

  // Minimap showing full distribution of fitness from -10 to 10

  // Dimensions
  const minimapWidth = 350;
  const minimapHeight = 180;
  const minimapX = 50;
  const minimapY = SCATTER_HEIGHT + 40;

  const minimapSvg = svg
    .append("g")
    .attr("transform", `translate(${minimapX}, ${minimapY})`);

  minimapSvg
    .append("rect")
    .attr("x", -10)
    .attr("y", -40)
    .attr("width", minimapWidth + 30)
    .attr("height", minimapHeight + 80)
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("stroke-width", "1.5px");

  const xMinimap = d3.scaleLinear().domain([-10, 10]).range([0, minimapWidth]);
  const minimapBinWidth = 0.5;
  const minimapThresholds = d3
    .range(-10 + minimapBinWidth, 10 + minimapBinWidth, minimapBinWidth)
    .map((val) => roundTo(val, 2));

  const histMinimap = d3
    .bin()
    .value((d) => parseFloat(d[config["Score"]]))
    .domain([-10, 10])
    .thresholds(minimapThresholds);

  const binsMinimap = histMinimap(data);
  const maxCountMinimap = d3.max(binsMinimap, (d) => d.length);

  const yMinimap = d3
    .scaleLinear()
    .domain([0, maxCountMinimap])
    .range([minimapHeight, 0]);
  const xAxisMinimap = d3.axisBottom(xMinimap).ticks(10).tickSizeOuter(0);

  minimapSvg
    .selectAll(".barMinimap")
    .data(binsMinimap)
    .join("rect")
    .attr("class", "barMinimap")
    .attr("x", (d) => xMinimap(d.x0))
    .attr("y", (d) => yMinimap(d.length))
    .attr("width", (d) => Math.max(0, xMinimap(d.x1) - xMinimap(d.x0) - 1))
    .attr("height", (d) => minimapHeight - yMinimap(d.length))
    .style("fill", (d) => {
      const midpoint = (d.x0 + d.x1) / 2;
      if (midpoint < 0) return "#D55E00";
      if (midpoint > 1) return "#009E73";
      return "#E0E0E0";
    })
    .attr("stroke-width", 0.5)
    .attr("stroke", "black");

  // Draw dashed vertical lines on minimap at 0 and 1
  [0, 1].forEach((val) => {
    minimapSvg
      .append("line")
      .attr("x1", xMinimap(val))
      .attr("y1", 0)
      .attr("x2", xMinimap(val))
      .attr("y2", minimapHeight)
      .style("stroke", "black")
      .style("stroke-dasharray", "4, 3")
      .style("stroke-width", "1.5px");
  });

  // Minimap x-axis
  minimapSvg
    .append("g")
    .attr("transform", `translate(0, ${minimapHeight})`)
    .call(xAxisMinimap)
    .style("font-size", "12px");

  // Minimap Title
  minimapSvg
    .append("text")
    .attr("x", minimapWidth / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Full Distribution (-10 to 10)");
}

export { histogram };

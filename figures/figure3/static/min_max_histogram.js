import { roundTo } from "../../common/util.js";

async function histogram(svg, config) {
  // Constants
  const width =
      config["width"] - config["margin"].left - config["margin"].right,
    height = config["height"] - config["margin"].top - config["margin"].bottom;

  const SCATTER_HEIGHT = 150;
  const SCATTER_WIDTH = width - 200;
  const SCATTER_RADIUS = 5.0;
  const SHIFT_POINTS_RIGHT = width / 2;
  const BAR_PADDING = 2;
  const binWidth = config["histConfig"].binWidth;
  const domainStart = config["histConfig"].domainStart;
  const domainEnd = config["histConfig"].domainEnd;

  // Get input recomb data and statistics data
  const statsData = await d3.csv(config["statsFilename"]);
  const data = await d3.csv(config["filename"]);

  // Format monthly statistics values
  let statLookup = {};
  statsData.forEach((d) => {
    const key = d.Month;
    if (key in statLookup) {
      alert("Month already recorded in stats");
    }
    statLookup[key] = {
      Percentile50: parseFloat(d.Percentile50),
      Percentile75: parseFloat(d.Percentile75),
      Percentile99: parseFloat(d.Percentile99),
    };
  });

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
    .style("fill", "#87CEFA")
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
    .style("stroke-width", "2px");

  svg
    .append("line")
    .attr("x1", x(0))
    .attr("y1", SCATTER_HEIGHT - 50)
    .attr("x2", x(0))
    .attr("y2", height)
    .style("stroke", "black")
    .style("stroke-dasharray", "10, 5")
    .style("stroke-width", "2px");
}
export { histogram };

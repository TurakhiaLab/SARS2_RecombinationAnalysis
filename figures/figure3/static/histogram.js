import {
  getMonthsCollection,
  minMaxValueFromColumn,
  roundTo,
} from "../../common/util.js";

function aggregate_scores(data) {
  let snv_fitness_scores = [];
  data.forEach((d) => {
    const score = parseFloat(d["PyRoScore"]);
    const occ = parseInt(d["Occurrence"]);
    for (let i = 0; i < occ; ++i) {
      snv_fitness_scores.push(score);
    }
  });
  return snv_fitness_scores;
}

async function histogram(svg, config) {
  // Plot Constants
  const margin = config["margin"];
  const width = config["width"] - margin.left - margin.right,
    height = config["height"] - margin.top - margin.bottom;

  const SCATTER_HEIGHT = 250;
  const SCATTER_WIDTH = width - 200;
  const SCATTER_RADIUS = 5.0;
  const SHIFT_POINTS_RIGHT = width / 2;
  const BAR_PADDING = 2;
  const X_TICK_NUM = 40;
  const OCC_BUFFER = 200000;

  const YEAR_MONTH = getMonthsCollection("2023-02");
  // Remove "2020-01" from time interval,
  // only considering 2020-02 to 2023-02
  YEAR_MONTH.shift();

  // Get input recomb data and statistics data
  const data = await d3.csv(config["filename"]);

  const [minScore, maxScore] = minMaxValueFromColumn(
    data,
    config["Score"],
    parseFloat,
  );
  const snv_scores = aggregate_scores(data);
  const MAX_SCORE = d3.max(snv_scores);

  // Histogram bins constants
  const binWidth = 0.05;
  const domainStart = 0.0;
  const domainEnd = 1.8;
  const thresholds = d3
    .range(domainStart + binWidth, domainEnd + binWidth, binWidth)
    .map((val) => roundTo(val, 2));

  let histogram = d3
    .bin()
    .domain([domainStart, domainEnd])
    .thresholds(thresholds);

  let bins = histogram(snv_scores);
  const maxBinCount = d3.max(bins, (bin) => bin.length);

  // Define axes
  const y = d3
    .scaleLinear()
    .domain([0, maxBinCount + OCC_BUFFER])
    .range([SCATTER_HEIGHT, 0]);

  // Remove outer tick mark on axis
  const yAxis = d3.axisLeft(y).ticks(7).tickSizeOuter(0);

  const x = d3
    .scaleLinear()
    .domain([domainStart, domainEnd])
    .range([0, SCATTER_WIDTH]);
  const xAxis = d3.axisBottom(x).ticks(X_TICK_NUM).tickSizeOuter(0);

  svg
    .append("g")
    .selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - BAR_PADDING))
    .attr("height", (d) => y(0) - y(d.length))
    .attr("fill", "#90EE90");

  svg
    .append("g")
    .attr("class", "topAxis")
    .data([YEAR_MONTH])
    .attr("transform", "translate(0," + SCATTER_HEIGHT + ")")
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .style("font-size", config["axisTickLabelSize"])
    .attr("dx", "-.8em")
    .attr("dy", ".0em")
    .style("fill", "black")
    .attr("transform", "rotate(-65)");

  svg.append("g").call(yAxis).style("font-size", config["axisTickLabelSize"]);
}

export { histogram };

// Import constants and helper functions
import { csvToArray, getMonthsCollection } from "../../common/util.js";

function bar(divID, csvFilename, config) {
  let margin = { top: 20, right: 100, bottom: 100, left: 100 },
    width = 1000 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Plot specific constants
  const YAXIS_MAX_RANGE_PAD = 1;
  const BAR_COLOR = config["barColor"];
  const YEAR_MONTH = getMonthsCollection("2023-02");
  const X_VAR = config["x"];
  const Y_VAR = config["y"];

  let svg = d3
    .select(divID)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // FORMAT: Month,Count
  // TODO: Use d3.csv() function
  d3.csv(csvFilename, function (data) {
    // Format CSV data
    let months = csvToArray(data, "Month", String);
    let counts = csvToArray(data, "Count", parseInt);

    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(YEAR_MONTH)
      .paddingOuter(0.2)
      .paddingInner(0.05);
    const xAxis = d3.axisBottom(x).tickSizeOuter(0);
    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "translate(-10,5)rotate(-65)")
      .style("text-anchor", "end");

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(counts) + YAXIS_MAX_RANGE_PAD])
      .range([height, 0]);

    const yAxis = d3.axisLeft(y).tickSizeOuter(0);
    svg.append("g").call(yAxis);

    svg
      .selectAll("bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", function (d) {
        return x(d[X_VAR]);
      })
      .attr("y", function (d) {
        return y(d[Y_VAR]);
      })
      .attr("width", x.bandwidth())
      .attr("height", function (d) {
        return height - y(d[Y_VAR]);
      })
      .attr("fill", BAR_COLOR);
  });
}
export { bar };

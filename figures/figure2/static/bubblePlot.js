import { csvToArray, getMonthsCollection } from "../../common/util.js";
import {
  bindAxis,
  addCurve,
  addArea,
  addLegend,
} from "../../common/plotUtil.js";

function bubblePlot(divID, CSVFilename, statsCSVFilename, config) {
  const margin = {
      top: config["top"],
      right: config["right"],
      bottom: config["bottom"],
      left: config["left"],
    },
    width = config["width"] - margin.left - margin.right,
    height = config["height"] - margin.top - margin.bottom;
  // Update width and height in config with margins considered
  config["width"] = width;
  config["height"] = height;

  const xAxisConfig = {
    translate: "translate(0," + config["height"] + ")",
    rotateTicks: "rotate(-65)",
    dx: "-.8em",
    dy: ".15em",
    centerShift: 2,
    verticalShift: 110,
    title: config["xAxisTitle"],
    titleRotate: "",
    titleX: width / 2,
    titleY: height + 120,
  };
  const yAxisConfig = {
    translate: "",
    rotateTicks: "",
    dx: "-.1em",
    dy: ".3em",
    centerShift: -400,
    verticalShift: -80,
    title: config["yAxisTitle"],
    titleRotate: "rotate(-90)",
    titleX: -height / 1.5, //-400,
    titleY: -70,
  };

  // Config Parameters
  const YEAR_MONTH = getMonthsCollection("2023-02");
  const CX_VAR = config["x"]; // Month
  const CY_VAR = config["y"]; // LogScore
  const R_VAR = config["r"]; // UShERClusterSize
  const AVG_VAR = config["mean"];
  const MED_VAR = config["median"];
  const MAX_VAR = config["max"];
  const PERCENTILE_99_VAR = config["percentile99"];
  const PERCENTILE_90_VAR = config["percentile90"];
  const PERCENTILE_9999_VAR = config["percentile9999"];

  // Constants
  const TWENTY_PERCENT = 0.2; // 20% padding beyond yAxis max value
  const HALF = 2;
  const BUBBLE_OPACITY = 0.8;

  let svg = d3
    .select(divID)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // TODO: Use d3.csv() function
  d3.csv(statsCSVFilename, function (statData) {
    d3.csv(CSVFilename, function (data) {
      // Fitness scores (y-axis)
      let scores = csvToArray(data, CY_VAR, parseFloat);
      // Cluster sizes
      let bubble_sizes = csvToArray(data, R_VAR, parseInt);
      const BUBBLE_MIN_SIZE = 2;
      const BUBBLE_MAX_SIZE = 30;

      const [minScore, maxScore] = d3.extent(scores);
      const AXIS_PADDING = (maxScore - minScore) * TWENTY_PERCENT;

      let x = d3.scaleBand().domain(YEAR_MONTH).range([0, width]);

      let y = d3
        .scaleLinear()
        .domain([0, d3.max(scores) + AXIS_PADDING])
        .range([height, 0]);

      let z = d3
        .scaleLog()
        .domain([d3.min(bubble_sizes), d3.max(bubble_sizes)])
        .range([BUBBLE_MIN_SIZE, BUBBLE_MAX_SIZE]);

      if (config["averageCurve"]) {
        addCurve(svg, statData, {
          x: x,
          y: y,
          fill: "none",
          stroke: "darkblue",
          width: 2.5,
          X_VAR: CX_VAR,
          Y_VAR: AVG_VAR,
          castValueAs: parseFloat,
        });
      }

      if (config["maxCurve"]) {
        addCurve(svg, statData, {
          x: x,
          y: y,
          fill: "none",
          stroke: "orange",
          width: 2.5,
          X_VAR: CX_VAR,
          Y_VAR: MAX_VAR,
          castValueAs: parseFloat,
        });
      }

      if (config["shadeArea"]) {
        addArea(svg, statData, {
          x: x,
          y: y,
          fill: "#ff4122",
          stroke: "none",
          opacity: 0.1,
          width: 1,
          X_VAR: CX_VAR,
          Y0_VAR: PERCENTILE_9999_VAR,
          Y1_VAR: PERCENTILE_99_VAR,
          castValueAs: parseFloat,
          boldOutline: true,
          lineColor: "pink",
        });
      }

      // Median fitness curve
      if (config["medianCurve"]) {
        addCurve(svg, statData, {
          x: x,
          y: y,
          fill: "none",
          stroke: "green",
          width: 2.5,
          X_VAR: CX_VAR,
          Y_VAR: MED_VAR,
          castValueAs: parseFloat,
        });
      }

      // Plot bubbles (main plot data)
      svg
        .append("g")
        .selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "bubbles")
        .attr("cx", function (d) {
          return x(d[CX_VAR]) + x.bandwidth() / HALF;
        })
        .attr("cy", function (d) {
          return y(d[CY_VAR]);
        })
        .attr("r", function (d) {
          return z(d[R_VAR]);
        })
        .style("fill", function (d) {
          // Color based on cluster size
          return config["bubbleColoringCallable"](d[R_VAR]);
        })
        .style("opacity", BUBBLE_OPACITY)
        .attr("stroke-width", "0.5px")
        .attr("stroke", "black");

      // Bind axes and axis titles
      const xAxis = d3.axisBottom(x).tickSizeOuter(0);
      bindAxis(svg, xAxis, config, xAxisConfig);

      const yAxis = d3.axisLeft(y).ticks(20).tickSizeOuter(0);
      bindAxis(svg, yAxis, config, yAxisConfig);

      if (config["legend"]) {
        addLegend(svg, config);
      }
    });
  });
}
export { bubblePlot };

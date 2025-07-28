import {
  csvToArray,
  getMonthsCollection,
  minMaxValueFromColumn,
  roundTo,
} from "../../common/util.js";

async function scatter_with_marginal_histograms(svg, config) {
  // Constants
  const width =
      config["width"] - config["margin"].left - config["margin"].right,
    height = config["height"] - config["margin"].top - config["margin"].bottom;

  const SCATTER_HEIGHT = 150;
  const SCATTER_WIDTH = width - 200;
  const SCATTER_RADIUS = 5.0;
  const SHIFT_POINTS_RIGHT = width / 2;
  const BAR_PADDING = 2;
  const divID = config["scatterDivID"];
  // Function to color scatter plot points by
  const getColorByScore = config["colorby"];

  const YEAR_MONTH = getMonthsCollection("2023-02");
  // Remove "2020-01" from time interval,
  // only considering 2020-02 to 2023-02
  YEAR_MONTH.shift();

  // Get input recomb data and statistics data
  const statsData = await d3.csv(config["statsFilename"]);
  const recombData = await d3.csv(config["filename"]);

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

  // Aggregated data and stats
  const divergence_hd_scores = csvToArray(recombData, "ParentsHD", parseInt);
  const divergence_avg = Math.ceil(ss.mean(divergence_hd_scores));
  const scores = csvToArray(recombData, config["Score"], parseFloat);

  const [minDiversity, maxDiversity] = minMaxValueFromColumn(
    recombData,
    "DiversityScore",
    parseFloat,
  );
  const [minParentHD, maxParentHD] = minMaxValueFromColumn(
    recombData,
    "ParentsHD",
    parseFloat,
  );
  const [minScore, maxScore] = minMaxValueFromColumn(
    recombData,
    config["Score"],
    parseFloat,
  );

  // Define scales
  let x = d3
    .scaleLinear()
    .domain([0, maxScore + 0.1])
    .range([0, SCATTER_WIDTH]);

  let y = d3
    .scaleLinear()
    .domain([0.0, maxParentHD + 1.0])
    .range([height, SCATTER_HEIGHT]);

  // Define axes
  const xAxis = d3.axisBottom(x).ticks(20);
  const yLeftAxis = d3.axisLeft(y).ticks(10);

  const yHistBinWidth = 5;
  const yHistDomainStart = 0;
  const yHistDomainEnd = 120;
  const yHistogramThresholds = d3
    .range(
      yHistDomainStart + yHistBinWidth,
      yHistDomainEnd + yHistBinWidth,
      yHistBinWidth,
    )
    .map((val) => val);

  let yHistogram = d3
    .bin()
    .value((d) => d[config["ParentalDiversity"]])
    .domain([yHistDomainStart, yHistDomainEnd])
    .thresholds(yHistogramThresholds);

  let yHistogramBins = yHistogram(recombData);
  const [minYCount, maxYCount] = d3.extent(yHistogramBins.map((d) => d.length));

  let xRight = d3
    .scaleLinear()
    .domain([yHistDomainStart, yHistDomainEnd])
    .range([height, SCATTER_HEIGHT]);

  const OCCURENCE_BUFFER = 10;
  let yRightTop = d3
    .scaleLinear()
    .domain([0, maxYCount + OCCURENCE_BUFFER])
    .range([SCATTER_WIDTH, width]);

  let yRight = d3
    .scaleLinear()
    .domain([yHistDomainStart, yHistDomainEnd])
    .range([SCATTER_HEIGHT, height]);

  const yRightTopAxis = d3.axisTop(yRightTop).tickValues([]);
  const yRightAxis = d3.axisRight(yRight).ticks(20);
  const xAxisRight = d3.axisRight(xRight).tickValues([]);

  svg
    .selectAll(".rightHist")
    .data(yHistogramBins)
    .join("rect")
    .attr("x", (d) => {
      return yRightTop(0);
    })
    .attr("width", (d) => {
      return yRightTop(d.length) - SCATTER_WIDTH + 1;
    })
    .attr("y", (d) => {
      return xRight(d.x1);
    })
    .attr("height", (d) => {
      const w = Math.max(0, xRight(d.x0) - xRight(d.x1) - BAR_PADDING);
      return w;
    })
    .attr("fill", "orange")
    .attr("stroke-width", 0.5)
    .attr("stroke", "black");

  let x_top = d3
    .scaleLinear()
    .domain([0, maxScore + 0.1])
    .range([0, SCATTER_WIDTH]);

  const binWidth = 0.05;
  const domainStart = 0.0;
  const domainEnd = 1.8;
  const thresholds = d3
    .range(domainStart + binWidth, domainEnd + binWidth, binWidth)
    .map((val) => roundTo(val, 2));

  let histogram = d3
    .bin()
    .value((d) => d[config["Score"]])
    .domain([domainStart, domainEnd])
    .thresholds(thresholds);

  let bins = histogram(recombData);
  const [minXCount, maxXCount] = d3.extent(bins.map((d) => d.length));
  const xAxisTop = d3.axisTop(x_top).tickValues([]);

  const TOP_HISTOGRAM_OCC_BUFFER = 100;
  let yLeftTop = d3
    .scaleLinear()
    .domain([0, maxXCount + TOP_HISTOGRAM_OCC_BUFFER])
    .range([SCATTER_HEIGHT, 0]);

  // Remove outer tick mark on axis
  const yAxisTopLeft = d3.axisLeft(yLeftTop).ticks(5).tickSizeOuter(0);

  // Top histogram for relative fitness
  svg
    .selectAll(".bar")
    .data(bins)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => {
      return x_top(d.x0);
    })
    .attr("y", (d) => {
      return yLeftTop(d.length);
    })
    .attr("width", (d) => {
      return Math.max(0, x_top(d.x1) - x_top(d.x0) - BAR_PADDING);
    })
    .attr("height", (d) => {
      return SCATTER_HEIGHT - yLeftTop(d.length);
    })
    // Histogram bar color
    .style("fill", "orange")
    .attr("stroke-width", 0.5)
    .attr("stroke", "black");

  // x-axis for main Y-axis histogram
  svg
    .append("g")
    // Move y-axis to the right side
    .attr("transform", "translate(" + SCATTER_WIDTH + ",0)")
    .call(xAxisRight)
    .style("font-size", config["axisTickLabelSize"])
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", SCATTER_WIDTH)
    .attr("y", -200)
    .attr("dominant-baseline", "central")
    .style("fill", "black")
    .style("font-size", "14px");

  // x-axis for main x-axis histogram (top histogram)
  svg
    .append("g")
    .attr("class", "topAxis")
    .data([YEAR_MONTH])
    .attr("transform", "translate(0," + SCATTER_HEIGHT + ")")
    .call(xAxisTop)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", ".8em")
    .attr("dy", ".15em")
    .style("fill", "black")
    .attr("transform", "rotate(-65)");

  // Remove month labels from the top x-axis
  svg.selectAll("text").remove();

  // Add frequency count to the top of each bar, default false
  if (config["showBarQuantity"]) {
    /*
    svg
      .selectAll("text")
      .data(NORM_FITNESS_BINS)
      .enter()
      .append("text")
      .text(function (d) {
        let count = d.value;
        if (count != 0) {
          return count;
        } else {
          return "";
        }
      })
      .attr("x", function (d) {
        return x_top(d.key) - (x_top.bandwidth() / 2 - 45);
      })
      .attr("y", function (d) {
        const count = d.value;
        return yLeftTop(count) - 5;
      });
      */
  }

  // Add y-axis for top (x-axis) histogram
  svg
    .append("g")
    .attr("class", "y0 axis")
    .call(yAxisTopLeft)
    .style("font-size", config["axisTickLabelSize"])
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -200)
    .attr("y", -80)
    .attr("dominant-baseline", "central")
    .style("fill", "black")
    .style("font-size", "14px");
  svg
    .append("text")
    .attr("class", "y label")
    .attr("text-anchor", "center")
    .attr("x", -150)
    .attr("y", -80)
    .attr("dx", ".75em")
    .style("font-size", "25px")
    .attr("transform", "rotate(-90)")
    .style("fill", "black")
    .text("");

  // y-axis for main y-axis histogram (right side histogram)
  /*
  svg
    .append("g")
    .attr("class", "topAxis")
    .data(HD_BINS_KEYS)
    .style("font-size", config["axisTickLabelSize"])
    .attr("transform", "translate(0," + SCATTER_HEIGHT + ")")
    .call(yRightTopAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.9em")
    .attr("dy", "1.2em")
    .style("fill", "black")
    .attr("transform", "rotate(90)");
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "center")
    .attr("x", width - 180)
    .attr("y", SCATTER_HEIGHT - 60)
    .attr("dx", ".75em")
    .style("font-size", "25px")
    .style("fill", "black")
    .text("");
    */

  // Main scatter plot x-axis
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
  // x-axis title, specified from config
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "center")
    .attr("x", width / 3.5)
    .attr("y", height + 100)
    .attr("dx", ".75em")
    .style("font-size", "25px")
    .style("fill", "black")
    .text(config["xAxisTitle"]);

  // Main scatter plot y-axis
  svg
    .append("g")
    .attr("class", "y0 axis")
    .call(yLeftAxis)
    .style("font-size", config["axisTickLabelSize"])
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -300)
    .attr("y", -80)
    .attr("dominant-baseline", "central")
    .style("fill", "black")
    .style("font-size", "20px");
  // y-axis title, specified from config
  svg
    .append("text")
    .attr("class", "y label")
    .attr("text-anchor", "center")
    .attr("x", -850)
    .attr("y", -100)
    .attr("dy", ".75em")
    .style("font-size", "25px")
    .attr("transform", "rotate(-90)")
    .style("fill", "black")
    .text(config["yAxisTitle"]);

  // Create main scatter plot
  svg
    .append("g")
    .selectAll("dot")
    .data(recombData)
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return x(d[config["Score"]]);
    })
    .attr("cy", function (d) {
      // Y-axis point will be the divergence of parents
      return y(d.ParentsHD);
    })
    .attr("r", SCATTER_RADIUS)
    .style("fill", function (d) {
      const recomb_fitness = d[config["RawScore"]];
      const month = d.Month;
      return getColorByScore(recomb_fitness, month, statLookup);
    });

  // Add horizontal dashed line at average divergence on y-axis
  if (config["baseline"]) {
    svg
      .append("g")
      .attr("transform", "translate(0, " + y(divergence_avg) + ")")
      .append("line")
      .attr("x2", SCATTER_WIDTH)
      .style("stroke", "black")
      .style("stroke-dasharray", "10, 5")
      .style("stroke-width", "2px");
  }

  // Add vertical dashed line at 1.0 mark on x-axis
  if (config["verticalBaseline"]) {
    svg
      .append("line")
      .attr("x1", x(1.0))
      .attr("y1", SCATTER_HEIGHT)
      .attr("x2", x(1.0))
      .attr("y2", height)
      .style("stroke", "black")
      .style("stroke-dasharray", "10, 5")
      .style("stroke-width", "2px");
  }

  // Add plot legend
  if (config["legend"]) {
    const COLORS = d3.scaleOrdinal().range(config["legendColors"]);
    let legend = svg
      .selectAll("labels")
      .data(config["legendLabels"])
      .enter()
      .append("g")
      .attr("transform", function (d, i) {
        return "translate(0," + i * 35 + ")";
      });

    const LEGEND_CIRCLE_RADIUS = 15;
    legend
      .append("circle")
      .attr("cx", 1240)
      .attr("cy", 200)
      .attr("r", LEGEND_CIRCLE_RADIUS)
      .attr("stroke", "black")
      .attr("fill", COLORS);
    legend
      .append("text")
      .attr("x", 1260)
      .attr("y", 195)
      .attr("dy", ".50em")
      .attr("fill", "black")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("text-anchor", "start")
      .text(function (d) {
        return d;
      });
  }
  return svg;
}
export { scatter_with_marginal_histograms };

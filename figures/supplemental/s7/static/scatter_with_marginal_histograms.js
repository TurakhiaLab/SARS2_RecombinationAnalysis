import {
  csvToArray,
  getMonthsCollection,
  getScoresMinByParents,
  minMaxValueFromColumn,
  roundTo,
  roundUpTo,
} from "./util.js";

function getScore(config, d) {
  if (!config["NormalizeByMinParents"]) {
    return d[config["Score"]];
  } else {
    const rawRecombScore = d[config["RawScore"]];
    const donorScore = d[config["DonorScore"]];
    const acceptorScore = d[config["AcceptorScore"]];
    const minParentalFitness = Math.min(donorScore, acceptorScore);
    const recombNormByMin = rawRecombScore / minParentalFitness;
    return recombNormByMin;
  }
}

function getXDomain(config, data) {
  if (config["NormalizeByMinParents"]) {
    return [0, 6.8 + 1];
  } else {
    const [minScore, maxScore] = minMaxValueFromColumn(
      data,
      config["Score"],
      parseFloat,
    );
    return [minScore, maxScore];
  }
}

function getColorGradientCaps(data, statLookup, config, centerPoint = 1.0) {
  let minFoldChange = Infinity;
  let maxFoldChange = -Infinity;
  data.forEach((d) => {
    const month = d.Month;
    if (statLookup[month] && statLookup[month].Mean > 0) {
      const fc = d[config["RawScore"]] / statLookup[month].Mean;
      if (fc > maxFoldChange) maxFoldChange = fc;
      if (fc < minFoldChange) minFoldChange = fc;
    }
  });
  const maxDistance = centerPoint - minFoldChange;
  const COLOR_MAX_CAP = centerPoint + maxDistance;
  const COLOR_MIN_CAP = minFoldChange;
  return [COLOR_MIN_CAP, COLOR_MAX_CAP];
}

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
      Mean: parseFloat(d.Mean),
    };
  });

  // Aggregated data and stats
  const divergence_hd_scores = csvToArray(recombData, "ParentsHD", parseInt);
  const divergence_avg = Math.ceil(ss.mean(divergence_hd_scores));
  const scores = csvToArray(recombData, config["Score"], parseFloat);

  const scores_by_min_parents = csvToArray(
    recombData,
    config["Score"],
    parseFloat,
  );

  const scoreSkewness = ss.sampleSkewness(scores);
  console.log("X-Axis Score Skewness:", scoreSkewness);

  const scoreSkewnessByMin = ss.sampleSkewness(
    getScoresMinByParents(recombData, config),
  );
  console.log("Norm by Min Parent Score Skewness:", scoreSkewnessByMin);

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

  const [COLOR_MIN_CAP, COLOR_MAX_CAP] = getColorGradientCaps(
    recombData,
    statLookup,
    config,
  );

  const colorScale = d3
    .scaleSequential(d3.interpolateViridis)
    .domain([COLOR_MIN_CAP, COLOR_MAX_CAP]);

  const [minScore, maxScore] = getXDomain(config, recombData);
  const xDomainEnd = roundUpTo(maxScore, 1);

  // Define scales
  const x = d3.scaleLinear().domain([0, xDomainEnd]).range([0, SCATTER_WIDTH]);
  const y = d3
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

  const xRight = d3
    .scaleLinear()
    .domain([yHistDomainStart, yHistDomainEnd])
    .range([height, SCATTER_HEIGHT]);

  const OCCURENCE_BUFFER = 10;
  const yRightTop = d3
    .scaleLinear()
    .domain([0, maxYCount + OCCURENCE_BUFFER])
    .range([SCATTER_WIDTH, width]);

  const yRight = d3
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

  const x_top = d3
    .scaleLinear()
    .domain([0, xDomainEnd])
    .range([0, SCATTER_WIDTH]);

  const binWidth = config["fitnessHistConfig"].binWidth;
  const domainStart = config["fitnessHistConfig"].domainStart;
  const domainEnd = xDomainEnd;
  const thresholds = d3
    .range(domainStart + binWidth, domainEnd + binWidth, binWidth)
    .map((val) => roundTo(val, 2));

  let histogram = d3
    .bin()
    .value((d) => getScore(config, d))
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

  let maxVal = 0;

  // Create main scatter plot
  svg
    .append("g")
    .selectAll("dot")
    .data(recombData)
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      if (config["NormalizeByMinParents"]) {
        const rawRecombScore = d[config["RawScore"]];
        const donorScore = d[config["DonorScore"]];
        const acceptorScore = d[config["AcceptorScore"]];
        const minParentalFitness = Math.min(donorScore, acceptorScore);
        if (minParentalFitness <= 0) {
          console.log("Min parental fitness: ", minParentalFitness);
        }
        const recombNormByMin = rawRecombScore / minParentalFitness;
        if (recombNormByMin > maxVal) {
          maxVal = recombNormByMin;
        }
        return x(recombNormByMin);
      }

      return x(d[config["Score"]]);
    })
    .attr("cy", function (d) {
      // Y-axis point will be the divergence of parents
      return y(d.ParentsHD);
    })
    .attr("r", function (d) {
      // const nid = d["Node"];
      return SCATTER_RADIUS;
    })
    .style("fill", function (d) {
      const recomb_fitness = d[config["RawScore"]];
      const month = d.Month;
      const nid = d["Node"];
      const meanFitness = statLookup[month]?.Mean;
      if (meanFitness && meanFitness > 0) {
        const foldChange = recomb_fitness / meanFitness;
        const clampedFoldChange = Math.min(foldChange, COLOR_MAX_CAP);
        return colorScale(clampedFoldChange);
      }
      return "gray";
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
    const legendWidth = 220;
    const legendHeight = 20;
    const legendX = config["legendCX"] - 60;
    const legendY = config["legendCY"];
    const defs = svg.append("defs");
    defs.selectAll("#continuous-gradient").remove();

    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "continuous-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    const scaleDomain = colorScale.domain();
    const legendMin = scaleDomain[0];
    const legendMax = scaleDomain[1];
    const numStops = 10;
    const colorStops = d3.range(numStops).map((i) => {
      const t = i / (numStops - 1);
      const val = legendMin + t * (legendMax - legendMin);
      return {
        offset: `${t * 100}%`,
        color: colorScale(val),
      };
    });

    linearGradient
      .selectAll("stop")
      .data(colorStops)
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    svg.selectAll(".legend-group").remove();

    const legendGroup = svg
      .append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${legendX}, ${legendY})`);
    legendGroup
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#continuous-gradient)")
      .style("stroke", "black")
      .style("stroke-width", "0.5px");

    const legendScale = d3
      .scaleLinear()
      .domain([legendMin, legendMax])
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat((d) => {
        return d.toFixed(1) + "x";
      });

    legendGroup
      .append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .style("font-size", "14px");
    legendGroup
      .append("text")
      .attr("x", 0)
      .attr("y", -10)
      .text("Fitness Fold-Change vs Monthly Mean")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "black");
  }

  return svg;
}
export { scatter_with_marginal_histograms };

// Helper function to aggregate monthly data
function aggregateData(data) {
  let cases_by_month = new Map();
  let diversity_by_month = new Map();
  let recombs_detected_by_month = new Map();
  data.map((elem) => {
    // Record number of infections, standing genetic diversity, and number of recombinants for each month
    if (!cases_by_month.get(elem.Month)) {
      cases_by_month.set(elem.Month, parseInt(elem.Infections));
      diversity_by_month.set(elem.Month, parseFloat(elem.DiversityScore));
      recombs_detected_by_month.set(
        elem.Month,
        parseFloat(elem.NumRecombsDetectedByMonth),
      );
    }
  });
  return [cases_by_month, diversity_by_month, recombs_detected_by_month];
}

export async function panelb(svg, config) {
  // Load data
  const data = await d3.csv(config["recombFilename"]);
  const nullDREDist = await d3.tsv(config["dreDistributionFilename"]);

  // Constants & Dimensions
  const totalHeight = config["height"];
  const width = config["width"];
  const CENTER_AXIS_LABEL_SHIFT = 10;
  const MAX_CASES = 90;
  // Space between top and bottom plots
  const panelBuffer = 60;
  const topHeight = 150;
  const bottomHeight = totalHeight - topHeight - panelBuffer;
  const diversityAxisTranslateWidth = width + 80;

  // Get interval of months to consider
  const MONTHS = [...new Set(data.map((elem) => elem.Month))];
  MONTHS.sort();

  // Format and aggregate data
  const [cases_by_month, diversity_by_month, recombs_detected_by_month] =
    aggregateData(data);

  // Get DRE data
  let dre_by_month = new Map();
  nullDREDist.forEach((elem) => {
    dre_by_month.set(elem.Month, parseFloat(elem.Null_DRE_Prob));
  });

  const maxDiversityStore = Math.max(
    ...data.map((elem) => elem.DiversityScore),
  );
  const maxRecombinants = Math.max(
    ...data.map((elem) => elem.NumRecombsDetectedByMonth),
  );
  const maxCases = Math.max(...data.map((elem) => parseInt(elem.Infections)));

  const x = d3
    .scaleBand()
    .domain(MONTHS)
    .range([0, width])
    .paddingOuter(0.2)
    .paddingInner(0.05);

  const topPlot = svg.append("g").attr("class", "top-plot");
  const bottomPlot = svg
    .append("g")
    .attr("class", "bottom-plot")
    .attr("transform", "translate(0," + (topHeight + panelBuffer) + ")");

  bottomPlot
    .append("g")
    .attr("class", "bottomAxis")
    .attr("transform", "translate(0," + bottomHeight + ")")
    .data([MONTHS])
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .style("font-size", config["axisTickLabelSize"])
    .style("fill", "black")
    .attr("transform", "rotate(-65)");

  // Append bottom x axis title
  bottomPlot
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "center")
    .attr("x", width / 2.2)
    .attr("y", bottomHeight + 80)
    .attr("dx", ".75em")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "black")
    .text(config["xAxisTitle"]);

  const yDRE = d3.scaleLinear().domain([0, 1.0]).range([topHeight, 0]);
  const yDREAxis = d3.axisLeft(yDRE).tickSizeOuter(0);

  topPlot
    .append("g")
    .attr("class", "dreAxis")
    .style("font-size", config["axisTickLabelSize"])
    .call(yDREAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -topHeight / 2)
    .attr("y", -50)
    .attr("dominant-baseline", "central")
    .style("text-anchor", "middle")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "purple")
    .style("font-weight", "bold")
    .text(config["yDREAxisTitle"]);

  topPlot
    .append("path")
    .datum(MONTHS)
    .attr("fill", "mediumpurple")
    .attr("fill-opacity", 0.3)
    .attr(
      "d",
      d3
        .area()
        .defined(function (d) {
          return dre_by_month.has(d) && !isNaN(dre_by_month.get(d));
        })
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y0(topHeight)
        .y1(function (d) {
          return yDRE(dre_by_month.get(d));
        }),
    );

  topPlot
    .append("path")
    .datum(MONTHS)
    .attr("fill", "none")
    .attr("stroke", "purple")
    .attr("stroke-width", 2.5)
    .attr(
      "d",
      d3
        .line()
        .defined(function (d) {
          return dre_by_month.has(d) && !isNaN(dre_by_month.get(d));
        })
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y(function (d) {
          return yDRE(dre_by_month.get(d));
        }),
    );

  let yLeft = d3
    .scaleLinear()
    .domain([0, maxRecombinants + 5])
    .range([bottomHeight, 0]);
  const yLeftAxis = d3.axisLeft(yLeft).tickSizeOuter(0);

  bottomPlot
    .append("g")
    .attr("class", "recombinantsAxis")
    .call(yLeftAxis)
    .style("font-size", config["axisTickLabelSize"])
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -bottomHeight / 2)
    .attr("y", -50)
    .attr("dominant-baseline", "middle")
    .style("text-anchor", "middle")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "red")
    .style("font-weight", "bold")
    .text(config["yLeftAxisTitle"]);

  // Inner right axis is the number of cases
  const yRight = d3
    .scaleLinear()
    .domain([0, MAX_CASES + 1])
    .range([bottomHeight, 0]);
  const yRightAxis = d3.axisRight(yRight).tickSizeOuter(0);

  bottomPlot
    .append("g")
    .attr("class", "infectionsAxis")
    .attr("transform", "translate(" + width + ",0)")
    .style("font-size", config["axisTickLabelSize"])
    .call(yRightAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -bottomHeight / 2)
    .attr("y", 60)
    .attr("dominant-baseline", "central")
    .style("text-anchor", "middle")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "green")
    .style("font-weight", "bold")
    .text(config["yRightAxisTitle"]);

  // Outer right axis is standing genetic diversity
  const yOuterRight = d3
    .scaleLinear()
    .domain([0, maxDiversityStore])
    .range([bottomHeight, 0]);
  const yOuterRightAxis = d3.axisRight(yOuterRight).tickSizeOuter(0);

  bottomPlot
    .append("g")
    .attr("class", "diversityAxis")
    .attr("transform", "translate(" + diversityAxisTranslateWidth + ",0)")
    .style("font-size", config["axisTickLabelSize"])
    .call(yOuterRightAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -bottomHeight / 2)
    .attr("y", 70)
    .attr("dominant-baseline", "central")
    .style("text-anchor", "middle")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "blue")
    .style("font-weight", "bold")
    .text(config["yOuterRightAxisTitle"]);

  const yCases = d3
    .scaleLinear()
    .domain([0, maxCases])
    .range([bottomHeight, 0]);
  bottomPlot
    .append("path")
    .datum(MONTHS)
    .attr("fill", "none")
    .attr("stroke", "green")
    .attr("stroke-width", 2.5)
    .attr(
      "d",
      d3
        .line()
        .curve(d3.curveMonotoneX)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y(function (d) {
          return yCases(cases_by_month.get(d));
        }),
    );

  bottomPlot
    .append("path")
    .datum(MONTHS)
    .attr("fill", "none")
    .attr("stroke", "red")
    .style("opacity", 1.0)
    .attr("stroke-width", 2.5)
    .attr(
      "d",
      d3
        .line()
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y(function (d) {
          return yLeft(recombs_detected_by_month.get(d));
        }),
    );

  const yDiversity = d3
    .scaleLinear()
    .domain([0, maxDiversityStore])
    .range([bottomHeight, 0]);
  bottomPlot
    .append("path")
    .datum(MONTHS)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 2.5)
    .attr(
      "d",
      d3
        .line()
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y(function (d) {
          return yDiversity(diversity_by_month.get(d));
        }),
    );

  // Optionally add figure legend to the bottom plot
  if (config["legend"]) {
    const legend_square_size = 10;
    const COLORS = d3.scaleOrdinal().range(config["legendColors"]);
    let legend = bottomPlot
      .selectAll("labels")
      .data(config["legendLabels"])
      .enter()
      .append("g")
      .attr("transform", function (d, i) {
        return "translate(20," + (10 + i * 20) + ")";
      });

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legend_square_size)
      .attr("height", legend_square_size)
      .style("fill", COLORS);
    legend
      .append("text")
      .style("fill", COLORS)
      .attr("x", 20)
      .attr("y", 5)
      .attr("dy", ".35em")
      .style("font-size", "12px")
      .style("text-anchor", "start")
      .text(function (d) {
        return d;
      });
  }
}

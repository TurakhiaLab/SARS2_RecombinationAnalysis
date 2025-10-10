
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
  const data = await d3.csv(config["recombFilename"]);

  // Constants
  const height = config["height"];
  const width = config["width"];
  const CENTER_AXIS_LABEL_SHIFT = 10;
  const outerAxisTranslateWidth = width + 80;
  // Max number of cases (in millions)
  const MAX_CASES = 90;

  // Get interval of months to consider
  const MONTHS = [...new Set(data.map((elem) => elem.Month))];
  MONTHS.sort();

  // Format and aggregate data
  const [cases_by_month, diversity_by_month, recombs_detected_by_month] =
    aggregateData(data);

  // Get max values
  const maxDiversityStore = Math.max(
    ...data.map((elem) => elem.DiversityScore),
  );

  const maxRecombinants = Math.max(
    ...data.map((elem) => elem.NumRecombsDetectedByMonth),
  );

  // Define axes
  // Bottom x-axis is the months
  const x = d3
    .scaleBand()
    .domain(MONTHS)
    .range([0, width])
    .paddingOuter(0.2)
    .paddingInner(0.05);

  // Left y-axis for number of recombinants detected each month
  let yLeft = d3
    .scaleLinear()
    .domain([0, maxRecombinants + 5])
    .range([height, 0]);

  const xAxis = d3.axisBottom(x);
  const yLeftAxis = d3.axisLeft(yLeft).tickSizeOuter(0);

  svg
    .append("g")
    .attr("class", "bottomAxis")
    .attr("transform", "translate(0," + height + ")")
    .data([MONTHS])
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .style("font-size", config["axisTickLabelSize"])
    .style("fill", "black")
    .attr("transform", "rotate(-65)");
  //  Append bottom x axis title
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "center")
    .attr("x", width / 2.2)
    .attr("y", height + 80)
    .attr("dx", ".75em")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "black")
    .text(config["xAxisTitle"]);

  // Create y-axis
  svg
    .append("g")
    .attr("class", "recombinantsAxis")
    .call(yLeftAxis)
    .style("font-size", config["axisTickLabelSize"])
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -50)
    .attr("y", -50)
    .style("font-size", "16px")
    .attr("dominant-baseline", "start")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "black")
    .text(config["yLeftAxisTitle"]);

  // Inner right axis is the number of cases worldwide,
  // just for creating y-axis, which is in millions of cases
  const yRight = d3
    .scaleLinear()
    .domain([0, MAX_CASES + 1])
    .range([height, 0]);
  const yRightAxis = d3.axisRight(yRight).tickSizeOuter(0);
  svg
    .append("g")
    .attr("class", "infectionsAxis")
    .attr("transform", "translate(" + width + ",0)")
    .style("font-size", config["axisTickLabelSize"])
    .call(yRightAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -300)
    .attr("y", 80)
    .attr("dominant-baseline", "central")
    .style("font-size", config["LowerAxisTitleSize"])
    .style("fill", "black")
    .text(config["yRightAxisTitle"]);

  // Outer right axis is standing genetic diversity score
  const yOuterRight = d3
    .scaleLinear()
    .domain([0, maxDiversityStore])
    .range([height, 0]);
  const yOuterRightAxis = d3.axisRight(yOuterRight).tickSizeOuter(0);
  svg
    .append("g")
    .attr("class", "diversityAxis")
    .attr("transform", "translate(" + outerAxisTranslateWidth + ",0)")
    .style("font-size", config["axisTickLabelSize"])
    .call(yOuterRightAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -350)
    .attr("y", 100)
    .attr("dominant-baseline", "central")
    .style("font-size", config["LowerAxisTitleSize"])
    .text(config["yOuterRightAxisTitle"]);

  const maxCases = Math.max(...data.map((elem) => parseInt(elem.Infections)));
  // Define the domain for case count data
  const yCases = d3.scaleLinear().domain([0, maxCases]).range([height, 0]);
  // Number of infections per month curve
  svg
    .append("path")
    .datum(MONTHS)
    .attr("fill", "none")
    .attr("stroke", "green")
    .attr("stroke-width", 2.5)
    .attr(
      "d",
      d3
        .line()
        // Use smoothed curve, while preserving large spike in infections in early 2022
        .curve(d3.curveMonotoneX)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y(function (d) {
          return yCases(cases_by_month.get(d));
        }),
    );

  // Number of recombinant lineages inferred per month curve
  svg
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
        // Use smoothed curve to show trend line
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y(function (d) {
          return yLeft(recombs_detected_by_month.get(d));
        }),
    );

  // Define the domain for case case data
  const yDiversity = d3
    .scaleLinear()
    .domain([0, maxDiversityStore])
    .range([height, 0]);

  // Standing genetic diversity per month curve
  svg
    .append("path")
    .datum(MONTHS)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 2.5)
    .attr(
      "d",
      d3
        .line()
        // Use smoothed curve to show trend line
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d) + CENTER_AXIS_LABEL_SHIFT;
        })
        .y(function (d) {
          return yDiversity(diversity_by_month.get(d));
        }),
    );

  // Optionally add figure legend
  if (config["legend"]) {
    const legend_square_size = 10;
    const COLORS = d3.scaleOrdinal().range(config["legendColors"]);
    let legend = svg
      .selectAll("labels")
      .data(config["legendLabels"])
      .enter()
      .append("g")
      .attr("transform", function (d, i) {
        //  Determine the spacing in between each of the
        //  legend labels
        return "translate(0," + i * 15 + ")";
      });

    legend
      .append("rect")
      .attr("x", 15)
      .attr("y", 20)
      .attr("width", legend_square_size)
      .attr("height", legend_square_size)
      .style("fill", COLORS);
    legend
      .append("text")
      .style("fill", COLORS)
      .attr("x", 30)
      .attr("y", 22)
      .attr("dy", ".50em")
      .style("font-size", "14px")
      .style("text-anchor", "start")
      .text(function (d) {
        return d;
      });
  }
}

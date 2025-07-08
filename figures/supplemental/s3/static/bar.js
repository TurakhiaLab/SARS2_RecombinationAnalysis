async function bar(svg, config) {
  const margin = config["margin"];
  const width = config["width"] - margin.left - margin.right;
  const height = config["height"] - margin.top - margin.bottom;
  const X_VAR = config["X_VAR"];
  const Y_VAR = config["Y_VAR"];

  // Data
  const METADATA = await d3.csv(config["rivet-pango-data"]);
  const data = await d3.csv(config["branch-length-data"]);

  // Aggregating coloring metadata
  let distance_map = new Map();
  let jaccard_index_map = new Map();
  for (let i = 0; i < METADATA.length; ++i) {
    const pango_recomb_lineage = METADATA[i]["PangoRecombinant"];
    const distance = parseInt(METADATA[i]["DistanceToPango"]);
    const jaccard_index = parseFloat(METADATA[i]["JaccardIndexDescSets"]);
    distance_map.set(pango_recomb_lineage, distance);
    jaccard_index_map.set(pango_recomb_lineage, jaccard_index);
  }
  const MAX = d3.max(data.map((obj) => parseInt(obj[X_VAR])));

  // Define and add X axis
  const x = d3
    .scaleLinear()
    .domain([0, MAX + 1])
    .range([0, width]);
  const xAxis = d3.axisBottom(x).ticks(40);

  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

  // Append bottom x axis title
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width / 1.2)
    .attr("y", height + 80)
    .attr("dx", ".75em")
    .style("font-size", "30px")
    .style("fill", "black")
    .text(config["xAxisTitle"]);

  // Define and add Y axis
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(
      data.map(function (d) {
        return d[Y_VAR];
      }),
    )
    .padding(0.1);

  // Add horizontal bars
  svg
    .selectAll("bars")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", function (d) {
      return y(d[Y_VAR]);
    })
    .attr("width", function (d) {
      return x(d[X_VAR]);
    })
    .attr("height", y.bandwidth())
    // Color based on Pango-identified node vs RIVET-identified node
    .attr("fill", function (d) {
      const dist = distance_map.get(d[Y_VAR]);
      const ji = Math.round(jaccard_index_map.get(d[Y_VAR]) * 1000) / 1000;
      const bl = d.BranchLength;
      // func(distance, jaccard_index, branch_length) {...}
      return config["custom-color-function"](dist, ji, bl);
    });

  // Add y-axis
  const yAxis = d3.axisLeft(y);
  svg.append("g").call(yAxis);

  svg
    .append("g")
    .attr("class", "y0 axis")
    .call(y)
    .append("text")
    .attr("x", -150)
    .attr("y", -30)
    .attr("dominant-baseline", "start")
    .style("font-size", "30px")
    .text(config["yAxisTitle"]);

  // Add vertical dashed line
  const VERTICAL_CUTOFF = 3.0;
  svg
    .append("line")
    .attr("x1", x(VERTICAL_CUTOFF))
    .attr("y1", height)
    .attr("x2", x(VERTICAL_CUTOFF))
    .attr("y2", 0)
    .style("stroke", "black")
    .style("stroke-dasharray", "10, 5")
    .style("stroke-width", "1.5px");

  // Add plot legend
  const COLORS = d3.scaleOrdinal().range(config["legendColors"]);
  let legend = svg
    .selectAll("labels")
    .data(config["legendLabels"])
    .enter()
    .append("g")
    .attr("transform", function (d, i) {
      return "translate(0," + i * 35 + ")";
    });

  const LEGEND_CIRCLE_RADIUS = 10;
  // Add the path using this helper function
  legend
    .append("circle")
    .attr("cx", 300)
    .attr("cy", 50)
    .attr("r", LEGEND_CIRCLE_RADIUS)
    .attr("stroke", "black")
    .attr("fill", COLORS);
  legend
    .append("text")
    .attr("x", 320)
    .attr("y", 47)
    .attr("dy", ".50em")
    .attr("fill", "black")
    .style("font-size", "20px")
    .style("text-anchor", "start")
    .text(function (d) {
      return d;
    });
}
export { bar };

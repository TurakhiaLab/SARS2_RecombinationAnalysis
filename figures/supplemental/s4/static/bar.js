async function bar(svg, config) {
  // Plot Dimensions
  const margin = config["margin"];
  const width = config["width"];
  const height = config["height"];
  const KEY = config["key"];
  const VALUE = config["value"];
  const data = await d3.csv(config["data"]);
  const MAX = parseInt(d3.max(data)[VALUE]);

  // x-axis
  const x = d3
    .scaleLinear()
    .domain([0, MAX + 1])
    .range([0, width]);
  const xAxis = d3.axisBottom(x);

  let xAxisLine = svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("font-size", config["axis-tick-size"])
    .style("text-anchor", "end");

  // Add x axis title
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width / 1.8)
    .attr("y", height + 60)
    .attr("dx", ".75em")
    .style("font-size", config["axis-title-size"])
    .style("fill", "black")
    .text(config["x-title"]);

  // y-axis
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(
      data.map(function (d) {
        const key = config["scaleBandMap"][d[KEY]];
        return key;
      }),
    )
    .padding(0.1);

  // Horizontal Bars
  svg
    .selectAll("bars")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", function (d) {
      const key = config["scaleBandMap"][d[KEY]];
      return y(key);
    })
    .attr("width", function (d) {
      return x(d[VALUE]);
    })
    .attr("height", y.bandwidth())
    .attr("fill", config["bar-color"]);

  let yAxis = d3.axisLeft(y);
  // Add y-axis at end, after bars have rendered
  svg
    .append("g")
    .call(yAxis)
    .selectAll("text")
    .style("font-size", config["axis-tick-size"])
    .style("text-anchor", "end");

  svg
    .append("g")
    .attr("class", "y0 axis")
    .call(y)
    .append("text")
    .attr("x", -180)
    .attr("y", -40)
    .attr("dominant-baseline", "start")
    .style("font-size", config["axis-title-size"])
    .text(config["y-title"]);
}
export { bar };

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
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

  // Add x axis title
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("dx", ".75em")
    .style("font-size", "14px")
    .style("fill", "black")
    .text("Frequency");

  // y-axis
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(
      data.map(function (d) {
        return d[KEY];
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
      return y(d[KEY]);
    })
    .attr("width", function (d) {
      return x(d[VALUE]);
    })
    .attr("height", y.bandwidth())
    .attr("fill", config['bar-color']);

  // Add y-axis at end, after bars have rendered
  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("g")
    .attr("class", "y0 axis")
    .call(y)
    .append("text")
    .attr("x", -100)
    .attr("y", -40)
    .attr("dominant-baseline", "start")
    .style("font-size", "14px")
    .text("Filtration Checks");
}
export { bar };

// Utilities for constructing D3 plots

function getTooltip(divID, config) {
  //TODO: Use config within tooltip settings
  const tooltip = d3
    .select(divID)
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "grey")
    .style("border-radius", "3px")
    .style("padding", "10px")
    .style("color", "white");
  return tooltip;
}

function addLegend(svg, config) {
  const COLORS = d3.scaleOrdinal().range(config["legendColors"]);
  const SHIFT_FACTOR = 35;
  const LEGEND_CIRCLE_RADIUS = 15;
  // TODO: Push to config
  const CX_VAR = 35;
  const CY_VAR = 60;
  const X_ATTR_VAR = 55;
  const Y_ATTR_VAR = 57;
  const FONT_SIZE = "16px";

  let legend = svg
    .selectAll("labels")
    .data(config["legendLabels"])
    .enter()
    .append("g")
    .attr("transform", function (d, i) {
      return "translate(0," + i * SHIFT_FACTOR + ")";
    });

  legend
    .append("circle")
    .attr("cx", CX_VAR)
    .attr("cy", CY_VAR)
    .attr("r", LEGEND_CIRCLE_RADIUS)
    .attr("stroke", "black")
    .attr("fill", COLORS);
  legend
    .append("text")
    .attr("x", X_ATTR_VAR)
    .attr("y", Y_ATTR_VAR)
    .attr("dy", ".50em")
    .attr("fill", "black")
    .style("font-size", FONT_SIZE)
    .style("text-anchor", "start")
    .text(function (d) {
      return d;
    });
}

function bindAxis(svg, axis, plotConfig, axisConfig) {
  // Axis formatting
  svg
    .append("g")
    .attr("transform", axisConfig["translate"])
    .call(axis)
    .style("font-size", plotConfig["axisTickLabelSize"])
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", axisConfig["dx"])
    .attr("dy", axisConfig["dy"])
    .attr("transform", axisConfig["rotateTicks"]);

  if (axisConfig["title"]) {
    // Axis title formatting
    svg
      .append("text")
      .attr("transform", axisConfig["titleRotate"])
      .attr("text-anchor", "center")
      .attr("x", axisConfig["titleX"])
      .attr("y", axisConfig["titleY"])
      .style("font-size", plotConfig["axisTitleSize"])
      .style("fill", "black")
      .text(axisConfig["title"]);
  }
}

function addCurve(svg, data, config) {
  const HALF = 2;
  const x = config["x"];
  const y = config["y"];
  svg
    .append("path")
    .datum(data)
    .attr("fill", config["fill"])
    .attr("stroke", config["stroke"])
    .attr("stroke-width", config["width"])
    .attr(
      "d",
      d3
        .line()
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d[config["X_VAR"]]) + x.bandwidth() / HALF;
        })
        .y(function (d) {
          return y(config["castValueAs"](d[config["Y_VAR"]]));
        })
    );
}

function addArea(svg, data, config) {
  const HALF = 2;
  const x = config["x"];
  const y = config["y"];
  const X_VAR = config["X_VAR"];
  const Y0_VAR = config["Y0_VAR"];
  const Y1_VAR = config["Y1_VAR"];
  svg
    .append("path")
    .datum(data)
    .attr("fill", config["fill"])
    .attr("stroke", config["stroke"])
    .style("opacity", config["opacity"])
    .attr(
      "d",
      d3
        .area()
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d[config["X_VAR"]]) + x.bandwidth() / HALF;
        })
        .y0(function (d) {
          return y(config["castValueAs"](d[config["Y0_VAR"]]));
        })
        .y1(function (d) {
          return y(config["castValueAs"](d[config["Y1_VAR"]]));
        })
    );

  if (config["boldOutline"]) {
    // Upper curve line
    addCurve(svg, data, {
      x: x,
      y: y,
      fill: "none",
      stroke: config["lineColor"],
      width: config["width"],
      X_VAR: X_VAR,
      Y_VAR: Y0_VAR,
      castValueAs: parseFloat,
    });
    // Lower curve line
    addCurve(svg, data, {
      x: x,
      y: y,
      fill: "none",
      stroke: config["lineColor"],
      width: config["width"],
      X_VAR: X_VAR,
      Y_VAR: Y1_VAR,
      castValueAs: parseFloat,
    });
  }
}

// Plot helpers
export { getTooltip };

// Plot components
export { addCurve, addArea, addLegend };

// Plot binding functions
export { bindAxis };

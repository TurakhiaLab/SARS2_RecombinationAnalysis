// Utilities for constructing D3 plots

function getTooltip(divID, config) {
  const tooltip = d3
    .select(divID)
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .attr("id", "tooltip")
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

  const CX_VAR = config["legendCX"];
  const CY_VAR = config["legendCY"];
  const X_ATTR_VAR = config["legendXAttr"];
  const Y_ATTR_VAR = config["legendYAttr"];
  const FONT_SIZE = config["legendFontSize"];

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

function bindYAxis(svg, axisConfig) {
  svg
    .append("g")
    .call(axisConfig["axis"])
    .style("font-size", axisConfig["font-size"])
    .append("text")
    .attr("transform", axisConfig["transform"])
    .attr("x", axisConfig["x"])
    .attr("y", axisConfig["y"])
    .attr("dominant-baseline", axisConfig["dominant-baseline"])
    .style("fill", axisConfig["fill"]);

  if (axisConfig["title"]) {
    const titleConfig = axisConfig["titleConfig"];
    svg
      .append("text")
      .attr("text-anchor", titleConfig["text-anchor"])
      .attr("x", titleConfig["x"])
      .attr("y", titleConfig["y"])
      .attr("dy", titleConfig["dy"])
      .style("font-size", titleConfig["font-size"])
      .attr("transform", titleConfig["transform"])
      .style("fill", titleConfig["fill"])
      .text(titleConfig["text"]);
  }
}

function bindDataAxis(svg, axisConfig) {
  svg
    .append("g")
    .attr("transform", axisConfig["transform"])
    .data(axisConfig["data"])
    .call(axisConfig["axis"])
    .style("font-size", axisConfig["font-size"]);

  if (axisConfig["labels"]) {
    svg
      .selectAll("text")
      .style("text-anchor", axisConfig["text-anchor"])
      .attr("dx", axisConfig["dx"])
      .attr("dy", axisConfig["dy"])
      .attr("transform", axisConfig["transform-text"]);
  }

  if (axisConfig["title"]) {
    const titleConfig = axisConfig["titleConfig"];
    const X = titleConfig["x"];
    const Y = titleConfig["y"];
    const width = axisConfig["width"];
    const height = axisConfig["height"];
    // Add x-axis title
    svg
      .append("text")
      .attr("text-anchor", titleConfig["text-anchor"])
      .attr("x", width / X)
      .attr("y", height + Y)
      .attr("dx", titleConfig["dx"])
      .style("font-size", titleConfig["font-size"])
      .style("fill", titleConfig["fill"])
      .text(titleConfig["text"]);
  }
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
    .attr("dominant-baseline", axisConfig["dominant-baseline"])
    .style("fill", axisConfig["fill"])
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
        .curve(d3.curveLinear)
        .x(function (d) {
          return x(d[config["X_VAR"]]) + x.bandwidth() / HALF;
        })
        .y(function (d) {
          return y(config["castValueAs"](d[config["Y_VAR"]]));
        }),
    );
}

function addLine(svg, config) {
  svg
    .append("g")
    .attr("transform", "translate(0, " + config["translate"] + ")")
    .append("line")
    .attr("x2", config["width"])
    .style("stroke", config["stroke"])
    .style("stroke-dasharray", config["stroke-dasharray"])
    .style("stroke-width", config["stroke-width"]);
}

function addVerticalLine(svg, config) {
  svg
    .append("line")
    .attr("x1", config["x1"])
    .attr("y1", config["y1"])
    .attr("x2", config["x2"])
    .attr("y2", config["y2"])
    .style("stroke", config["stroke"])
    .style("stroke-dasharray", config["stroke-dasharray"])
    .style("stroke-width", config["stroke-width"]);
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
        }),
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
export { addCurve, addLine, addVerticalLine, addArea, addLegend };

// Plot binding functions
export { bindAxis, bindYAxis, bindDataAxis };

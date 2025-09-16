import { sum } from "./util.js";

import {
  extractPos,
  extractSNVChar,
  getBarColor,
  TrackComponentType,
  isAcceptor,
  isDonor,
} from "./trackUtil.js";

// Plot dimension constants
const TRACK_WIDTH = 3500;
const BORDER_HEIGHT = 500;
const OUTER_BUFFER = 50;
const TRACK_X_POS = 100;
const BUFFER_BTW_TRACKS = 5;
const FIXED_SQUARE_DIM = 20;
const RIGHT_SIDE_BUFFER = 20;
const BASE_TEXT_SIZE = 15;
// Start y position of the plot
const STARTING_Y = 300;
// Space in-between each track
const TRACK_BUFFER = 100;
const FITNESS_PLOT_HEIGHT = 100;

function fitnessHist(svg, data, fitnessContext, trackConfig) {
  delete data["columns"];
  // TODO: MOVE TO track.js
  const X_VAR = "Nt_Mutation";
  const Y_VAR = "PyRO_Score";
  const TRACK_TYPE = fitnessContext["TRACK_TYPE"];

  // Track Constants
  const X_POS = fitnessContext["STARTING_X_POS"];
  const Y_POS = fitnessContext["STARTING_Y_POS"];
  const BUFFER_BTW_TRACKS = fitnessContext["BUFFER_BTW_TRACKS"];
  const SQUARE_DIM = fitnessContext["FIXED_SQUARE_DIM"];

  // Track data
  const positions = fitnessContext["POSITIONS"];
  const scores = fitnessContext["FITNESS_DATA"];
  const siteInfo = fitnessContext["SITE_INFO"];

  // All sites across all tracks
  const allSites = fitnessContext["ALL_SITES"];
  const numSNPS = allSites.length;

  const informativeSites = fitnessContext["INFORMATIVE_SITES"];

  const axisWidth =
    numSNPS * SQUARE_DIM + (numSNPS - 1) * BUFFER_BTW_TRACKS + X_POS;
  const CENTER = (Y_POS - BUFFER_BTW_TRACKS + TRACK_BUFFER) / 2;
  const axisShift = Y_POS + TRACK_BUFFER;

  // Define axes
  // Add 10% padding in-between bars
  const x = d3
    .scaleBand()
    .domain(allSites)
    .range([X_POS, axisWidth])
    .paddingInner(0.1);

  const MAX = d3.max(scores);
  const MIN = d3.min(scores);

  const FIXED_Y_MAX = 0.16;
  const FIXED_Y_MIN = -0.16;
  if (MAX >= FIXED_Y_MAX || MIN <= FIXED_Y_MIN) {
    alert("ERROR SCORES ARE OUTSIDE FIXED RANGE!");
    console.log("ERROR SCORES ARE OUTSIDE FIXED RANGE!");
  }

  const y = d3
    .scaleLinear()
    .domain([FIXED_Y_MAX, FIXED_Y_MIN])
    .range([Y_POS, axisShift]);

  const xAxis = d3.axisBottom(x).tickSize(0);

  const yAxis = d3.axisLeft(y).tickSizeOuter(0).ticks(5);
  svg.append("g").attr("transform", `translate(${X_POS},0)`).call(yAxis);

  svg
    .selectAll("bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x(extractPos(d[X_VAR]));
    })
    .attr("y", function (d) {
      let rawScore = d[Y_VAR];
      if (!rawScore) {
        return y(0.0);
      }
      if (rawScore.includes(",")) {
        let splitScores = rawScore.split(",");
        let aggregateScore = sum(splitScores.map(parseFloat));
        return y(aggregateScore);
      }

      let score = parseFloat(d[Y_VAR]);
      if (score >= 0) {
        //  Non-coding mutations are neutral
        return y(score);
      } else {
        return y(0.0);
      }
    })
    .attr("width", x.bandwidth())
    .attr("height", function (d) {
      let scores = d[Y_VAR];
      if (!scores || scores === "N/A") {
        return Math.abs(y(0.0) - y(0.0));
      }
      if (scores.includes(",")) {
        let splitScores = scores.split(",");
        let aggregateScore = sum(splitScores.map(parseFloat));
        return Math.abs(y(0) - y(aggregateScore));
      }
      return Math.abs(y(scores) - y(0));
    })
    .attr("fill", function (d) {
      let rawScores = d[Y_VAR];
      let aggregateScore;
      if (rawScores.includes(",")) {
        let splitScores = rawScores.split(",");
        aggregateScore = sum(splitScores.map(parseFloat));
      } else {
        aggregateScore = rawScores;
      }
      const pos = extractPos(d[X_VAR]);
      return getBarColor(
        pos,
        trackConfig,
        TRACK_TYPE,
        informativeSites,
        aggregateScore,
      );
    });
  const xAxisGroup = svg
    .append("g")
    .style("fill", "black")
    .attr("transform", `translate(0,${y(0)})`)
    .call(xAxis);
  xAxisGroup.selectAll("text").remove();
}

export { fitnessHist };

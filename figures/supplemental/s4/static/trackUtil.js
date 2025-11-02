import { csvToArray, sum } from "./util.js";

const TRACK_BUFFER = 100;
// Plot coloring
const BREAKPOINT_COLOR = "#333333";
const INFORMATIVE_NOT_INCLUDED_COLOR = "#333333";
const ACCEPTOR_COLOR = "#2879c0";
const DONOR_COLOR = "#f9521e";
const BACKGROUND_COLOR = "#999999";
const POSITIVE_FITNESS_COLOR = "#018749";
const NEGATIVE_FITNESS_COLOR = "#8B0000";

const Breakpoints = {
  SINGLE: 1,
  MULTIPLE: 2,
};

const TrackComponentType = {
  BASE: 0,
  FITNESS_BAR: 1,
};

// TODO: move to util
function extractSNVChar(aString) {
  if (!aString) {
    return;
  }
  return aString.at(-1);
}

function extractPos(aString) {
  return parseInt(aString.substring(1, aString.length - 1));
}

function isDonor(trackType) {
  return trackType === "donor";
}

function isAcceptor(trackType) {
  return trackType === "acceptor";
}

function singleBreakpoint(
  pos,
  trackConfig,
  trackType,
  informativeSites,
  score,
) {
  // Breakpoint info
  const BREAKPOINT1_START = parseInt(trackConfig["BREAKPOINT1_START"]);
  const BREAKPOINT1_END = parseInt(trackConfig["BREAKPOINT1_END"]);
  if (isAcceptor(trackType)) {
    // Color based on fitness affect if informative position outside breakpoint
    // interval
    if (pos < BREAKPOINT1_START && informativeSites.includes(pos)) {
      if (score > 0) {
        return POSITIVE_FITNESS_COLOR;
      } else {
        return NEGATIVE_FITNESS_COLOR;
      }
    } else {
      return BACKGROUND_COLOR;
    }
  }
  // Otherwise track is donor track
  else if (isDonor(trackType)) {
    if (pos >= BREAKPOINT1_END && informativeSites.includes(pos)) {
      if (score > 0) {
        return POSITIVE_FITNESS_COLOR;
      } else {
        return NEGATIVE_FITNESS_COLOR;
      }
    } else {
      return BACKGROUND_COLOR;
    }
  }
}

function multipleBreakpoints(
  pos,
  trackConfig,
  trackType,
  informativeSites,
  score,
) {
  // Breakpoint info
  const BREAKPOINT1_START = parseInt(trackConfig["BREAKPOINT1_START"]);
  const BREAKPOINT1_END = parseInt(trackConfig["BREAKPOINT1_END"]);
  const BREAKPOINT2_START = parseInt(trackConfig["BREAKPOINT2_START"]);
  const BREAKPOINT2_END = parseInt(trackConfig["BREAKPOINT2_END"]);
  if (isAcceptor(trackType)) {
    // Color based on fitness affect if informative position outside breakpoint
    // interval
    if (
      (pos < BREAKPOINT1_START || pos > BREAKPOINT2_END) &&
      informativeSites.includes(pos)
    ) {
      if (score > 0) {
        return POSITIVE_FITNESS_COLOR;
      } else {
        return NEGATIVE_FITNESS_COLOR;
      }
    } else {
      return BACKGROUND_COLOR;
    }
  }
  // Otherwise track is donor track
  else if (isDonor(trackType)) {
    if (
      pos > BREAKPOINT1_END &&
      pos < BREAKPOINT2_START &&
      informativeSites.includes(pos)
    ) {
      if (score > 0) {
        return POSITIVE_FITNESS_COLOR;
      } else {
        return NEGATIVE_FITNESS_COLOR;
      }
    } else {
      return BACKGROUND_COLOR;
    }
  }
}

function getBarColor(pos, trackConfig, trackType, informativeSites, score) {
  const numBreakpoints = trackConfig["NUM_BREAKPOINTS"];
  if (numBreakpoints == Breakpoints.SINGLE) {
    return singleBreakpoint(
      pos,
      trackConfig,
      trackType,
      informativeSites,
      score,
    );
  } else if (numBreakpoints == Breakpoints.MULTIPLE) {
    return multipleBreakpoints(
      pos,
      trackConfig,
      trackType,
      informativeSites,
      score,
    );
  }
  // Error
  else {
    console.log("Error, improper track type.");
    alert("Error, improper track type.");
  }
}

function getBaseColorSingleBP(pos, trackConfig, trackType, informativeSites) {
  // Breakpoint info
  const BREAKPOINT1_START = parseInt(trackConfig["BREAKPOINT1_START"]);
  const BREAKPOINT1_END = parseInt(trackConfig["BREAKPOINT1_END"]);
  if (isAcceptor(trackType)) {
    if (pos < BREAKPOINT1_START && informativeSites.includes(pos)) {
      return ACCEPTOR_COLOR;
    }
    // Informative site, not passed to recombinant
    else if (informativeSites.includes(pos)) {
      return INFORMATIVE_NOT_INCLUDED_COLOR;
    } else {
      return BACKGROUND_COLOR;
    }
  }
  // Otherwise track is donor track
  else if (isDonor(trackType)) {
    if (pos >= BREAKPOINT1_END && informativeSites.includes(pos)) {
      return DONOR_COLOR;
    }
    // Informative site, not passed to recombinant
    else if (informativeSites.includes(pos)) {
      return INFORMATIVE_NOT_INCLUDED_COLOR;
    } else {
      return BACKGROUND_COLOR;
    }
  }
  // Error
  else {
    console.log("Error, improper track type.");
    alert("Error, improper track type.");
  }
}

function getBaseColorMultipleBP(pos, trackConfig, trackType, informativeSites) {
  // Breakpoint info
  const BREAKPOINT1_START = parseInt(trackConfig["BREAKPOINT1_START"]);
  const BREAKPOINT1_END = parseInt(trackConfig["BREAKPOINT1_END"]);
  const BREAKPOINT2_START = parseInt(trackConfig["BREAKPOINT2_START"]);
  const BREAKPOINT2_END = parseInt(trackConfig["BREAKPOINT2_END"]);
  if (isAcceptor(trackType)) {
    if (
      (pos < BREAKPOINT1_START || pos > BREAKPOINT2_END) &&
      informativeSites.includes(pos)
    ) {
      return ACCEPTOR_COLOR;
    }
    // Informative site, not passed to recombinant
    else if (informativeSites.includes(pos)) {
      return INFORMATIVE_NOT_INCLUDED_COLOR;
    } else {
      return BACKGROUND_COLOR;
    }
  }
  // Otherwise track is donor track
  else if (isDonor(trackType)) {
    if (
      pos > BREAKPOINT1_END &&
      pos < BREAKPOINT2_START &&
      informativeSites.includes(pos)
    ) {
      return DONOR_COLOR;
    }
    // Informative site, not passed to recombinant
    else if (informativeSites.includes(pos)) {
      return INFORMATIVE_NOT_INCLUDED_COLOR;
    } else {
      return BACKGROUND_COLOR;
    }
  }
  // Error
  else {
    console.log("Error, improper track type.");
    alert("Error, improper track type.");
  }
}

// TODO: Refactor with getBarColor above, combine functions
function getBaseColor(pos, trackConfig, trackType, informativeSites) {
  const numBreakpoints = trackConfig["NUM_BREAKPOINTS"];
  if (numBreakpoints == Breakpoints.SINGLE) {
    return getBaseColorSingleBP(pos, trackConfig, trackType, informativeSites);
  } else if (numBreakpoints == Breakpoints.MULTIPLE) {
    return getBaseColorMultipleBP(
      pos,
      trackConfig,
      trackType,
      informativeSites,
    );
  }
  // Error
  else {
    console.log("Error, improper track type.");
    alert("Error, improper track type.");
  }
}

// TODO: Generalize
function getSNPData(data) {
  let snps = [];
  let positions = [];
  let HEADER_LINE_COUNT = 0;
  let posToMutation = new Map();
  let siteToSNP = new Map();
  let siteToInfo = new Map();
  // Get snps
  for (const [key, value] of Object.entries(data)) {
    // Skip over TSV header, if exists
    if (Array.isArray(value)) {
      ++HEADER_LINE_COUNT;
      continue;
    }
    // TODO: Add these to config
    const pos = extractPos(value["Nt_Mutation"]);
    const nt = extractSNVChar(value["Nt_Mutation"]);
    const mutation = value["Amino_Acid_Mutation"];
    const rawScore = value["PyRO_Score"];
    let score;
    if (!rawScore) {
      score = 0.0;
    } else {
      score = parseFloat(rawScore);
    }
    if (!nt) {
      console.log("NOT KEY: ", value);
      console.log("NOT VALUE: ", value);
    }
    snps.push(nt);
    positions.push(pos);
    posToMutation.set(pos, mutation);
    siteToSNP.set(pos, nt);
    const info = {
      SNP: nt,
      AA: mutation,
      Score: score,
    };
    siteToInfo.set(pos, info);
  }
  console.log("Number of header lines contained in file: ", HEADER_LINE_COUNT);
  const numSNPS = Object.keys(data).length - HEADER_LINE_COUNT;
  console.assert(numSNPS == snps.length);
  return [snps, positions, posToMutation, siteToSNP, siteToInfo];
}

function ABStringColor(char) {
  return char === "B" ? ACCEPTOR_COLOR : DONOR_COLOR;
}

function getABStringColorMap(informativeSites, ab_string) {
  console.assert(informativeSites.length == ab_string.length);
  let map = new Map();
  informativeSites.forEach((site, index) => {
    console.log("site: ", site);
    console.log("index: ", index);
    let char = ab_string[index];
    console.log("Char: ", char);
    const color = ABStringColor(char);
    console.log("Color: ", color);
    map.set(site, color);
  });
  return map;
}

function initTrack(svg, data, trackContext, trackConfig) {
  delete data["columns"];
  // TODO: MOVE TO track.js
  const X_VAR = "Nt_Mutation";
  const Y_VAR = "PyRO_Score";

  // Track Constants
  const X_POS = trackContext["STARTING_X_POS"];
  const Y_POS = trackContext["STARTING_Y_POS"];
  const BUFFER_BTW_TRACKS = trackContext["BUFFER_BTW_TRACKS"];
  const SQUARE_DIM = trackContext["FIXED_SQUARE_DIM"];
  const HALF_SQUARE = SQUARE_DIM / 2;

  const TRACK_TYPE = trackContext["TRACK_TYPE"];
  const informativeSites = trackContext["INFORMATIVE_SITES"];
  const ab_string = trackConfig["AB_STRING"];
  console.log("AB STRING: ", ab_string);

  //const abStringColorMap = getABStringColorMap(informativeSites, ab_string);
  console.log("Informative sites (inside initTrack): ", informativeSites);

  // Track data
  // const positions = trackContext["POSITIONS"];
  const siteInfo = trackContext["SITE_INFO"];

  // All sites across all tracks
  const allSites = trackContext["ALL_SITES"];
  const numSNPS = allSites.length;

  console.log("All sites: ", allSites);
  // console.log("positions : ", positions);

  const axisWidth =
    numSNPS * SQUARE_DIM + (numSNPS - 1) * BUFFER_BTW_TRACKS + X_POS;
  const CENTER = (Y_POS - BUFFER_BTW_TRACKS + TRACK_BUFFER) / 2;
  const axisShift = Y_POS + 25; // + TRACK_BUFFER;

  // Define axes
  // Add 10% padding in-between bars
  const x = d3
    .scaleBand()
    .domain(allSites)
    .range([X_POS, axisWidth])
    .paddingInner(0.1);

  /*
  const MAX = d3.max(scores);
  const MIN = d3.min(scores);
  const STD_DEV = d3.deviation(scores);
  // console.log('MAX SCORE: ', MAX);
  // console.log('MIN SCORE: ', MIN);
  // console.log('STD DEV SCORE: ', STD_DEV);
  */

  const y = d3.scaleLinear().domain([1, 0]).range([Y_POS, axisShift]);
  const xAxis = d3.axisBottom(x).tickSize(0);

  svg
    .selectAll("bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x(extractPos(d[X_VAR]));
    })
    .attr("y", function (d) {
      return y(1);
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
        // Non-coding mutations are neutral
        return y(score);
      } else {
        return y(0.0);
      }
    })
    .attr("width", x.bandwidth())
    .attr("height", function (d) {
      return y(0) - y(1);
      let scores = d[Y_VAR];
      if (scores.includes(",")) {
        let splitScores = scores.split(",");
        let aggregateScore = sum(splitScores.map(parseFloat));
        return Math.abs(y(0) - y(aggregateScore));
      }
      return Math.abs(y(scores) - y(0));
    })
    .attr("fill", function (d) {
      const pos = extractPos(d[X_VAR]);
      // OLD WAY, working
      return getBaseColor(pos, trackConfig, TRACK_TYPE, informativeSites);
      // New way uses AB string to determine if site matches only donor or acceptor
      if (!abStringColorMap.has(pos)) {
        console.alert("AB String Color map doesn't have requested site");
      }
      return abStringColorMap.get(pos);
    });

  svg
    .selectAll("rectText")
    .data(data)
    .enter()
    .append("text")
    .attr("x", function (d) {
      return x(extractPos(d[X_VAR])) + x.bandwidth() / 2;
    }) // + LEFT_SHIFT)
    .attr("y", Y_POS + HALF_SQUARE)
    .text(function (d) {
      return extractSNVChar(d[X_VAR]);
    })
    // Center text char in square
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .style("fill", "white")
    .style("font-size", trackContext["BASE_TEXT_SIZE"]);
}

function addPositionLabels(svg, trackContext) {
  const snp_positions = trackContext["POSITIONS"];
  const numSNPS = snp_positions.length;
  const X_POS = trackContext["STARTING_X_POS"];
  const Y_POS = trackContext["STARTING_Y_POS"];
  const BUFFER_BTW_TRACKS = trackContext["BUFFER_BTW_TRACKS"];

  const axisWidth =
    numSNPS * trackContext["FIXED_SQUARE_DIM"] +
    (numSNPS - 1) * BUFFER_BTW_TRACKS +
    X_POS;

  const x = d3.scaleBand().domain(snp_positions).range([X_POS, axisWidth]);
  const xAxis = d3.axisBottom(x).tickSizeOuter(0);

  svg
    .append("g")
    .attr("class", "TopAxis")
    .data([snp_positions])
    .attr("transform", `translate(0,${Y_POS - BUFFER_BTW_TRACKS})`)
    .call(xAxis)
    .selectAll("text")
    .attr("dx", "-2.0em")
    .attr("dy", ".2em")
    .style("font-size", "15px")
    .attr("transform", "rotate(-65)");
  svg.selectAll(".topAxis path").style("stroke", "#FFFFFF");
}

function addMutationLabels(svg, trackContext) {
  const positions = trackContext["ALL_SITES"];
  const numSNPS = positions.length;
  const mutations = trackContext["MUTATIONS"];
  const X_POS = trackContext["STARTING_X_POS"];
  const Y_POS = trackContext["STARTING_Y_POS"];
  const BUFFER_BTW_TRACKS = trackContext["BUFFER_BTW_TRACKS"];

  const axisWidth =
    numSNPS * trackContext["FIXED_SQUARE_DIM"] +
    (numSNPS - 1) * BUFFER_BTW_TRACKS +
    X_POS;

  const LEFT_SHIFT = 4.569247546346782;

  // Define axes
  const x = d3.scaleBand().domain(positions).range([X_POS, axisWidth]);

  const xAxis = d3
    .axisTop(x)
    .tickSizeOuter(0)
    .tickValues(positions)
    .tickFormat(function (d) {
      return mutations.get(d);
    });

  svg
    .append("g")
    .attr("class", "TopAxis")
    .attr("transform", `translate(0,${Y_POS - BUFFER_BTW_TRACKS})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "start")
    .attr("dx", "1em")
    .attr("dy", ".2em")
    .style("font-size", "15px")
    .attr("transform", "rotate(-65)");
  svg.selectAll(".topAxis path").style("stroke", "#FFFFFF");
}

export { TrackComponentType };

// Functions
export {
  initTrack,
  addPositionLabels,
  extractSNVChar,
  extractPos,
  getSNPData,
  addMutationLabels,
  getBarColor,
  isAcceptor,
  isDonor,
};

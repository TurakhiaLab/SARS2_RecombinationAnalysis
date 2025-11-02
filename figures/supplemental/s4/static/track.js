import { csvToArray, replaceNaNwithZero, union } from "./util.js";
import { fitnessHist } from "./fitnessHist.js";
import {
  addMutationLabels,
  addPositionLabels,
  extractPos,
  extractSNVChar,
  getSNPData,
  initTrack,
} from "./trackUtil.js";

async function track(svg, donorDataFile, acceptorDataFile, config) {
  // Constants
  const BORDER_HEIGHT = 2000;
  const OUTER_BUFFER = 50;
  const TRACK_X_POS = 100;
  const BUFFER_BTW_TRACKS = 5;
  const FIXED_SQUARE_DIM = 20;
  const RIGHT_SIDE_BUFFER = 20;
  const BASE_TEXT_SIZE = 15;
  // Start y position of the plot
  const STARTING_Y = 300;
  const FITNESS_TRACK_BUFFER = 10;
  const BETWEEN_TRACK_BUFFER = 300;
  const POSITION_BUFFER = 150;
  const Y_VAR = "PyRO_Score";

  // Plot Dimensions
  const margin = config["margin"];
  const width = config["width"];
  const height = config["height"];

  let y_position = STARTING_Y;
  let yPosUpdated = y_position;

  const informativeSitesFile = config["INFORMATIVE_SITES"];
  const donorData = await d3.tsv(donorDataFile);
  const acceptorData = await d3.tsv(acceptorDataFile);
  const informativeSitesData = await d3.tsv(informativeSitesFile);

  const informativeSites = csvToArray(informativeSitesData, "Sites", parseInt);
  let donorFitnessScores = csvToArray(donorData, Y_VAR, parseFloat);
  replaceNaNwithZero(donorFitnessScores);
  let acceptorFitnessScores = csvToArray(acceptorData, Y_VAR, parseFloat);
  replaceNaNwithZero(acceptorFitnessScores);

  //console.log("DONOR DATA: ", donorData);
  //console.log("ACCEPTOR DATA: ", acceptorData);
  //console.log("Informative sites: ", informativeSites);

  // Get donor/acceptor SNV information
  const [
    donor_snps,
    donor_positions,
    donor_mutations,
    donorSiteToSNP,
    donorSiteToInfo,
  ] = getSNPData(donorData);

  const [
    acceptor_snps,
    acceptor_positions,
    acceptor_mutations,
    acceptorSiteToSNP,
    acceptorSiteToInfo,
  ] = getSNPData(acceptorData);

  const allUnsortedSites = union(donor_positions, acceptor_positions);
  //console.log("Unsorted sites: ", allUnsortedSites);
  //console.log("Donor positions: ", donor_positions);
  //console.log("Acceptor positions: ", acceptor_positions);


  // Sort sites in ascending order
  const allSites = union(donor_positions, acceptor_positions).sort(
    (a, b) => a - b,
  );
  const numSNPS = allSites.length;

  // Compute track width
  const TRACK_WIDTH =
    BUFFER_BTW_TRACKS * (numSNPS - 1) + numSNPS * FIXED_SQUARE_DIM;

  const X = d3.scaleBand().domain(allSites).range([TRACK_X_POS, TRACK_WIDTH]);

  // Add acceptor track first
  svg
    .append("rect")
    .attr("x", TRACK_X_POS)
    .attr("y", y_position - BUFFER_BTW_TRACKS)
    .attr("width", TRACK_WIDTH)
    .attr("height", FIXED_SQUARE_DIM)
    .attr("stroke-width", 2)
    .attr("fill", "#FFFFFF");

  const acceptorTrackContext = {
    // Track data
    SNPS: acceptorSiteToSNP,
    POSITIONS: acceptor_positions,
    ALL_SITES: allSites,
    INFORMATIVE_SITES: informativeSites,
    AB_STRING: config['AB_STRING'],

    TRACK_TYPE: "acceptor",
    // Track coordinate settings
    BUFFER_BTW_TRACKS: BUFFER_BTW_TRACKS,
    BASE_TEXT_SIZE: BASE_TEXT_SIZE,
    STARTING_X_POS: TRACK_X_POS,
    STARTING_Y_POS: yPosUpdated - BUFFER_BTW_TRACKS,
    FIXED_SQUARE_DIM: FIXED_SQUARE_DIM,
  };
  // Add acceptor track
  initTrack(svg, acceptorData, acceptorTrackContext, config);

  const acceptorMutationContext = {
    // Axis data
    ALL_SITES: allSites,
    MUTATIONS: acceptor_mutations,

    // Axis settings
    FIXED_SQUARE_DIM: FIXED_SQUARE_DIM,
    BUFFER_BTW_TRACKS: BUFFER_BTW_TRACKS,
    STARTING_X_POS: TRACK_X_POS,
    STARTING_Y_POS: yPosUpdated - BUFFER_BTW_TRACKS,
  };
  addMutationLabels(svg, acceptorMutationContext);

  // Add tracks below
  yPosUpdated += FIXED_SQUARE_DIM + BUFFER_BTW_TRACKS;

  const acceptorFitnessContext = {
    // Plot data
    FITNESS_DATA: acceptorFitnessScores,
    ALL_SITES: allSites,
    SITE_INFO: acceptorSiteToInfo,
    INFORMATIVE_SITES: informativeSites,
    TRACK_TYPE: "acceptor",
    // Plot settings
    POSITIONS: acceptor_positions,
    STARTING_X_POS: TRACK_X_POS,
    STARTING_Y_POS: yPosUpdated - BUFFER_BTW_TRACKS + FITNESS_TRACK_BUFFER,
    BUFFER_BTW_TRACKS: BUFFER_BTW_TRACKS,
    FIXED_SQUARE_DIM: FIXED_SQUARE_DIM,
  };
  fitnessHist(svg, acceptorData, acceptorFitnessContext, config);

  // Add tracks below
  yPosUpdated += BETWEEN_TRACK_BUFFER;

  const donorTrackContext = {
    // Track data
    SNPS: donorSiteToSNP,
    POSITIONS: donor_positions,
    ALL_SITES: allSites,
    X_SCALE: X,
    TRACK_WIDTH: TRACK_WIDTH,
    INFORMATIVE_SITES: informativeSites,
    AB_STRING: config['AB_STRING'],

    // Track coordinate settings
    TRACK_TYPE: "donor",
    BUFFER_BTW_TRACKS: BUFFER_BTW_TRACKS,
    BASE_TEXT_SIZE: BASE_TEXT_SIZE,
    STARTING_X_POS: TRACK_X_POS,
    STARTING_Y_POS: yPosUpdated - BUFFER_BTW_TRACKS,
    FIXED_SQUARE_DIM: FIXED_SQUARE_DIM,
  };

  // Add donor track
  initTrack(svg, donorData, donorTrackContext, config);

  const donorMutationContext = {
    // Axis data
    ALL_SITES: allSites,
    MUTATIONS: donor_mutations,

    // Axis settings
    FIXED_SQUARE_DIM: FIXED_SQUARE_DIM,
    BUFFER_BTW_TRACKS: BUFFER_BTW_TRACKS,
    STARTING_X_POS: TRACK_X_POS,
    STARTING_Y_POS: yPosUpdated - BUFFER_BTW_TRACKS,
  };

  addMutationLabels(svg, donorMutationContext);

  // Add tracks below
  yPosUpdated += FIXED_SQUARE_DIM + BUFFER_BTW_TRACKS;

  // Add fitness bar plot here
  const donorFitnessContext = {
    // Plot data
    FITNESS_DATA: donorFitnessScores,
    ALL_SITES: allSites,
    SITE_INFO: donorSiteToInfo,
    INFORMATIVE_SITES: informativeSites,
    TRACK_TYPE: "donor",

    // Plot settings
    POSITIONS: donor_positions,
    STARTING_X_POS: TRACK_X_POS,
    STARTING_Y_POS: yPosUpdated - BUFFER_BTW_TRACKS + FITNESS_TRACK_BUFFER,
    BUFFER_BTW_TRACKS: BUFFER_BTW_TRACKS,
    FIXED_SQUARE_DIM: FIXED_SQUARE_DIM,
  };

  fitnessHist(svg, donorData, donorFitnessContext, config);

  const positionsAxisContext = {
    POSITIONS: allSites,
    FIXED_SQUARE_DIM: FIXED_SQUARE_DIM,
    BUFFER_BTW_TRACKS: BUFFER_BTW_TRACKS,
    STARTING_X_POS: TRACK_X_POS,
    STARTING_Y_POS: yPosUpdated - BUFFER_BTW_TRACKS + POSITION_BUFFER,
  };

  addPositionLabels(svg, positionsAxisContext);
  return svg;
}
export { track };

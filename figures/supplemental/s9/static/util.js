// Utility Constants and Functions

// Constants
const YEARS = ["2020", "2021", "2022", "2023"];
const MONTHS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];
const QUARTERS = ["01", "02", "03", "04"];

function getMonth(month) {
  return MONTHS[parseInt(month)];
}

function roundTo(num, places) {
  const factor = Math.pow(10, places);
  return Math.round(num * factor) / factor;
}

function roundUpTo(num, places) {
  const multiplier = Math.pow(10, places);
  return Math.ceil(num * multiplier) / multiplier;
}

function max(arr) {
  return arr.reduce(
    (accumulator, currentValue) => Math.max(accumulator, currentValue),
    Number.NEGATIVE_INFINITY,
  );
}

// TODO: Remove the svg parameter, not needed
// TODO: Refactor function, clean up and commit.
function downloadSVG(svg, filename) {
  const svgElement = document.querySelector("svg");
  const svgElementClone = svgElement.cloneNode(true);

  const originalElements = svgElement.querySelectorAll("*");
  const clonedElements = svgElement.querySelectorAll("*");

  //const originalElements = [svgElement, ...svgElement.querySelectorAll("*")];
  //const clonedElements = [svgClone, ...svgClone.querySelectorAll("*")];

  originalElements.forEach((element, index) => {
    const allStyle = window.getComputedStyle(element);
    const cloned = clonedElements[index];

    for (const style of allStyle) {
      cloned.style[style] = allStyle.getPropertyValue(style);
    }
  });

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
  //const svgBlob = new Blob([svgData], {
  //type: "image/svg+xml;charset=utf-8",
  const svgUrl = URL.createObjectURL(svgBlob);

  const downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = filename;
  downloadLink.click();
  URL.revokeObjectURL(svgUrl);

  /*
  console.log("Downloading svg file");
  const svgElement = document.querySelector("svg");
  const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = filename;
  downloadLink.click();
  URL.revokeObjectURL(svgUrl);
  */
}

// Assuming start and end year on same month
function calcNumMonths(startYear, endYear) {
  return endYear.getFullYear() - startYear.getFullYear();
}

function getMonthsCollectionTest(start_month, end_month) {
  const startDate = new Date(start_month);
  const endDate = new Date(end_month);
  const numMonths = calcNumMonths(startDate, endDate);
  console.log("START Date: ", startDate);
  console.log("END Date: ", endDate);
  console.log("Calc num months: ", numMonths);
  let dateFormat = start_month.split("-");
  const [START_YEAR, START_MONTH] = start_month.split("-");
  const [END_YEAR, END_MONTH] = end_month.split("-");
  console.log("START MONTH: ", START_MONTH);
  console.log("START YEAR: ", START_YEAR);
  console.log("END MONTH: ", END_MONTH);
  console.log("END YEAR: ", END_YEAR);

  let testDate = new Date(start_month);
  console.log("Test date: ", testDate);
  let month = getMonth(testDate.getMonth());
  // let month = testDate.getMonth();
  let year = testDate.getFullYear();
  console.log("MONTH: ", month);
  console.log("YEAR: ", year);
  let YEAR_MONTH = year + "-" + month;
  console.log("Concat Year-month: ", YEAR_MONTH);
}

// Fuctions
function getMonthsCollection(end_month) {
  let YEAR_MONTH = [];
  for (let i = 0; i < YEARS.length; ++i) {
    for (let j = 0; j < MONTHS.length; ++j) {
      let interval = YEARS[i] + "-" + MONTHS[j];
      YEAR_MONTH.push(interval);
      if (interval == end_month) {
        return YEAR_MONTH;
      }
    }
  }
}

function minMaxValueFromColumn(arrayOfObjects, columnName, parseAs) {
  let arr = [];
  arrayOfObjects.forEach((object) => {
    arr.push(parseAs(object[columnName]));
  });
  return [Math.min(...arr), Math.max(...arr)];
}

// NOTE: Array pased by reference
function replaceNaNwithZero(array) {
  array.forEach(function (element, index) {
    if (isNaN(element)) {
      array[index] = 0;
    }
  });
}

function sum(array) {
  return array.reduce((aggregate, value) => aggregate + value, 0.0);
}

function union(arrA, arrB) {
  return [...new Set([...arrA, ...arrB])];
}

// TODO: Change to accept variable number of arrays
function csvToArray(data, columnName, castAs) {
  let arr = [];
  for (let i = 0; i < data.length; ++i) {
    arr[i] = castAs(data[i][columnName]);
  }
  return arr;
}

// TODO: Change to accept variable number of key-value pairs
// ie) one pass over data
function csvToMap(data, key, value, castValueAs) {
  // Assumes that key is a string
  let map = new Map();
  for (let i = 0; i < data.length; i++) {
    map.set(data[i][key], castValueAs(data[i][value]));
  }
  return map;
}

function getUniqueValues(data, key) {
  let values = [];
  data.forEach((elem) => {
    const val = elem[key];
    if (!values.includes(val)) {
      values.push(val);
    }
  });
  return values;
}

function ASSERT_EQUAL_ARRAYS(array1, array2) {
  return JSON.stringify(array1) === JSON.stringify(array2);
}

function truncateTo(num, decimalPlaces) {
  if (decimalPlaces == 0) {
    return num;
  }
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.trunc(num * multiplier) / multiplier;
}

function initEmptyBins(min, max, incrementBy, decimalPlaces) {
  const numBins = (max - min) / incrementBy;
  let bins = [];
  let key = incrementBy;
  for (let i = 0; i < numBins; i++) {
    //console.log("Key: ", key.toFixed(decimalPlaces));
    bins.push({ key: key.toFixed(decimalPlaces), value: 0 });
    // TODO: Messy, fix this
    //key = truncateTo(key + incrementBy, decimalPlaces);
    let newKey = key + incrementBy;
    //console.log(newKey.toFixed(2));
    key += incrementBy;
    //key = parseFloat(newKey.toFixed(decimalPlaces));
  }
  console.log("BINS INSIDE initEmptyBins: ", bins);
  return bins;
}

function fillBins(arr, bins) {
  for (let i = 0; i < arr.length; ++i) {
    for (let j = 0; j < bins.length; ++j) {
      const elem = arr[i];
      const curr = bins[j]["key"];
      if (j + 1 == bins.length) {
        bins[j]["value"] += 1;
        break;
      } else {
        if (elem <= curr) {
          bins[j]["value"] += 1;
          break;
        }
      }
    }
  }
}

function bin(arr, min, max, incrementBy, decimalPlaces = 0) {
  let bins = initEmptyBins(min, max, incrementBy, decimalPlaces);
  console.log("Empty bins inside bin function: ", bins);
  fillBins(arr, bins);
  return bins;
}

// Constants
export { YEARS, MONTHS, QUARTERS };
// Functions
export {
  getMonthsCollection,
  getMonthsCollectionTest,
  csvToArray,
  csvToMap,
  getUniqueValues,
  replaceNaNwithZero,
  sum,
  union,
  minMaxValueFromColumn,
  bin,
  downloadSVG,
  roundTo,
  roundUpTo,
  max,
  ASSERT_EQUAL_ARRAYS,
};

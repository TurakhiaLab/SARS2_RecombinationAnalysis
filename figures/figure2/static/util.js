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

function downloadSVG(svg, filename) {
  const svgElement = document.querySelector("svg");
  const svgElementClone = svgElement.cloneNode(true);

  const originalElements = svgElement.querySelectorAll("*");
  const clonedElements = svgElement.querySelectorAll("*");

  originalElements.forEach((element, index) => {
    const allStyle = window.getComputedStyle(element);
    const cloned = clonedElements[index];

    for (const style of allStyle) {
      cloned.style[style] = allStyle.getPropertyValue(style);
    }
  });

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = filename;
  downloadLink.click();
  URL.revokeObjectURL(svgUrl);
}

// Assuming start and end year on same month
function calcNumMonths(startYear, endYear) {
  return endYear.getFullYear() - startYear.getFullYear();
}

function getMonthsCollection(end_month) {
  let YEAR_MONTH = [];
  for (let i = 0; i < YEARS.length; ++i) {
    for (let j = 0; j < MONTHS.length; ++j) {
      let interval = YEARS[i] + "-" + MONTHS[j];
      if (interval === "2020-01") {
        continue;
      }
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

function csvToArray(data, columnName, castAs) {
  let arr = [];
  for (let i = 0; i < data.length; ++i) {
    arr[i] = castAs(data[i][columnName]);
  }
  return arr;
}

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
    bins.push({ key: key.toFixed(decimalPlaces), value: 0 });
    let newKey = key + incrementBy;
    key += incrementBy;
  }
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
  fillBins(arr, bins);
  return bins;
}

// Constants
export { YEARS, MONTHS, QUARTERS };
// Functions
export {
  getMonthsCollection,
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

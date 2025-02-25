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

// TODO: Change to accept variable number of arrays
function csvToArray(data, columnName, castAs) {
  let arr = [];
  for (let i = 0; i < data.length; ++i) {
    arr[i] = castAs(data[i][columnName]);
  }
  return arr;
}

// Constants
export { YEARS, MONTHS, QUARTERS };
// Functions
export { getMonthsCollection, csvToArray };

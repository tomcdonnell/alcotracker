/*
 * Javascript for index.html.
 */

if (document.readyState !== 'loading') {
   main();
} else {
   document.addEventListener('DOMContentLoaded', main);
}

window.alcoDb = null;

function main() {
   window.alcoDb = new AlcoDb();
   _copyDbToHtml();

   const urlParams  = new URLSearchParams(window.location.search);
   const addedRowId = urlParams.get('addedRowId');

   if (addedRowId !== null) {
      const tr = document.getElementById('row-' + addedRowId);

      if (tr !== null) {
         tr.classList.add('added-row');
         window.setTimeout(
            function () {
               tr.classList.remove('added-row');
            },
            1000
         );
      }
   }

   google.charts.load('current', {packages: ['corechart', 'line']});
   google.charts.setOnLoadCallback(_drawChart);
}

function _copyDbToHtml() {
   document.getElementById('main-tbody').innerHTML = window.alcoDb.getRowsAsHtml();
}

function _clearDb() {
   if (confirm('Do you really want to remove all drinks?')) {
      window.alcoDb.clearDb();
      main();
   }
}

function _drawChart() {
   const data     = new google.visualization.DataTable();
   const dataRows = _getDataRows();

   data.addColumn('datetime', 'X'   );
   data.addColumn('number'  , '0.05');

   if (window.alcoDb.getSettingsValue('includeLinesForIndividualDrinks')) {
      for (let rowNo = 0; rowNo < window.alcoDb.getRows().length; ++rowNo) {
         data.addColumn('number', 'Drink' + (rowNo + 1));
      }
   }

   data.addColumn('number', 'Total');
   data.addRows(dataRows);

   let minTime;
   let maxTime;

   if (dataRows.length === 0) {
      const date = new Date();
      minTime = date;
      maxTime = date;
   }
   else {
      minTime = dataRows[0                  ][0];
      maxTime = dataRows[dataRows.length - 1][0];
   }

   const options = {
      hAxis: {
         title: 'Time',
         viewWindow: {
            min: minTime,
            max: maxTime
         }
      },
      vAxis: {
         title: 'Blood Alcohol Percentage'
      },
      backgroundColor: '#f1f8e9'
   };

   const chart = new google.visualization.LineChart(document.getElementById('chart-div'));
   chart.draw(data, options);
}

/*
 * This is just a sample data set involving DateTime values on the horizontal axis.
 * This is useful as a quick way to get a representative chart to display.
 */
function _getDataRowsTest() {
   return [
      // Test data.
      // [dateInclHourAndMin, bacValueDueToDrink1, bacDueToDrink2]
      [new Date(2023, 7, 16, 18,  1), 0.05, 0.000],
      [new Date(2023, 7, 16, 19,  5), 0.05, 0.011],
      [new Date(2023, 7, 16, 20, 10), 0.05, 0.030],
      [new Date(2023, 7, 16, 21,  0), 0.05, 0.052],
      [new Date(2023, 7, 16, 22, 32), 0.05, 0.060],
      [new Date(2023, 7, 16, 23, 54), 0.05, 0.055],
      [new Date(2023, 7, 17,  0, 23), 0.05, 0.062],
      [new Date(2023, 7, 17,  1, 22), 0.05, 0.063],
      [new Date(2023, 7, 17,  2,  9), 0.05, 0.072],
      [new Date(2023, 7, 17,  4, 12), 0.05, 0.071],
      [new Date(2023, 7, 17,  5, 56), 0.05, 0.064],
      [new Date(2023, 7, 17,  6, 45), 0.05, 0.070],
   ];
}

function _getDataRows() {
   const rows = window.alcoDb.getRows();

   if (rows.length === 0) {
      return [];
   }

   const date = new Date();
   const y    = date.getFullYear();
   const m    = date.getMonth();

   const timeOfFirstDrinkHi = rows[0              ].timeHi;
   const timeOfLastDrinkHi  = rows[rows.length - 1].timeHi;
   const hourOfFirstDrink   = Number(timeOfFirstDrinkHi.substr(0, 2));
   const hourOfLastDrink    = Number(timeOfLastDrinkHi.substr(0, 2));
   const startHour          = hourOfFirstDrink;

   // Array drinksData contains an array for each drink.
   // Each drink array contains a BAC value for every 6 minutes from the start of the drinking
   // session, until the bac due to that drink is zero.
   let drinksData = [];

   for (let rowIndex = 0; rowIndex < rows.length; ++rowIndex) {
      const row          = rows[rowIndex];
      const drinkTimeHi  = row.timeHi;
      const nStdDrinks   = row.nStdDrinks;
      const drinkTimeDec = _convertTimeHiToTimeDec(drinkTimeHi);

      let bacValues = [];

      for (let h = startHour;; h = h + 0.1) {
         let bac = null;

         if (h < drinkTimeDec) {
            bac = 0;
         } else {
            const nHoursSinceDrink = h - drinkTimeDec;

            bac = _getBacAtHourDueToDrinkConsumedAtTime(nStdDrinks, nHoursSinceDrink);
         }

         bacValues.push(bac);

         if (h > drinkTimeDec && bac === 0) {
            break;
         }

         if (h > 100) {
            console.error('Breaking to prevent infinite loop (1).')
            break;
         }
      }

      drinksData[rowIndex] = bacValues;
   }

   let dataRows = [];
   let d        = date.getDate();
   let rowNo    = 0;
   let displayH;
   let displayD;

   // Each dataRow will contain a value for each column.
   // Columns will be [dateInclHourAndMin, bacValueDueToDrink1, bacValueDueToDrink2, ...]
   for (let hDec = startHour;; hDec = hDec + 0.1) {
      const h        = Math.trunc(hDec);
      const hourPart = hDec - h;

      displayD = (h < 24)? d: d +  1;
      displayH = (h < 24)? h: h - 24;
      displayM = Math.trunc(hourPart * 60);

      let row            = [new Date(y, m, displayD, displayH, displayM), 0.05];
      let sumBac         = 0;
      let nUndefinedBacs = 0;

      for (const drinkData of drinksData) {
         let bac = drinkData[rowNo];

         if (bac === undefined) {
            bac = 0;
            ++nUndefinedBacs;
         }

         if (window.alcoDb.getSettingsValue('includeLinesForIndividualDrinks')) {
            row.push(bac);
         }

         sumBac += bac;
      }

      row.push(sumBac);

      dataRows.push(row);

      ++rowNo;

      if (rowNo > 1000) {
         console.error('Breaking to prevent infinite loop (2).')
         break;
      }

      // If bacs due to all drinks are undefined, we have reached the end of the data.
      if (nUndefinedBacs === drinksData.length) {
         break;
      }
   }

   return dataRows;
}

/*
 * Formula for calculations is the Widmark formula, described here:
 *  - https://en.wikipedia.org/wiki/Blood_alcohol_content
 */
function _getBacAtHourDueToDrinkConsumedAtTime(nStdDrinks, nHoursSinceDrink) {
   // Mass of alchohol consumed
   //  * Units: kg
   //  * 1 Australian Standard Drink = 10g of alcohol.
   //  * Source: https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide
   const A = nStdDrinks * 0.010;

   // Ratio of body water weight to total weight
   //  * Units: dimensionless (men: 0.68 women: 0.55)
   const r = window.alcoDb.getSettingsValue('ratioWaterWeightToTotalWeight');

   // Body weight
   //  * Units: kg
   const Wt = window.alcoDb.getSettingsValue('bodyWeightKg');

   // Rate at which alchohol is metabolised
   //  * Units: /hr
   //  * 0.00017
   const B = 0.017;

   // Time since consumption
   //  * Units: hrs
   const T = nHoursSinceDrink;

   let bac = ((A / (r * Wt)) * 100) - (B * T); // Units (kg / (kg)) - (/hr * hr) - Dimensionless.

   if (bac < 0) {
      bac = 0;
   }

   return bac;
}

function _convertTimeHiToTimeDec(drinkTimeHi) {
   const h = Number(drinkTimeHi[0] + drinkTimeHi[1]);
   const m = Number(drinkTimeHi[3] + drinkTimeHi[4]);

   return h + (m / 60);
}

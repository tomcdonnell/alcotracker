/*
 * Common file for AlcoTracker pages.
 */

function AlcoDb() {
   // Public functions //////////////////////////////////////////////////////////////////////////

   this.clearDb = function () {
      db = null;
      window.localStorage.setItem('alcotracker.db', db);
      _init();
   };

   this.addDrinkAtTime = function (drinkDesc, nStdDrinks, timeHi) {
      // TODO: Deal with problem of drink after 12am being interpreted as earlier than 11pm drink.

      db.rows.push(
         {
            id        : db.nextInsertId,
            drinkDesc : drinkDesc      ,
            nStdDrinks: Number(nStdDrinks),
            timeHi    : timeHi
         }
      );
      const insertedRowId = db.nextInsertId;
      db.nextInsertId++;
      db.rows.sort(_compareRowsForSortingPurposes);
      _storeDb(db);

      return insertedRowId;
   };

   this.saveSettings = function (valueByKey) {
      for (const key in valueByKey) {
         db.settings[key] = valueByKey[key];
      }

      _storeDb(db);
   };

   this.getRows = function () {
      return db.rows;
   };

   this.getSettings = function () {
      return db.settings;
   };

   this.getSettingsValue = function (key) {
      return db.settings[key];
   };

   this.getRowsAsHtml = function () {
      let tbodyTrs = '';

      for (let row of db.rows) {
         tbodyTrs += (
            "<tr id='row-" + row.id + "'>" +
             "<td class='align-r'>" + row.id         + '</td>' +
             "<td class='align-l'>" + row.drinkDesc  + '</td>' +
             "<td class='align-r'>" + Number(row.nStdDrinks).toFixed(1) + '</td>' +
             "<td class='align-r'>" + _convertTimeString(row.timeHi, 'H:i', 'g:i a') + '</td>' +
            '</tr>'
         );
      }

      return tbodyTrs;
   };

   // Private functions /////////////////////////////////////////////////////////////////////////

   function _init() {
      dbJson = window.localStorage.getItem('alcotracker.db');

      db = JSON.parse(dbJson);

      if (db === null || db.colHeadings === undefined || db.rows === undefined) {
         db = {
            settings: {
               ratioWaterWeightToTotalWeight: 0.68,
               includeLinesForIndividualDrinks: false,
               bodyWeightKg: 80
            },
            colHeadings: {
               id        : 'ID'        ,
               drinkDesc : 'Drink desc',
               nStdDrinks: 'Std.drinks',
               timeHi    : 'Time'
            },
            rows: [],
            nextInsertId: 1
         };

         _storeDb(db);
      }
   };

   function _storeDb(db) {
      window.localStorage.setItem('alcotracker.db', JSON.stringify(db));
   };

   function _compareRowsForSortingPurposes(rowA, rowB) {
      return (
         (rowA.timeHi > rowB.timeHi)? 1: (
            (rowA.timeHi < rowB.timeHi)? -1: (
               (rowA.id > rowB.id)? 1: (
                  (rowA.id < rowB.id)? -1: 0
               )
            )
         )
      );
   };

   /*
    * Note formats are same as are used in PHP function date().
    * (Copied from tom/lib/UtilsDate.js)
    */
   function _convertTimeString(str, formatCurrent, formatNew)
   {
      var time = _parseTimeString(str, formatCurrent);

      var a = (time.h >= 12)? 'pm': 'am';
      var g = (time.h ==  0)? 12: ((time.h > 12)? time.h - 12: time.h);

      var h = ((g      < 10)? '0': '') + g;
      var H = ((time.h < 10)? '0': '') + time.h;
      var i = ((time.m < 10)? '0': '') + time.m;
      var s = ((time.s < 10)? '0': '') + time.s;

      switch (formatNew)
      {
       case 'H:i:s'  : return H + ':' + i + ':' + s;
       case 'h:i:s a': return h + ':' + i + ':' + s + ' ' + a;
       case 'H:i'    : return H + ':' + i;
       case 'h:ia'   : return h + ':' + i + a;
       case 'h:i a'  : return h + ':' + i + ' ' + a;
       case 'g:i a'  : return g + ':' + i + ' ' + a;
       default       : throw new Exception(f, 'Unknown dateTime format "' + formatNew + '".');
      }
   }

   /*
    * (Copied from tom/lib/UtilsDate.js)
    */
   function _parseTimeString(timeString, format)
   {
      switch (format)
      {
       case 'H:i':
         if (timeString.length != 5 || timeString[2] != ':')
         {
            throw 'Time "' + timeString + '" does not match format "' + format + '".';
         }
         var amORpm = null;
         var h      = timeString.substr(0, 2);
         var m      = timeString.substr(3, 2);
         var s      = '00';
         break;

       default:
         throw 'Unknown expected time format "' + format + '".';
      }

      h = Number(h);
      m = Number(m);
      s = Number(s);

      if (amORpm == 'pm' && h != 12)
      {
         h += 12;

         if (h == 24)
         {
            h = 0;
         }
      }

      if (h > 23 || m > 59 || s > 59)
      {
         throw new Exception(f, 'Time "' + timeString + '" does not exist.');
      }

      return {h: h, m: m, s: s};
   };


   let db = null;

   _init();
}

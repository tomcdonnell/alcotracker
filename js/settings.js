/*
 * Javascript for settings.html.
 */

if (document.readyState !== 'loading') {
   main();
} else {
   document.addEventListener('DOMContentLoaded', main);
}

window.alcoDb = null;

function main() {
   window.alcoDb = new AlcoDb();

   const settings = window.alcoDb.getSettings();

   document.getElementById('inputWeightKg'       ).value = settings.bodyWeightKg;
   document.getElementById('inputRatioWater'     ).value = settings.ratioWaterWeightToTotalWeight;
   document.getElementById('checkboxIncludeLines').checked = (
      settings.includeLinesForIndividualDrinks
   );
}

function saveSettingsFromFormToDb() {
   window.alcoDb.saveSettings(
      {
         bodyWeightKg: (
            Number(document.getElementById('inputWeightKg').value)
         ),
         ratioWaterWeightToTotalWeight: (
            Number(document.getElementById('inputRatioWater').value)
         ),
         includeLinesForIndividualDrinks: (
            document.getElementById('checkboxIncludeLines').checked
         )
      }
   );

   window.location.href = 'index.html';
}

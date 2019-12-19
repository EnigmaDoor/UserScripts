/** @OnlyCurrentDoc */
/* WIP */

function calculateDonations(constantsRow, formRow, previousRow, names) {
  const constants = {
    previousRowLength: 6,
    gold: +constantsRow[0][0],
    sp: +constantsRow[0][1],
    res: +constantsRow[0][2],
    dynTax: 0.1,
  };
  const inputs = {
    time: formRow[0][0],
    field: formRow[0][1],
    resTax: +formRow[0][2],
    elapsedTime: formRow[0][3],
    //previousElapsedTime: previousRow.shift(),
  };
  
  var returned = [];
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var regex = new RegExp("^(" + name + ")\\s((?:\\d|,)+)\\s((?:\\d|,)+)\\s((?:\\d|,)+)\\s((?:\\d|,)+)\\s((?:\\d|,)+)\\s((?:\\d|,)+)\\s((?:\\d|,)+)\\s((?:\\d|\\w| )+)", "gm");
    var res = regex.exec(inputs.field);
    
    var stats = {
      name: res[1],
      exp: +res[2].replace(/,/g, ''),
      gold: +res[3].replace(/,/g, ''),
      sp: +res[4].replace(/,/g, ''),
      food: +res[5].replace(/,/g, ''),
      copper: +res[6].replace(/,/g, ''),
      gems: +res[7].replace(/,/g, ''),
      wood: +res[8].replace(/,/g, ''),
      lastDonation: res[9] // todo replace into time or amount of hours
    };
    stats.res = stats.food + stats.copper + stats.gems + stats.wood;
    
    var previousStats = {
      gold: +previousRow[0][i * constants.previousRowLength + 0] || 0,
      sp: +previousRow[0][i * constants.previousRowLength + 1] || 0,
      res: +previousRow[0][i * constants.previousRowLength + 2] || 0,
      diffTotal: +previousRow[0][i * constants.previousRowLength + 3] || 0,
      diffRes: +previousRow[0][i * constants.previousRowLength + 4] || 0,
      balance: +previousRow[0][i * constants.previousRowLength + 5] || 0
    };
    
    stats.diffGold = stats.gold - previousStats.gold;
    stats.diffSp = stats.sp - previousStats.sp;
    stats.diffRes = stats.res - previousStats.res;
    stats.diffTotal = stats.diffGold + stats.diffSp * constants.sp;
    stats.expectedDonationInTimeframe = (stats.diffRes * (inputs.resTax/100)) * constants.res * constants.dynTax;
    stats.balance = previousStats.balance + stats.expectedDonationInTimeframe - stats.diffTotal;
    
    var playerReturned = [
      stats.gold,
      stats.sp,
      stats.res,
      stats.diffTotal,
      stats.diffRes,
    ];
    returned = returned.concat(playerReturned);
  }
  return returned;
}

      
/**
* Donation Tab duration display
*/
function PENDDURATION(cell) {
  const values = cell.split(' ');
  if (values[0].indexOf('Never') >= 0) {
    return 'Never';
  }
  values[0] = Number(values[0]) || 1;
  
  const now = new Date();
  const donationDate = new Date();
  
  donationDate.setDate(donationDate.getDate() - (values[1].indexOf('day') >= 0 ? values[0] : 0));
  donationDate.setMonth(donationDate.getMonth() - (values[1].indexOf('month') >= 0 ? values[0] : 0));
  donationDate.setFullYear(donationDate.getFullYear() - (values[1].indexOf('year') >= 0 ? values[0] : 0));
  
  return Math.abs(Math.floor(
    Date.UTC(donationDate.getFullYear(), donationDate.getMonth(), donationDate.getDate())
    - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  ) / (1000 * 60 * 60 * 24));
}
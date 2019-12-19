/** @OnlyCurrentDoc */

Object.values = function(obj) { return Object.keys(obj).map(function(el) { return obj[el]; }) };

function PENDCALC(level, double, doubleDrop, dungeonState, mkt, gBld, quintSp, questRho, spRho, satchel, resSp, dropRho, gr, expRho, torch, actionsRho, st, eGearChance, eSpChance, eSpGain, eTkChance, eTkDouble) {
  /**** Setup formulas ****/
  const affixFormula = function(amount) {
    return [0, 0.02, 0.044, 0.072, 0.108, 0.15][amount];
  };
  const baseGainFormula = function(level) {
    return 1 + (level-1) * 0.12;
  };
  const initialGainFormula = function(global, baseGain, quintMult, total, affixes, guild, dungeon, isRounded) {
    const initialGain = baseGain * quintMult * (1 + total.res) * (1 + affixes.embellished.value) * (1 + guild.tradingPost.value/100) * (1 + dungeon.satchel);
    return (isRounded ? Math.round(initialGain) : initialGain) * global.gain;
  }
  const averageGainFormula = function(quint, normalGain, quintGain) { return (1 - quint.left) * normalGain + (quint.left) * quintGain; };
  const hourlyResGainFormula = function(averageGain) { return averageGain * (60 * 60 / 6); };
  const goldGainFormula = function(averageGain, resPrice) { return averageGain * resPrice; };
  const dropChanceFormula = function(dropRho, wishingWell, propitious, global) {
    return (1 + dropRho) * (1 + wishingWell/100) * (1 + propitious) * global.drop;
  };
  const expFormula = function(level, global, tavern, library, expRho, torch, expGear, sapient) {
    const relative = (1+tavern/100) * (1+library/100) * (1 + expRho + expGear) * (1+torch) * (1+sapient);
    return {
      relative: relative,
      absolute: 0
    };
  };
  const dungeonFormula = function(dungeonState, dropChance, satchel, torch) {
    const downtimeMult = 0.25;
    const dungeon = {
      actionsPerIngot: 6000 / dropChance,
      mode: dungeonState,
      realSatchel: satchel,
      realtorch: torch
    };
    dungeon.realUptime = Math.min(1, ((500+1500)/2) / dungeon.actionsPerIngot);
    switch(dungeonState) {
      case 'Uptime':
        dungeon.uptime = dungeon.realUptime;
        break;
      case 'Yes':
        dungeon.uptime = 1;
        break;
      case 'No':
        dungeon.uptime = 0;
        break;
    };
    dungeon.satchel = dungeon.uptime*satchel + (1-dungeon.uptime)*(satchel * downtimeMult);
    dungeon.torch = dungeon.uptime*torch + (1-dungeon.uptime)*(torch * downtimeMult);
    return dungeon;
  };
  const gearFormula = function(market, item) {
    const rarityMult = { basic: 0.46875, normal: 0.625, rare: 0.71875, epic: 0.78125, legendary: 0.906255, runic: 1 };
    item.rarity = item.rarity.toLowerCase();
    item.affix = item.affix ? item.affix.toLowerCase() : null;
    item.mult = rarityMult[item.rarity] * ((Math.pow(1.0015, item.level)) / 100) * 0.5 * (1 + item.armory/100) * (1 + item.upgrade/100);
    item.quint = item.stats.indexOf('quint') > -1 ? Math.round(item.mult * 0.5 * 10000000) / 10000000 : 0;
    item.base = item.stats.indexOf('base') > -1 ? Math.round(item.mult * 0.375 * 1000000) / 10000 : 0;
    item.res = item.stats.indexOf('res')> -1 ? Math.round(item.mult * 1 * 1000000) / 1000000 : 0;
    item.exp = item.stats.indexOf('exp') > -1 ? Math.round(item.mult * 2 * 1000000) / 1000000 : 0;
    item.action = 0;
    item.nextUpgradeCost = gearUpgradePriceFormula(market, item, true);
    return item;
  };
  const quintFormula = function(totalQuint) {
    /* Unused after change 25/12/2018, quint now provide flat +400% per activation */
    // const recursiveQuintFormula = function(quintValue, multiplier) {
    //   return quintValue > 1 ? multiplier + recursiveQuintFormula(quintValue - 1, multiplier - 1 || 1) : 0;
    // };
    // return {
    //   total: totalQuint,
    //   min: recursiveQuintFormula(totalQuint, 5) || 1,
    //   max: recursiveQuintFormula(totalQuint + 1, 5),
    //   left: totalQuint % 1,
    // };
    return {
      total: totalQuint,
      min: 1 + 4 * Math.floor(totalQuint),
      max: 1 + 4 * Math.ceil(totalQuint),
      left: totalQuint % 1,
    };
  };
  const dropFormula = function(global, market, refinery, armory, dropChance, spBoost, encampment) {
    const gains = {};
    const tree = [
      { desc: 'gear', ods: 0.00028 * (1 + encampment.gearChance.value), units: ['totalSP', 'runicOds'], fn: function(unit) {
        const distribution = [
          { desc: 'normal', ods: 0.69995, gain: 200 },
          { desc: 'rare', ods: 0.28, gain: 500 },
          { desc: 'epic', ods: 0.019, gain: 800 },
          { desc: 'legendary', ods: 0.001, gain: 1200 },
          { desc: 'runic', ods: 0.00005, gain: 3000 }
        ];
        const odsRef = (refinery/100) % 1;
        const distribFn = function(roundFn, el, idx) {
          return {
            ods: el.ods,
            gain: distribution[Math.min(idx + roundFn(refinery/100), distribution.length - 1)].gain,
            rarity: distribution[Math.min(idx + roundFn(refinery/100), distribution.length - 1)].desc
          };
        };
        const distribNoRef = distribution.map(function(el, idx) { return distribFn(Math.floor, el, idx); });
        const distribYesRef = distribution.map(function(el, idx) { return distribFn(Math.ceil, el, idx); });
        const distribReduce = function(acc, el) { return acc + el.ods * el.gain * (1 + armory / 100) };
        gains.distribDebug = { distribNoRef: distribNoRef, distribYesRef: distribYesRef };
        switch (unit) {
          case 'totalSP':
            return (1 - odsRef) * distribNoRef.reduce(distribReduce, 0) + odsRef * distribYesRef.reduce(distribReduce, 0);
          case 'runicOds':
            return ((1 - odsRef) * distribNoRef.filter(function(el) { return el.rarity === 'runic' }).reduce(function(acc, el) { return acc + el.ods; }, 0))
              + (odsRef * distribYesRef.filter(function(el) { return el.rarity === 'runic' }).reduce(function(acc, el) { return acc + el.ods; }, 0));
        }
      }},
      { desc: 'rho', ods: 0.00016, units: ['rho'], fn: function() { return ((2 + 5) / 2) * global.gain; } },
      { desc: 'big sp', ods: 0.00016 * (1 + encampment.spChance.value), units: ['totalSP', 'sp'], fn: function() { return (1+spBoost) * ((400 + 1250) / 2) * (1 + encampment.spGain.value) * global.gain; } },
      { desc: 'small sp', ods: 0.0133 * (1 + encampment.spChance.value), units: ['totalSP', 'sp'], fn: function() { return (1+spBoost) * ((1 + 25) / 2) * (1 + encampment.spGain.value) * global.gain; } },
      { desc: 'token', ods: 0.0001 * (1 + encampment.tokenChance.value), units: ['token'], fn: function() {
        const distribution = [
          { ods: 0.4666, gain: 60 * 15 },
          { ods: 0.3333, gain: 60 * 30 },
          { ods: 0.1666, gain: 60 * 60 * 1 },
          { ods: 0.0333, gain: 60 * 60 * 3 }
        ];
        return distribution.reduce(function(acc, el) { return acc + el.ods * el.gain * (1 + encampment.tokenDouble.value); }, 0);
      }}
    ];
    
    tree.map(function(el) {
      el.units.map(function(unit) {
        gains[unit] = gains[unit] || 0;
        gains[unit] += dropChance * el.ods * el.fn(unit);
      });
    });
    gains.actionsPerRunic = 1.0 / gains.runicOds;
    gains.totalGold = gains.rho * market.rho + gains.totalSP * market.sp;
    gains.totalGoldHourly = gains.totalGold * 600;
    return gains;
  };
  
  /**** Gain formula ****/
  const gainFormula = function(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, iEncampment) {
    const total = JSON.parse(JSON.stringify(iTotal));
    const market = JSON.parse(JSON.stringify(iMarket));
    const guild = JSON.parse(JSON.stringify(iGuild));
    const scraptown = JSON.parse(JSON.stringify(iScraptown));
    const gear = JSON.parse(JSON.stringify(iGear));
    const boosts = JSON.parse(JSON.stringify(iBoosts));
    const encampment = JSON.parse(JSON.stringify(iEncampment));
    const gains = {};
    
    const affixes = { sapient: { amount: 0, value: 0 }, embellished: { amount: 0, value: 0 }, propitious: { amount: 0, value: 0 } };
    Object.keys(gear).map(function(key) {
      var item = gearFormula(market, gear[key]);
      if (item.affix) {
        gear[key].affix = item.affix;
        affixes[item.affix].amount += 1;
        affixes[item.affix].value = affixFormula(affixes[item.affix].amount);
      }
      total.gear.quint += item.quint;
      total.gear.base += item.base;
      total.gear.res += item.res;
      total.gear.exp += item.exp;
      total.gear.actions += item.actions;
      return item;
    });

    total.drop = dropChanceFormula(boosts.rho.drop.value, guild.wishingWell.value, affixes.propitious.value, iGlobal);
    const drops = dropFormula(iGlobal, iMarket, guild.refinery.value, scraptown.armory, total.drop, iBoosts.rho.sp.value, encampment);
    const dungeon = dungeonFormula(dungeonState, total.drop, boosts.dungeon.satchel.value, boosts.dungeon.torch.value);
  
    total.quint = total.gear.quint + boosts.sp.quint.value;
    const quint = quintFormula(total.quint);
    total.res = total.gear.res + boosts.sp.res.value;
    total.exp = expFormula(level, iGlobal, guild.tavern.value, scraptown.library, boosts.rho.exp.value, dungeon.torch, total.gear.exp, affixes.sapient.value);
    total.actions += guild.gym.value*10 + scraptown.arena*5 + boosts.rho.actions.value;
    
    gains.actionResBase = baseGainFormula(level) + total.gear.base;
    gains.actionResNoQuintRounded = initialGainFormula(iGlobal, gains.actionResBase, quint.min, total, affixes, guild, dungeon, true);
    gains.actionResQuintRounded = initialGainFormula(iGlobal, gains.actionResBase, quint.max, total, affixes, guild, dungeon, true);
    gains.actionResNoQuint = initialGainFormula(iGlobal, gains.actionResBase, quint.min, total, affixes, guild, dungeon);
    gains.actionResQuint = initialGainFormula(iGlobal, gains.actionResBase, quint.max, total, affixes, guild, dungeon);
    gains.actionResAverage = averageGainFormula(quint, gains.actionResNoQuint, gains.actionResQuint);
    gains.hourlyResAverage = hourlyResGainFormula(gains.actionResAverage);
    gains.actionGoldAverage = goldGainFormula(gains.actionResAverage, market.res);
    gains.hourlyGoldAverage = goldGainFormula(gains.hourlyResAverage, market.res);
    
    gains.g = gains.actionGoldAverage + drops.totalGold; /* Used as GPA/ROI comparator; */
    
    return { total: total, market: market, guild: guild, scraptown: scraptown, gear: gear, boosts: boosts, encampment: encampment, gains: gains, dungeon: dungeon, quint: quint, drops: drops };
  };
  
  /**** Prices formulas ****/
  /* Cost to buy next boost from xBoost is outputted as gold */
  const priceBaseFormula = function(level, base) { return base * (level * (level+1) / 2); };
  const priceGrowthFormula = function(level, growthFactor, growthFactorMultAt, growthMultiplier, primaryMultiplier) {
    growthMultiplier = growthMultiplier || 1;
    primaryMultiplier = primaryMultiplier || 1;
    var price = 0; // isGrowthModified ? ((Math.pow(level, 3)/3) + Math.pow(level, 2) + (level * 2/3)) * growthFactor / 2 : 0;
    for (var i = 0; level - i > 0; i += 1000) {
      if (i >= growthFactorMultAt) {
        growthFactor *= 2;
      }
      var increase = (
        (Math.pow(level-i, 3) * 1/3) * primaryMultiplier
        + Math.pow(level-i, 2)
        + ((level-i) * 2/3)
      ) * (growthFactor / 2) * growthMultiplier;
      price += increase;
    }
    return price;
  };
  const quintPriceFormula = function(spPrice, scrapyard, quintWant, quintGot) {
    const v = { base: 15, growth: 0.02, growthFactorMultAt: 2000 };
    const want = quintWant * 1000;
    const got = quintGot ? quintGot * 1000 : want - 1;
    return spPrice * Math.round(
      Math.pow(0.99, scrapyard) * (
        (priceBaseFormula(want, v.base) + priceGrowthFormula(want, v.growth, v.growthFactorMultAt)) 
        - (priceBaseFormula(got, v.base) + priceGrowthFormula(got, v.growth, v.growthFactorMultAt))
      )
    );
  };
  const resPriceFormula = function(spPrice, scrapyard, resWant, resGot) {
    const v = { base: 8, growth: 0.01, growthFactorMultAt: 2000 };
    const want = resWant * 1000;
    const got = resGot ? resGot * 1000 : want - 1;
    return spPrice * Math.round(
      Math.pow(0.99, scrapyard) * (
        (priceBaseFormula(want, v.base) + priceGrowthFormula(want, v.growth, v.growthFactorMultAt))
        - (priceBaseFormula(got, v.base) + priceGrowthFormula(got, v.growth, v.growthFactorMultAt))
      )
    );
  };
  const tpPriceFormula = function(resPrice, spPrice, tradingPost) { return Math.pow(1.1, tradingPost)*11250000 + Math.pow(1.1, tradingPost)*60000*4*resPrice; };
  const gymPriceFormula = function(resPrice, spPrice, gym) { return Math.pow(1.1, gym)*7500000 + Math.pow(1.1, gym)*85000*4*resPrice; };
  const dungeonPriceGrowthFormula = function(level, mult) { return ((0.5*(Math.pow(level, 3)*1/3) + Math.pow(level, 2) + level*2/3) * mult); };
  const satchelPriceFormula = function(gotBoost, wantBoost) {
    const v = { base: 45000, ratio: 0.05, growth: 1, growthFactorMultAt: 2000, growthMult: 30, primaryMult: 1 };
    const got = Math.round(gotBoost * (100 / v.ratio));
    const want = Math.round(wantBoost ? wantBoost * (100 / v.ratio) : got+1);
    // return (priceBaseFormula(want, v.base) + priceGrowthFormula(want, 85, 1000, 50)) - (priceBaseFormula(got, v.base) + priceGrowthFormula(got, 85, 1000, 50));
    // return (priceBaseFormula(want, v.base) + dungeonPriceGrowthFormula(want, v.mult)) - (priceBaseFormula(got, v.base) + dungeonPriceGrowthFormula(got, v.mult));
    return Math.round(
      (priceBaseFormula(want, v.base) + priceGrowthFormula(want, v.growth, v.growthFactorMultAt, v.growthMult, v.primaryMult))
      - (priceBaseFormula(got, v.base) + priceGrowthFormula(got, v.growth, v.growthFactorMultAt, v.growthMult, v.primaryMult))
    );
    
  }
  // const torchPriceFormula = function(resPrice, torchBoost) { return (torchBoost*1000 || 1) * 300000 + (torchBoost*1000 || 1) * 6000 * resPrice; };
  const torchPriceFormula = function(resPrice, gotBoost, wantBoost) {
    const v = { gold: { base: 200000, mult: 150 }, res: { base: 4000, mult: 3 } };
    const got = Math.round(gotBoost * 1000);
    const want = Math.round(wantBoost ? wantBoost * 1000 : got+1);
    return ((priceBaseFormula(want, v.gold.base) + dungeonPriceGrowthFormula(want, v.gold.mult)) + (priceBaseFormula(want, v.res.base) + dungeonPriceGrowthFormula(want, v.res.mult)) * resPrice)
    - ((priceBaseFormula(got, v.gold.base) + dungeonPriceGrowthFormula(got, v.gold.mult)) + (priceBaseFormula(got, v.res.base) + dungeonPriceGrowthFormula(got, v.res.mult)) * resPrice)
  };
  const capRaisePriceFormula = function(resPrice, level, coef) {
    coef = coef || 1;
    level = Math.ceil(+((100 * (level - coef)) / coef).toFixed(3));
    return level <= 0 ? 0
    : (level * 15000000000 * Math.pow(1.08, level))
    + (level * 500000000 * Math.pow(1.08, level)) * resPrice;
  };
  const dropPriceFormula = function(rhoPrice, resPrice, dropBoost) {
    const base = dropBoost*100 * 2 * rhoPrice;
    const capRaise = capRaisePriceFormula(resPrice, dropBoost);
    return {
      base: base,
      capRaise: capRaise,
      total: base + capRaise
    };
  };
  const expPriceFormula = function(rhoPrice, resPrice, expBoost) {
    const base = Math.floor(expBoost*10 - 0.01) * rhoPrice;
    const capRaise = capRaisePriceFormula(resPrice, expBoost, 5);
    return {
      base: base,
      capRaise: capRaise,
      total: base + capRaise
    };
  };
  const actionsPriceFormula = function(rhoPrice, actionBoost) { return Math.floor(actionBoost/50) * rhoPrice; };
  const gearUpgradePriceFormula = function(market, item, inplace) {
    const nextUpgradeCostGold = Math.round(21000 * ((1-Math.pow(1.041, item.upgrade+2)) - (1-Math.pow(1.041, item.upgrade+1)))/-0.041);
    const nextUpgradeCostRes = Math.round(175 * ((1-Math.pow(1.041, item.upgrade+2)) - (1-Math.pow(1.041, item.upgrade+1)))/-0.041);
    var nextUpgradeCostGoldenCog = 0;
    var nextUpgradeCost = nextUpgradeCostGold + nextUpgradeCostRes * 4 * market.res;
    if (item.upgrade >= 300) {
      nextUpgradeCostGoldenCog = item.upgrade - 300 + 1;
      nextUpgradeCost += nextUpgradeCostGoldenCog * market.goldenCog;
    }
    if (inplace) {
      item.nextUpgradeCostGold = nextUpgradeCostGold;
      item.nextUpgradeCostRes = nextUpgradeCostRes;
      item.nextUpgradeCostGoldenCog = nextUpgradeCostGoldenCog;
      item.nextUpgradeCost = nextUpgradeCost;
    }
    return nextUpgradeCost;
  };
  const encampmentShopPriceFormula = function(level, mult) {
    mult = mult || 1;
    return 200 * (level * 100 + 1) * mult;
  };
  
  /**** Variables ****/
  const iGlobal = {
    gain: +double.substr(1),
    drop: +doubleDrop.substr(1)
  };
  const iBoosts = {
    rho: { quest: { value: questRho }, sp: { value: spRho }, exp: { value: expRho }, drop: { value: dropRho }, actions: { value: actionsRho } },
    sp: { quint: { value: quintSp }, res: { value: resSp } },
    dungeon: { satchel: { value: satchel }, torch: { value: torch } }
  };
  const iTotal = { quint: 0, res: 0, actions: 300, exp: { relative: 0, absolute: 0 }, drop: 0, gear: { quint: 0, res: 0, exp: 0, actions: 0, base: 0 } };
  const iMarket = { res: mkt[0][0], sp: mkt[0][1], rho: mkt[0][2], goldenCog: mkt[0][3] };
  const iGuild = { members: { value: gBld[0][0] }, tradingPost: { value: gBld[0][1] }, gym: { value: gBld[0][2] }, tavern: { value: gBld[0][3] }, wishingWell: { value: gBld[0][4] }, refinery: { value: gBld[0][5] } };
  const iScraptown = { housing: st[0][0], scrapyard: st[1][0], library: st[2][0], armory: st[3][0], workshop: st[4][0], arena: st[5][0] };
  const iGear = {
    tool: { level: gr[0][0], armory: gr[1][0], upgrade: gr[2][0], rarity: gr[3][0].split(' - ')[0], affix: gr[3][0].split(' - ')[1], stats: gr[4][0].split(' - ') },
    suit: { level: gr[0][1], armory: gr[1][1], upgrade: gr[2][1], rarity: gr[3][1].split(' - ')[0], affix: gr[3][1].split(' - ')[1], stats: gr[4][1].split(' - ') },
    hat: { level: gr[0][2], armory: gr[1][2], upgrade: gr[2][2], rarity: gr[3][2].split(' - ')[0], affix: gr[3][2].split(' - ')[1], stats: gr[4][2].split(' - ') },
    glove: { level: gr[0][3], armory: gr[1][3], upgrade: gr[2][3], rarity: gr[3][3].split(' - ')[0], affix: gr[3][3].split(' - ')[1], stats: gr[4][3].split(' - ') },
    shoe: { level: gr[0][4], armory: gr[1][4], upgrade: gr[2][4], rarity: gr[3][4].split(' - ')[0], affix: gr[3][4].split(' - ')[1], stats: gr[4][4].split(' - ') },
  };
  const iEncampment = { gearChance: { value: eGearChance }, spChance: { value: eSpChance }, spGain: { value: eSpGain }, tokenChance: { value: eTkChance }, tokenDouble: { value: eTkDouble } };
  
  /**** Gains ****/
  const i = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, iEncampment);
  
  /**** Previsions ****/
  var g;
  
  const tGear = JSON.parse(JSON.stringify(iGear));
  tGear.tool.upgrade += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, tGear, iBoosts, iEncampment); i.gear.tool.gpa = g.gains.g - i.gains.g; i.gear.tool.roi = i.gear.tool.nextUpgradeCost / i.gear.tool.gpa; tGear.tool.upgrade -= 1;
  tGear.suit.upgrade += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, tGear, iBoosts, iEncampment); i.gear.suit.gpa = g.gains.g - i.gains.g; i.gear.suit.roi = i.gear.suit.nextUpgradeCost / i.gear.suit.gpa; tGear.suit.upgrade -= 1;
  tGear.hat.upgrade += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, tGear, iBoosts, iEncampment); i.gear.hat.gpa = g.gains.g - i.gains.g; i.gear.hat.roi = i.gear.hat.nextUpgradeCost / i.gear.hat.gpa; tGear.hat.upgrade -= 1;
  tGear.glove.upgrade += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, tGear, iBoosts, iEncampment); i.gear.glove.gpa = g.gains.g - i.gains.g; i.gear.glove.roi = i.gear.glove.nextUpgradeCost / i.gear.glove.gpa; tGear.glove.upgrade -= 1;
  tGear.shoe.upgrade += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, tGear, iBoosts, iEncampment); i.gear.shoe.gpa = g.gains.g - i.gains.g; i.gear.shoe.roi = i.gear.shoe.nextUpgradeCost / i.gear.shoe.gpa; tGear.shoe.upgrade -= 1;
  
  const tBoosts = JSON.parse(JSON.stringify(iBoosts));
  tBoosts.sp.quint.value += 0.001; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.sp.quint.gpa = g.gains.g - i.gains.g; i.boosts.sp.quint.roi = quintPriceFormula(i.market.sp, i.scraptown.scrapyard, tBoosts.sp.quint.value) / i.boosts.sp.quint.gpa; tBoosts.sp.quint.value -= 0.001;
  tBoosts.sp.res.value += 0.001; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.sp.res.gpa = g.gains.g - i.gains.g; i.boosts.sp.res.roi = resPriceFormula(i.market.sp, i.scraptown.scrapyard, tBoosts.sp.res.value) / i.boosts.sp.res.gpa; tBoosts.sp.res.value -= 0.001;
  tBoosts.rho.sp.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.rho.sp.gpa = g.gains.g - i.gains.g; i.boosts.rho.sp.cost = dropPriceFormula(i.market.rho, i.market.res, tBoosts.rho.sp.value); i.boosts.rho.sp.roi = i.boosts.rho.sp.cost.total / i.boosts.rho.sp.gpa;  i.boosts.rho.sp.roiNoCap = i.boosts.rho.sp.cost.base / i.boosts.rho.sp.gpa; tBoosts.rho.sp.value -= 0.01;
  if (tBoosts.rho.quest.value < 0.8) {
    i.boosts.rho.quest.roi = 'CAP ME #1'; i.boosts.rho.quest.gpa = 'CAP ME #1';
  } else { i.boosts.rho.quest.roi = 'MAX'; i.boosts.rho.quest.gpa = 'MAX'; }
    tBoosts.rho.drop.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.rho.drop.more = g.total.drop - i.total.drop; i.boosts.rho.drop.cost = dropPriceFormula(i.market.rho, i.market.res, tBoosts.rho.drop.value); i.boosts.rho.drop.gdrop = i.boosts.rho.drop.cost.total / (i.boosts.rho.drop.more*100); i.boosts.rho.drop.gpa = g.gains.g - i.gains.g; i.boosts.rho.drop.roi = i.boosts.rho.drop.cost.total / i.boosts.rho.drop.gpa; i.boosts.rho.drop.roiNoCap = i.boosts.rho.drop.cost.base / i.boosts.rho.drop.gpa; tBoosts.rho.drop.value -= 0.01;
  // sparepart
  tBoosts.dungeon.satchel.value += 0.0005; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.dungeon.satchel.gpa = g.gains.g - i.gains.g; i.boosts.dungeon.satchel.roi = satchelPriceFormula(tBoosts.dungeon.satchel.value) / i.boosts.dungeon.satchel.gpa; tBoosts.dungeon.satchel.value -= 0.0005;

  tBoosts.dungeon.torch.value += 0.001; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.dungeon.torch.more = g.total.exp.relative - i.total.exp.relative; i.boosts.dungeon.torch.gxp = torchPriceFormula(i.market.res, tBoosts.dungeon.torch.value) / (i.boosts.dungeon.torch.more*100); tBoosts.dungeon.torch.value -= 0.001;
  tBoosts.rho.exp.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.rho.exp.more = g.total.exp.relative - i.total.exp.relative; i.boosts.rho.exp.cost = expPriceFormula(i.market.rho, i.market.res, tBoosts.rho.exp.value); i.boosts.rho.exp.gxp = i.boosts.rho.exp.cost.total / (i.boosts.rho.exp.more*100); i.boosts.rho.exp.gxpNoCap = i.boosts.rho.exp.cost.base / (i.boosts.rho.exp.more*100); tBoosts.rho.exp.value -= 0.01;
  tBoosts.rho.actions.value += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, tBoosts, iEncampment); i.boosts.rho.actions.gact = actionsPriceFormula(i.market.rho, tBoosts.rho.actions.value) / (g.total.actions - i.total.actions); tBoosts.rho.actions.value -= 1;
  
  const tGuild = JSON.parse(JSON.stringify(iGuild));
  tGuild.tradingPost.value += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, tGuild, iScraptown, iGear, iBoosts, iEncampment); i.guild.tradingPost.gpa = g.gains.g - i.gains.g; i.guild.tradingPost.roi = (tpPriceFormula(i.market.res, i.market.sp, tGuild.tradingPost.value) / tGuild.members.value) / i.guild.tradingPost.gpa; tGuild.tradingPost.value -= 1;
  tGuild.wishingWell.value += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, tGuild, iScraptown, iGear, iBoosts, iEncampment); i.guild.wishingWell.more = g.total.drop - i.total.drop; i.guild.wishingWell.spPerActions = (g.drops.totalSP - i.drops.totalSP); i.guild.wishingWell.plusDungeonUptime = (g.dungeon.realUptime - i.dungeon.realUptime); tGuild.wishingWell.value -= 1;
  tGuild.gym.value += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, tGuild, iScraptown, iGear, iBoosts, iEncampment); i.guild.gym.gact = (gymPriceFormula(i.market.res, i.market.sp, tGuild.gym.value) / tGuild.members.value) / (g.total.actions - i.total.actions); tGuild.gym.value -= 1;
  tGuild.refinery.value += 1; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, tGuild, iScraptown, iGear, iBoosts, iEncampment); i.guild.refinery.negActionsPerRunic = (g.drops.actionsPerRunic - i.drops.actionsPerRunic); i.guild.refinery.spPerActions = (g.drops.totalSP - i.drops.totalSP); tGuild.refinery.value -= 1;

  const tEncampment = JSON.parse(JSON.stringify(iEncampment));
  tEncampment.tokenChance.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, tEncampment); i.encampment.tokenChance.secsActionsPts = (g.drops.token - i.drops.token) / encampmentShopPriceFormula(i.encampment.tokenChance.value); tEncampment.tokenChance.value -= 0.01;
  tEncampment.tokenDouble.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, tEncampment); i.encampment.tokenDouble.secsActionsPts = (g.drops.token - i.drops.token) / encampmentShopPriceFormula(i.encampment.tokenDouble.value); tEncampment.tokenDouble.value -= 0.01;
  tEncampment.spChance.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, tEncampment); i.encampment.spChance.spActionsPts = (g.drops.totalSP - i.drops.totalSP) / encampmentShopPriceFormula(i.encampment.spChance.value); tEncampment.spChance.value -= 0.01;
  tEncampment.spGain.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, tEncampment); i.encampment.spGain.spActionsPts = (g.drops.totalSP - i.drops.totalSP) / encampmentShopPriceFormula(i.encampment.spGain.value); tEncampment.spGain.value -= 0.01;
  tEncampment.gearChance.value += 0.01; g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, tEncampment); i.encampment.gearChance.negActionsPerRunic = (g.drops.actionsPerRunic - i.drops.actionsPerRunic); i.encampment.gearChance.spActionsPts = (g.drops.totalSP - i.drops.totalSP) / encampmentShopPriceFormula(i.encampment.gearChance.value); tEncampment.gearChance.value -= 0.01;

  g = gainFormula(iGlobal, dungeonState, level, iTotal, iMarket, iGuild, iScraptown, iGear, iBoosts, tEncampment);
  /**** Output ****/
  return ([
    [i.gains.hourlyGoldAverage, i.gains.actionResBase, i.total.quint, i.boosts.sp.quint.roi, i.boosts.rho.quest.roi, i.boosts.rho.sp.roi, i.boosts.dungeon.satchel.roi, i.boosts.rho.exp.more, i.boosts.rho.drop.more, i.drops.totalGoldHourly, i.encampment.tokenChance.secsActionsPts],
    [,, i.total.res, i.boosts.sp.quint.gpa, i.boosts.rho.quest.gpa, i.boosts.rho.sp.gpa, i.boosts.dungeon.satchel.gpa, i.boosts.rho.exp.gxp, i.boosts.rho.drop.gdrop, i.drops.totalGold, i.encampment.tokenDouble.secsActionsPts],
    [i.gains.actionGoldAverage, i.gains.actionResNoQuintRounded,, i.boosts.sp.res.roi, i.boosts.rho.drop.roi,i.drops.sp, i.guild.tradingPost.roi, i.boosts.dungeon.torch.more, i.guild.wishingWell.more, i.drops.totalSP, i.encampment.spChance.spActionsPts],
    [,, i.total.actions, i.boosts.sp.res.gpa, i.boosts.rho.drop.gpa,, i.guild.tradingPost.gpa, i.boosts.dungeon.torch.gxp, i.boosts.rho.actions.gact, i.drops.rho, i.encampment.spGain.spActionsPts],
    [i.gains.hourlyResAverage, i.gains.actionResQuintRounded, i.total.exp.relative, i.gear.tool.nextUpgradeCost, i.gear.suit.nextUpgradeCost, i.gear.hat.nextUpgradeCost, i.gear.glove.nextUpgradeCost, i.gear.shoe.nextUpgradeCost, i.guild.gym.gact, i.drops.token, i.encampment.gearChance.spActionsPts],
    [,, i.total.drop, i.gear.tool.roi, i.gear.suit.roi, i.gear.hat.roi, i.gear.glove.roi, i.gear.shoe.roi, i.guild.wishingWell.plusDungeonUptime,i.drops.actionsPerRunic, i.encampment.gearChance.negActionsPerRunic],
    [i.gains.actionResAverage, i.quint.left, i.dungeon.realUptime, i.gear.tool.gpa, i.gear.suit.gpa, i.gear.hat.gpa, i.gear.glove.gpa, i.gear.shoe.gpa, i.guild.refinery.spPerActions,i.guild.refinery.negActionsPerRunic, i.guild.wishingWell.spPerActions],
    [JSON.stringify(i.gear)] //debug
  ]);
}
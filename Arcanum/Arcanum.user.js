// ==UserScript==
// @name ArcanumScript
// @namespace Arcanum
// @match http://www.lerpinglemur.com/arcanum/*
// @grant unsafeWindow
// @require https://code.jquery.com/jquery-1.7.2.min.js
// @require     http://cdnjs.cloudflare.com/ajax/libs/moment.js/2.15.2/moment.min.js
// ==/UserScript==

/*
javascript: (function(e, s) {
    e.src = s;
    e.onload = function() {
        jQuery.noConflict();
        console.log('jQuery injected');
    };
    document.head.appendChild(e);
})(document.createElement('script'), '//code.jquery.com/jquery-latest.min.js')

var jq = document.createElement('script');
jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js";
document.getElementsByTagName('head')[0].appendChild(jq);
// ... give time for script to load, then type (or see below for non wait option)
jQuery.noConflict();
 */

'use strict';

/*** SETTINGS ***/
let isEnabled = true;
let isMenuChangeEnabled = true;
let loopTimeout = 1000;
let autocastList = [
  'minor mana', 'lesser mana', 'mana', 'last stand', // mana
  'fount', 'minor fount', 'water sense', // water
  'whisper', 'calming murmurs', 'perfect strike', 'true strike', 'guided strike', // spirit
  'angel of death',// shadow + spirit
  'insight', 'pulsing light', 'pulsing light II', 'pulsing light III', 'splendor', // light
  'abundance', 'wild growth', // nature
  'fire sense', // fire
  'unseen servant', 'wind sense', 'dust devil II', 'dust devil', 'whirling step III', 'whirling step II', 'whirling step', 'soothing breeze', // "kanna's dervish dance⭐", // air
  'unearth', 'adamant shell', 'steel skin', 'iron skin', 'stone skin', 'copper skin', // earth
  '❄️field of heat', // event
];
let actionList = [{
  name: 'sublimate lore',
  active: true,
  init: async () => await getAction('sublimate lore'),
  condition: () => getResource('Codices').missing < 20,
  action: async () => {
    (await getAction('sublimate lore')).element.click();
    await wait(100);
    $('div.popup > div:contains("sublimate lore") ~ div > button:contains("Confirm")').click();
  }
}, {
  name: 'Gather herb, Brew & drink pots',
  active: true,
  init: async () => await getAction('gather herbs') 
  && await getPotion('draught of mana') && await getPotion('draught of stamina') && await getPotion('serenity') 
  && await getEquip('draught of mana') && await getEquip('draught of stamina') && await getEquip('serenity'),
  condition: () => getResource('herbs').current > 40 || getResource('ichor').missing < 2,
  action: async () => {
    while (getResource('herbs').current > 20) {
      await wait(10);
      if (getEnergy('stamina').percent < 0.3) {
        (await getPotion('draught of stamina')).element.click(); (await getEquip('draught of stamina')).element.click();
      } else {
        (await getPotion('draught of mana')).element.click(); getEnergy('mana').percent < 0.9 && (await getEquip('draught of mana')).element.click();
      }
      if (getEnergy('stamina').percent > 0.7) {
        for (let y = 0; y < 50; y++) {
          (await getAction('gather herbs')).element.click();
        }
      }
    }
    if (getResource('ichor').missing < 2) {
      (await getPotion('serenity')).element.click();
    }
  }
}, {
  name: 'Maintain runner',
  active: true,
  init: async () => await getAdventure("hall of ages") && await getAdventure("the catacrypts") && await getAction('commune') && await getSkill('lore') && await getEquip('serenity'),
  condition: () => !cache.running.lastCheck || moment().subtract(2, 'seconds') > cache.running.lastCheck,
  action: async () => {
    const cooldownActionName = 'geas';
    cache.running.cooldownCheck = cache.running.cooldownCheck || moment();
    const permActionName = 'warp landscape';
    const permAction = await getAction(permActionName);
    const permActionVerb = 'terraforming';

    // Other locales: "hestia's cottage🎃", "ruined crypt", "fazbit's workshop", "genezereth", "peregrination", "rithel"
    const adventure = "ice lake"; // "rithel";
    const dungeon = "the catacrypts"; // "desilla's grotto";
    const skill = "alchemy" // "nature lore"; // "lore";
    const skillVerb = "alchemy" // "observing nature";
    const shouldRun = [skill, adventure, cooldownActionName, dungeon];
    cache.running.lastCheck = moment();
    
    if (!(await getBuff('serenity')).active) {
      (await getEquip('serenity')).element.click();
    }
    
    const runner = await getRunner();
    
    /* Fetch all necessary adventures to avoid blocks */
    if (!(await getAdventure(adventure)).element || !(await getAdventure(dungeon)).element) {
      (await getTopAction('stop all')).click();
      await getAdventure(adventure) && await getAdventure(dungeon);
    }

    /* Cooldown runner (geas) */
    if (!runner.find(el => el.name.includes(cooldownActionName))) {
      const threshold = moment().subtract(850, 'seconds') > cache.running.cooldownCheck; 
      (await getAction(cooldownActionName, threshold)).element.click();
    } else {
      cache.running.cooldownCheck = moment();
    }

    /* Permanent action runner */
    if (!runner.find(el => el.name.includes(cooldownActionName)) && !runner.find(el => el.name.includes(permActionVerb))) {
      permAction.element.click();
    } 

    /* Trap soul chain runner */
    if (!runner.find(el => el.name.includes('catching soul'))) {
      if (getResource('bone dust').percent > 0.9) {
        console.log("here trap soul");
        (await getAction('trap soul')).element.click();
      } else if (!runner.find(el => el.name.includes('grind bones'))) {
        if (getResource('bones').percent > 0.9) {
          console.log("here grind bones");
          (await getAction('grind bones')).element.click();
        } else if (!runner.find(el => el.name.includes('vile experiment'))) {
          console.log("here vile experiment");
          (await getAction('vile experiment')).element.click();
        }
      }
    }

    /* Rest runner if locales needs it */
    // if (!runner.find(el => el.name.includes('communing'))) {
    //     (await getAction('commune')).element.click();
    // }

    /* Adventures runners (locale + dungeon allowed */
    if (!runner.find(el => el.name.includes(adventure))) {
       (await getAdventure(adventure)).element.click();
    }
    if (!runner.find(el => el.name.includes(dungeon))) {
     (await getAdventure(dungeon)).element.click();
    }
    
    /* Skill runner */
    if (!runner.find(el => el.name.includes(skillVerb))) {
      (await getSkill(skill)).element.click();
    }
  }
}, {
   name: 'imbue gems',
   active: true,
   init: async () => true,
   condition: () => getResource('gems').current > 20,
   action: async () => {
     const gemTypes = [
       { name: 'arcane gem', action: 'imbue gem (arcane)' },
       { name: 'fire gem', action: 'imbue gem (fire)' },
       { name: 'water gem', action: 'imbue gem (water)' },
       { name: 'nature gem', action: 'imbue gem (nature)' },
       { name: 'earth gem', action: 'imbue stone (earth)' },
       { name: 'air gem', action: 'imbue gem (air)' },
       { name: 'shadow gem', action: 'imbue gem (shadow)' },
       { name: 'light gem', action: 'imbue gem (light)' },
       { name: 'spirit gem', action: 'imbue gem (spirit)' },
       { name: 'blood gem', action: 'coagulate gem (blood)' },
    ];
     for (const gemType of gemTypes) {
       if (
         getResource(gemType.name).missing > 0
         && getResource('gems').current > 1
         && (!gemType.energy)
       )
         (await getAction(gemType.action, getResource(gemType.name).percent < 0.7)).element.click();
     }
   }
 }, {
   name: 'Auto tome',
   active: false,
   init: async () => true,
   condition: () => getResource('Tomes').missing > 5,
   action: async () => {
     (await getAction('Compile Tome')).element.click();
     if (getResource('Codices').missing > 50) {
       while (getResource('scrolls').missing > 10 && getEnergy('mana').percent > 0.3) {
         for (let i = 0; i < 10; i++) {
           (await getAction('scribe scroll')).element.click();
           await wait(25);
         }
       }
       while (getResource('Codices').missing > 5 && getResource('scrolls').current > 10 && getEnergy('mana').percent > 0.1) {
         (await getAction('bind codex')).element.click();
         await wait(25);
       }
     }
   }
 }, {
   name: 'train spell',
   active: true,
   init: async () => await getSpell('❄️ice shard'),
   condition: () => getEnergy('ice').percent > 0.3,
   action: async () => { (await getSpell('❄️ice shard')).element.click(); (await getSpell('❄️icy flame')).element.click(); }
}];

/*** HELPERS ***/
const cache = { running: { max: 2 }, actions: {}, skills: {}, spells: {}, potions: {}, equips: {}, adventures: {} };

async function wait(time) {
  return new Promise(resolve => setTimeout(() => resolve(true), time));
}
function changeMenu(name) {
  if (isMenuChangeEnabled) {
    $('div.menu-item').children(`span:contains("${name}")`).click();
  }
  return isMenuChangeEnabled;
}
function getEnergy(name) {
  const element = $(`td:contains(${name}) + td > div.${name} > div.bar > div`)[0];
  return {
    element,
    percent: element ? parseFloat(element.style.width) / 100.0 : null
  };
}
function getResource(name) {
  const resourceElement = $(`div.res-list > div.rsrc > span:contains(${name})`).next('span');
  const resource = {
    element: resourceElement,
    current: +(resourceElement.text().split('/')[0]),
    max: +(resourceElement.text().split('/')[1]),
  };
  resource.percent = resource.current / resource.max;
  resource.missing = resource.max - resource.current;
  return resource;
}
async function getTopAction(name) {
  return $('div.vitals button.btn-sm').filter(function () { return $(this).text().toLowerCase() === name.toLowerCase(); })[0];
}
async function getAction(name, shouldReplace) {
  if (!cache.actions[name] || shouldReplace) {
    cache.actions[name] = { name };
  }
  cache.actions[name].element = cache.actions[name].element || (changeMenu('main') && await wait(50) && $(`span.action-btn > button.wrapped-btn:contains("${name}")`)[0]);
  // cache.actions[name].enabled = cache.actions[name].element ? !$(cache.actions[name].element).prop('disabled') : false;
  cache.actions[name].enabled = cache.actions[name].element ? !cache.actions[name].element.disabled : false;
  if (shouldReplace) {
    const runningElem = $('div.vitals > div.running > div');
    if (runningElem.length === cache.running.max) {
      $(runningElem[1]).children('button').click();
      await wait (50);
    }      
  }
  return cache.actions[name];
}
async function getSpell(name) {
  if (!cache.spells[name]) {
    cache.spells[name] = { name };
  }
  cache.spells[name].element = cache.spells[name].element || (changeMenu('spells') && await wait(50) && $('div.spellbook td').filter(function () { return $(this).text() === name; }).siblings('td').children('button:contains("Cast")')[0]);
  return cache.spells[name];
}
async function getPotion(name) {
  if (!cache.potions[name]) {
    cache.potions[name] = { name };
  }
  cache.potions[name].element = cache.potions[name].element || (changeMenu('potions') && await wait(50) && $(`div.potions span:contains("${name}") ~ button`)[0]);
  return cache.potions[name];
}
async function getEquip(name) {
  if (!cache.equips[name]) {
    cache.equips[name] = { name };
  }
  cache.equips[name].element = cache.equips[name].element || (changeMenu('equip') && await wait(50) && $(`div.item-table > tr > td:contains("${name}")`).next('td').children('button:contains("Use")')[0]);
  return cache.equips[name];
}
async function getSkill(name) {
  if (!cache.skills[name]) {
    cache.skills[name] = { name };
  }
  cache.skills[name].element = /*cache.skills[name].element ||*/ (changeMenu('skills') && await wait(50) && $(`div.skill span:contains("${name}")`).next('span').children('button:contains("Train")')[0]);
  return cache.skills[name];
}
async function getAdventure(name) {
  if (!cache.adventures[name]) {
    cache.adventures[name] = { name };
  }
  cache.adventures[name].element = cache.adventures[name].element || (changeMenu('adventure') && await wait(50) && $(`div.locales > div.locale span:contains("${name}")`).next('button')[0]);
  return cache.adventures[name];
}
function getBuff(name) {
  const buffs = $('div.dot-view > div.dot > span:nth-child(2)');
  const element = buffs.filter(function () { return new RegExp(`^\\s*${name}$`, 'gm').test($(this).text()); })[0]
  const buff = { element, active: !!element };
  return buff;
}

async function getRunner() {
  const runner = [];
  const runningElem = $('div.vitals > div.running > div');
  $.each(runningElem, idx => {
    const running = {};
    const el = $(runningElem[idx]);
    running.stop = el.children("button:contains('stop')");
    running.name = el.children('span').text();
    runner.push(running);
  });
  return runner;
}

async function refreshPotions() {
  changeMenu('potions');
  await wait(50);
  const potionsElements = $.map($('div.potions div.potion-col > div.separate'), (v, k) => v);
  for (const el of potionsElements) {
    const name = $(el).children('span').text();
    cache.potions[name] = {
      name,
      element: $(el).children('button')[0]
    };
  }
}
async function refreshActions() {
  changeMenu('main');
  await wait(50);
  const actionsElements = $.map($('span.action-btn:not(".locked") > button.wrapped-btn'), (v, k) => v);
  for (const el of actionsElements) {
    const name = $(el).text();
    cache.actions[name] = {
      name,
      element: $(el),
      enabled: !$(el).prop('disabled')
    };
  }
}
async function refreshSkills() {
  changeMenu('skills');
  await wait(50);
  const skillsElements = $.map($('div.skill'), (v, k) => v);
  for (const el of skillsElements) {
    const name = $(el).find('span.separate > span:first-child').text();
    const button = $(el).find('button:contains("Train")');
    const trainable = button ? !button.prop('disabled') : null;
    cache.skills[name] = { name, element: button, trainable };
  }
}
async function refreshSpellbook() {
  // todo get all instead of autocastList
  changeMenu('spells');
  await wait(50);
  for (const spell of autocastList) {
    await getSpell(spell);
  }
}
async function refreshAdventure() {
  changeMenu('adventure');
  await wait (50);
  const adventuresElements = $('div.adventure > div.locales > div.locale');
  adventuresElements.each(el => {
    const name = $(el).find('span > span > span:first-child').text();
    const button = $(el).find('button');
    const doable = !button.prop('disabled');
    cache.adventures[name] = { name, element: button, doable };
  });
}

/*** SCRIPT ***/
async function initialize() {
  let main = undefined;
  while (!main || !main.length) {
    main = $('div.menu-item').children('span:contains("main")');
    await wait(500); // give time for game to init
  }
  await (1000);
  console.log('[ArcanumScript] begin Initialize');
  // attach toggle isEnabled in ui settings
  changeMenu('main') && await wait(500) && await refreshActions(); await wait(500);
  console.log('[ArcanumScript] Initialized actions');
  changeMenu('spells') && await wait(500) && await refreshSpellbook(); await wait(500);
  console.log('[ArcanumScript] Initialized spellbook');
  changeMenu('skills') && await wait(500) && await refreshSkills(); await wait(500);
  console.log('[ArcanumScript] Initialized skills');
  changeMenu('potions') && await wait(500) && await refreshPotions(); await wait(500);
  console.log('[ArcanumScript] Initialized potions');
  changeMenu('adventure') && await wait(500) && await refreshAdventure(); await wait(500);
  console.log('[ArcanumScript] Initialized adventure');
  for (const action of actionList) {
    await action.init();
  }
  await wait(500) && changeMenu('main');
  console.log('[ArcanumScript] Initialized');
}

async function execute() {
  /* Auto Casting */
  const activeSpells = $('div.dot-view > div.dot > span:nth-child(2)');
  const toCast = autocastList.filter(spell => !activeSpells.filter(function () { return new RegExp(`^\\s*${spell}$`, 'gm').test($(this).text()); })[0]);
  if (toCast.length) {
    for (let spell of toCast) {
      spell = await getSpell(spell);
      if (spell && spell.element || await refreshSpellbook()) {
        spell.element.click();
      }
    }
  }
      
  /* Auto Actions */
  try {
    const toAction = actionList.filter(action => action.active && action.condition());
    for (const action of toAction) {
      try {
        await action.action.bind(action)();
      } catch (err) {
        console.log("ArcanumScript Action FAILURE:", action.name, err);
      }
    }
  } catch (err) {
    console.log("ArcanumScript ActionCondition FAILURE:", err);
  }

  /* Auto Focus */
  const focus = await getTopAction('focus');
  let mana = getEnergy('mana');
  while (focus && !focus.disabled && mana.percent > 0.15) {
    for (let i = 0; i < 20; i++) {
      focus.click();
    }
    await wait(50); // bar is slow to update, give it time
    mana = getEnergy('mana');
  }
}

async function loop() {
  await initialize();
  console.log('[ArcanumScript] Begin loop');
  while (true) {
    await wait(loopTimeout);
    if (isEnabled) {
      try {
        await execute();
      } catch (err) {
        console.log("ArcanumScript FAILURE:", err);
      }
    }
  }
}

loop();

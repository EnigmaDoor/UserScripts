/*
** Made by Super_Society -- V 0.3.4
**
** Hello new user !
** This script may requires some basic understanding in JS/Scripts.
**		==> Read the documentation carefully at <==
** ==> https://github.com/SyntacticSaIt/UserScripts/tree/master/BattleINF <==
** Any questions asked without reading the doc wont be answered.
*/

// todo in doc separate zone filtering & smart selling
// todo doc GridFusing
// todo doc precise order of execution : auto crafting > zone filtering > grid fusing > smart selling

// todo handle failed craft by updating them from serv again if eventCraft fail -- & fuse too
// todo autocraft : unequip.equip, failcheck
// todo put message if auto crafting is done for one item ? Every time it's found ?

var BFMainScript = (function() {

    /*** SETTINGS ***/
    var settings = {"General": {}, "AutoCrafting": {"Patterns": []}, "ZoneFiltering": {}, "GridFusing": {"Cells": []}, "SmartSelling": {}};

    var buildSettings = function () {
	/*** General Settings ***/
	settings.General.EditEquipped = true;
	settings.General.ChatValidation = {"Validators": {"quality": [2, 128]}};

	/*** Auto Crafting ***/
	settings.AutoCrafting.Patterns.push({"Validators": {"quality": 7}, "Desc": "All quality 7", "Consumed": {"quality": [3, 6]}});
	settings.AutoCrafting.Patterns.push({"Validators": {"quality": 7, "type": "barrelExtender"}, "Desc": "Extenders quality 7", "Consumed": {"quality": [0, 2]}});
	settings.AutoCrafting.Patterns.push({"Validators": {"quality": 6, "mod": [16, 30]}, "Desc": "All quality 6", "Consumed": {"quality": [3, 6]}});
	settings.AutoCrafting.Patterns.push({"Validators": {"quality": 5, "mod": [16, 30]}, "Desc": "All quality 5", "Consumed": {"quality": [2, 5]}});

	//settings.AutoCrafting.Patterns.push({"Validators": {"id": 23486206}, "Desc": "L Scope q6 m15", "Consumed": {"quality": [2, 6]}});

	var ss_types = ['longScope', 'shortScope',
			//'shieldProjector', 'ammoProjector',
			//'dualBatteryShieldGenerator',
			'bottomBatterySmall', 'bottomBatteryLargeA', //'bottomBatteryLargeB',
			//'shieldConnectorA', 'shieldConnectorB',
			//'energyRouterA', 'energyRouterB',
			//'rocketBarrel',
			'barrelSplitterTwo', 'barrelSplitterThree', //'barrelExtender',
                       ];
	settings.ZoneFiltering[0] = {"Validators": [
      	    {"quality": [7, 25]},
            {"mod": 15, "quality": [3, 6], "type": "barrelSplitterTwo"}, // to level up the 7* 2way
            {"mod": [23, 99], "quality": [6, 15], "type": ss_types},
	    {"mod": [23, 99], "quality": [5, 6], "type": dataSymTypes},
            //{"mod": [16, 25], "quality": [6, 15]},
	]};

	/*** GridFusing ***/
	settings.GridFusing.Cells.push({"x": 2, "y": 2, "Desc": "Recharge", "Validators": {"stats": ["recharge"], "quality": [0, 6]}});
	//settings.GridFusing.Cells.push({"x": 2, "y": 8, "Desc": "Clip", "Validators": {"stats": ["clip"], "quality": [0, 6]}});
	settings.GridFusing.Cells.push({"x": 0, "y": 7, "Desc": "Aim", "Validators": {"stats": ["aim"], "quality": [0, 6]}});
	settings.GridFusing.Cells.push({"x": 1, "y": 7, "Desc": "Velocity", "Validators": {"stats": ["velocity"], "quality": [0, 6]}});

	settings.GridFusing.Cells.push({"x": 2, "y": 2, "Desc": "SIMQuality", "Validators": {"stats": ["simulationQualityMagnifier"], "quality": [0, 1]}});
	settings.GridFusing.Cells.push({"x": 1, "y": 4, "Desc": "SIMGravity", "Validators": {"stats": ["simulationGravityBooster"], "quality": [0, 1]}});
	settings.GridFusing.Cells.push({"x": 4, "y": 3, "Desc": "SIMCharge", "Validators": {"stats": ["simulationCharge"], "quality": [0, 1]}});
	settings.GridFusing.Cells.push({"x": 3, "y": 5, "Desc": "SIMShieldReg", "Validators": {"stats": ["simulationShieldRegenMultiplier"], "quality": [0, 1]}});
	settings.GridFusing.Cells.push({"x": 2, "y": 7, "Desc": "SIMDamage", "Validators": {"stats": ["simulationDamageMultiplier"], "quality": [0, 1]}});
	
	/*** Smart Selling ***/
	settings.SmartSelling.Rate = 4000;
	settings.SmartSelling.MinQuality = 3;
	settings.SmartSelling.MinSpace = 3;
	settings.SmartSelling.DeclutterOrder = [["mod", false], ["quality", false], ["plus", true]];
	/* WARNING THIS IS THE ONLY VALUE CAPABLE OF BREAKING YOUR EXISTING ITEMS. Existing items in this quality threshold (inclusive) will be edited/sold ! */
	settings.SmartSelling.DangerousThreshold = [0, 2];

	/* END OF buildSettings() */
	initializeSettings();
    };

    var initializeSettings = function () {
	for (var i = 0; i < settings.GridFusing.Cells.length; i++) {
	    settings.GridFusing.Cells[i].Candidates = [];
	}
    };

    /*** STATIC DATA ***/
    /* Types */
    var dataShieldGeneratorTypes = ['shieldGenerator','dualBatteryShieldGenerator'];
    var dataShieldProjectorTypes = ['ammoProjector', 'shieldProjector'];
    var dataShieldStructuralTypes = ['shieldMagnifier','shieldConnector','shieldRing', 'shieldRingBufferH', 'shieldRingBufferV'];
    var dataShieldBatteryTypes = ['bottomBatterySmall','bottomBatteryLargeA','bottomBatteryLargeB'];
    var dataShieldTypes = dataShieldGeneratorTypes.concat(dataShieldStructuralTypes).concat(dataShieldBatteryTypes).concat(dataShieldProjectorTypes);
    var dataGunBarrelTypes = ['longBarrel','shortBarrel','shortBarrelExtended','longBarrelExtended'];
    var dataGunScopeTypes = ['longScope','shortScope'];
    var dataGunStructuralTypes = ['barrelExtender','barrelSplitterTwo','barrelSplitterThree','verticalGrip','stock'];
    var dataGunClipTypes = ['clip','uClip','barrelClip'];
    var dataGunTypes = dataGunBarrelTypes.concat(dataGunScopeTypes).concat(dataGunStructuralTypes).concat(dataGunClipTypes);
    var dataSimEssentialTypes = ['simulationCombatant', 'simulationCharge'];
    var dataSimBoosterTypes = ['simulationQualityMagnifier', 'simulationChallengeMod', 'simulationGravityBooster'];
    var dataSimPlayerTypes = ['simulationShieldRegenMultiplier', 'simulationAmmoRegenMultiplier', 'simulationDamageMultiplier'];
    var dataSimTypes = dataSimEssentialTypes.concat(dataSimBoosterTypes).concat(dataSimPlayerTypes);
    var dataTypes = dataShieldTypes.concat(dataGunTypes).concat(dataSimTypes);

    /* Zones */
    var dataZones = {"Town": 22,
		     "TrainingArea": 35,
		     "Areas": [82, 91] };
    for (var key in dataZones) {
	var i = 0;
	if (dataZones.hasOwnProperty(key) && Object.prototype.toString.call(dataZones[key]) === '[object Array]') {
	    while (dataZones[key][0] + i <= dataZones[key][1]) {
		dataZones[key.slice(0, -1) + i.toString()] = dataZones[key][0] + i;
		i += 1;
	    }
	}
    }

    /* Tags */
    var tagVoid = 0;
    var tagSell = 1;

    /*** HELPFUL FUNCTIONS ***/
    function isInt(nb) {
	return nb % 1 === 0;
    }

    function validateChatMessage(item, msg) {
	if (itemValidation(item, settings.General.ChatValidation.Validators)) {
	    chatActions.addSystemMessage(msg);
	}
    }

    function getSmartSellingRate() {
	return settings.SmartSelling.Rate;
    }

    function deleteItem(part) {
	if ("locked" in part && part.locked === true) {
	    validateChatMessage(part, 'Couldnt Delete <b class="rarity-' + part.quality + '-text">[+' + part.plus + ' %' + part.mod + '] ' + part.name + '</b> : Locked');
	    return part;
	}
	inventoryActions.scrapPart(part);
	validateChatMessage(part, 'Delete <b class="rarity-' + part.quality + '-text">[+' + part.plus + ' %' + part.mod + '] ' + part.name + '</b>');
	return undefined;
    }

    function maxPlus(item) {
	return (item.quality + 1) * 5;
    }

    function isInInterval(targ, lowb, highb) {
	return targ >= lowb && targ <= highb;
    }

    function craftItem(prim, consum, isMuted) {
	if (typeof(isMuted) === 'undefined') isMuted = false;
	if (prim.id === consum.id
	    || prim.quality > crafting.limits.quality
	    || consum.quality > crafting.limits.quality
	    || prim.plus + consum.plus + 1 > maxPlus(prim)) {
	    return false;
	}
	var isPrimLocked = false;
	if (prim.locked === true) {
	    isPrimLocked = true;
	    inventoryActions.unlockPart(prim);
	}
	if (consum.locked === true) {
	    inventoryActions.unlockPart(consum);
	}
	craftingLib.combine(prim.id, consum.id, true);
	if (! isMuted) {
	    validateChatMessage(prim, '<b class="rarity-' + prim.quality + '-text">[+' + prim.plus + ' %' + prim.mod + '] ' + prim.name + '</b>'
				+ ' <= <b class="rarity-' + consum.quality + '-text">' + "+" + consum.plus + '</b>');
	}
	craftingActions.update();
	if (isPrimLocked) {
	    inventoryActions.lockPart(prim);
	}
	return true;
    }

    function itemValidation(el, valid) {
	var attrib = Object.keys(valid);
	var isValid = true;
	for (var i = 0; isValid && i < attrib.length; i++) {
	    if (Object.prototype.toString.call(valid[attrib[i]]) === '[object Array]') {
		if (! el.hasOwnProperty(attrib[i])) {
		    isValid = false;
		} else if (Object.prototype.toString.call(el[attrib[i]]) === '[object Number]') {
		    if (! isInInterval(el[attrib[i]], valid[attrib[i]][0], valid[attrib[i]][1])) {
			isValid = false;
		    }
		} else if (Object.prototype.toString.call(el[attrib[i]]) === '[object Array]') {
		    for (var y = 0; y < valid[attrib[i]].length && isValid; y++) {
			if (el[attrib[i]].indexOf(valid[attrib[i]][y]) === -1) {
			    isValid = false;
			}
		    }
		} else if (Object.prototype.toString.call(el[attrib[i]]) === '[object Object]') {
		    for (var y = 0; y < valid[attrib[i]].length && isValid; y++) {
			if (! el[attrib[i]].hasOwnProperty(valid[attrib[i]][y])) {
			    isValid = false;
			}
		    }
		} else if (Object.prototype.toString.call(el[attrib[i]]) === '[object String]') {
		    if (valid[attrib[i]].indexOf(el[attrib[i]]) === -1) {
			isValid = false;
		    }
		}
	    } else { // TODO : case if valid is object object
		if (! (el.hasOwnProperty(attrib[i])
		       && el[attrib[i]] === valid[attrib[i]])) {
		    isValid = false;
		}
	    }
	}
	return isValid;
    }

    function itemsFiltering(el, idx, obj) {
	var isItemValid = false;
	for (var i = 0; i < this.length; i++) {
	    var isValid = itemValidation(el, this[i].Validators);
	    if (isValid === true) {
		this[i].Candidates.push(el);
		isItemValid |= isValid;
	    }
	}
	return isItemValid;
    }

    function findItemsCandidatesForRequest(requests, searchEquip) {
	if (searchEquip === true) {
	}
	user.data.inventory.parts.filter(itemsFiltering, requests);
	// equipped : user.data.characters[0].constructions.{mainWeapon/shield}.parts[...].part{id/locked/mod/quality}
    }

    function smartSeller() {
	var itemRequest = [{"Validators": {'tag': tagSell}, "Candidates": []}, {"Validators": {'quality': settings.SmartSelling.DangerousThreshold}, "Candidates": []}];
	findItemsCandidatesForRequest(itemRequest, false);
	var candidatesItem = itemRequest[0].Candidates.concat(itemRequest[1].Candidates);
	candidatesItem = candidatesItem.filter(function(v, i) { return candidatesItem.indexOf(v) == i; });
	/* subset them by mod and types */
	var typesAvailable = candidatesItem.map(function(el) { return el.type; });
	typesAvailable = typesAvailable.filter(function(v, i) { return typesAvailable.indexOf(v) == i; });
	for (var i = 0; i < typesAvailable.length; i++) {
	    var candidatesTypes = candidatesItem.filter(function(el) { return typesAvailable[i] === el.type; });
	    var modsAvailable = candidatesTypes.map(function(el) { return el.mod; });
	    modsAvailable = modsAvailable.filter(function(v, i) { return modsAvailable.indexOf(v) == i; });

	    for (var j = 0; j < modsAvailable.length; j++) {
		var candidates = candidatesTypes.filter(function(el) { return modsAvailable[j] === el.mod; });
		/* Merge them with each other */
		if (candidates.length > 1) {
		    candidates.sort(function(a, b) {
			return b.quality - a.quality || b.plus - a.plus;
		    });
		    while (candidates.length > 1 || (candidates.length === 1 && candidates[0].plus === maxPlus(candidates[0]))) {
			if (candidates[0].plus === maxPlus(candidates[0])) {
			    var toSell = candidates.shift();
			    if (toSell.quality >= settings.SmartSelling.MinQuality) {
				deleteItem(toSell);
			    }
			} else {
			    craftItem(candidates[0], candidates[1], false); /* Same reaction if fail or success */
			    candidates.splice(1, 1); /* Remove consumed from candidates */
			}

		    }
		}
	    }
	}
	inventoryActions.update();

	var overload = user.data.inventory.parts.length - (user.data.properties.maxInventory.parts - settings.SmartSelling.MinSpace);
	if (overload > 0) {
	    var itemRequest = [{"Validators": {'tag': tagSell}, "Candidates": []}, {"Validators": {'quality': settings.SmartSelling.DangerousThreshold}, "Candidates": []}];
	    findItemsCandidatesForRequest(itemRequest, false);
	    var candidates = itemRequest[0].Candidates.concat(itemRequest[1].Candidates);
	    candidates = candidates.filter(function(v, i) { return candidates.indexOf(v) == i; });
	    candidates.sort(function(a, b) {
		/* Test the DeclutterOrder settings in an ordered fashion. Reverse return if [1] is true. */
		for (var i = 0; i < settings.SmartSelling.DeclutterOrder.length; i++) {
		    var attrib = settings.SmartSelling.DeclutterOrder[i];
		    if (a[attrib[0]] !== b[attrib[0]] && attrib[1]) {
			return b[attrib[0]] - a[attrib[0]];
		    } else if (a[attrib[0]] !== b[attrib[0]] && ! attrib[1]) {
			return a[attrib[0]] - b[attrib[0]];
		    }
		}
		return 0;
	    });
	    /* Once they're sorted, sell them */
	    if (overload > candidates.length) { overload = candidates.length; }
	    for (var i = 0; overload - i > 0; i++) {
		deleteItem(candidates[i]);
	    }
	}
	inventoryActions.update();
    }

    /***** TREATMENT *****/
    var newItemEvent = function(newItem) {
	var userLoc = user.data.lastAreaId in settings.ZoneFiltering ? user.data.lastAreaId : 0;

	/*** START Auto Craft ***/
	if (newItem !== undefined) {
	    for (var i = 0; i < settings.AutoCrafting.Patterns.length; i++) {
		settings.AutoCrafting.Patterns[i].Candidates = [];
	    }
	    findItemsCandidatesForRequest(settings.AutoCrafting.Patterns, settings.General.EditEquipped); /* For all primary, find candidates */
	    for (var i = 0; i < settings.AutoCrafting.Patterns.length && newItem !== undefined; i++) { /* Add requests made from Consumed + Mod/type from Candidates */
		for (var j = 0; j < settings.AutoCrafting.Patterns[i].Candidates.length && newItem !== undefined; j++) {
		    var req = jQuery.extend(true, {}, settings.AutoCrafting.Patterns[i].Consumed);
		    req.mod = settings.AutoCrafting.Patterns[i].Candidates[j].mod;
		    req.type = settings.AutoCrafting.Patterns[i].Candidates[j].type;
		    if (req.id !== newItem.id && itemValidation(newItem, req)				/* If newItem validate this request, try craft */
			&& craftItem(settings.AutoCrafting.Patterns[i].Candidates[j], newItem) === true) {
			newItem = undefined
		    }
		}
	    }
	    for (var i = 0; i < settings.AutoCrafting.Patterns.length; i++) {
		delete settings.AutoCrafting.Patterns[i].Candidates;
	    }
	}
	/*** END Auto Craft ***/

	/*** START Smart Zone Filtering ***/
	if (newItem !== undefined) {
	    /* First, merge userLoc & 0 */
	    var isValid = false;
	    var filters = settings.ZoneFiltering[0].Validators;
	    if (userLoc !== 0) {
		filters = filters.concat(settings.ZoneFiltering[userLoc].Validators);
	    }
	    /* Check if newItem validates atleast one Validator */
	    for (var i = 0; i < filters.length; i++) {
		if (itemValidation(newItem, filters[i])) {
		    isValid = true;
		    break;
		}
	    }

	    /* newItem is valid, keep it. */
	    if (isValid) {
		inventoryActions.lockPart(newItem);
		validateChatMessage(newItem, 'Got <b class="rarity-' + newItem.quality + '-text">' + newItem.name + '</b>');
		newItem = undefined;
	    }

	}
	/*** END Smart Zone Filtering ***/

	/*** START Grid Fusing ***/
	if (newItem !== undefined) {
	    if (newItem.quality <= fusing.limits.quality) {
		for (var i = 0; i < settings.GridFusing.Cells.length; i++) {
		    if (itemValidation(newItem, settings.GridFusing.Cells[i].Validators)) {
			fusingLib.fuse(newItem.id, settings.GridFusing.Cells[i].x, settings.GridFusing.Cells[i].y);
			validateChatMessage(newItem, '[' + settings.GridFusing.Cells[i].x + '/' + settings.GridFusing.Cells[i].y + '] ' +
					    '<= <b class="rarity-' + newItem.quality + '-text">[+' + newItem.plus + ' %' + newItem.mod + '] ' + newItem.name + '</b>');
			newItem = undefined;
			break;
		    }
		}
	    }
	}
	/*** END Grid Fusing ***/

	/*** START Smart Selling ***/
	if (newItem !== undefined) {
	    if (settings.SmartSelling.Rate === 0) {
		newItem = deleteItem(newItem);
	    } else if (newItem.quality > crafting.limits.quality) {
		newItem = deleteItem(newItem);
	    } else {
		if (newItem.quality < settings.SmartSelling.DangerousThreshold[0] /* Absolute Rarity where request is */
		    || newItem.quality > settings.SmartSelling.DangerousThreshold[1]) { /* avoided and spared */
		    inventoryLib.setPartTag(newItem, tagSell);
		}
	    }
	    newItem = undefined;
	}
	/*** END Smart Selling ***/
    };

    /*** START ***/
    var start = function () {
	craftingActions.getCraftingLimits();
	fusingLib.getFusingLimits();
	buildSettings();
    };

    /*** PUBLICIZE ***/
    return {
	start: start,
	buildSettings: buildSettings,
	newItemEvent: newItemEvent,
	smartSeller: smartSeller,
	getSmartSellingRate: getSmartSellingRate,
    };
})();

/*** PUBLIC SCOPE FUNCTIONS ***/
function refreshBFMScript() {
    window.BFMainScript = BFMainScript;
    window.BFMainScript.start();
    sock.onevent('newParts', function(data) {
	user.data.inventory.parts.push(data.parts[0]);

	window.BFMainScript.newItemEvent(data.parts[0]);

	userActions.update();
	notificationsActions.update();

	data.scriptEvent = 'newParts';
	ScriptAPI.execute(data);
    });

    if (window.BFMainScript.getSmartSellingRate() > 0) {
	if (typeof window.BFMainScript_Interval !== "undefined") {
	    clearInterval(window.BFMainScript_Interval)
	}
	window.BFMainScript_Interval = setInterval(window.BFMainScript.smartSeller, window.BFMainScript.getSmartSellingRate());
    }
}
console.log(data);
/*** EVENTS CATCHERS ***/
if (data.scriptEvent === "inventoryFull") {
    if (window.BFMainScript.getSmartSellingRate() > 0) {
	clearInterval(window.BFMainScript_Interval)
	inventoryLib.get();
	window.BFMainScript.smartSeller();
	window.BFMainScript_Interval = setInterval(window.BFMainScript.smartSeller, window.BFMainScript.getSmartSellingRate());
    }
}

else if (data.scriptEvent === "scriptSaved") {
    refreshBFMScript();
}

else if (data.scriptEvent === "init") {
    /* Seems to refresh windows when game crash */
    sock.addDoOnClose = sock.addDoOnClose(function() { setTimeout(function() { window.location.reload(); }, 5000); });

    refreshBFMScript();
}

/*** Fix chat scrolling ***/
//$(".system-log-container").scrollTop($(".system-log-container")[0].scrollHeight);

/* 
**
** Made by Super_Society -- V 0.2.6
**
** Hello new user !
** This script may requires some basic understanding in JS/Scripts.
**		==> Read the documentation carefully at <==
** ==> https://github.com/SyntacticSaIt/UserScripts/tree/master/BattleINF <==
** Any questions asked without reading the doc wont be answered.
**
*/

// todo handle failed craft by updating them from serv again if eventCraft fail 
// todo autocraft : unequip.equip, failcheck
// todo autorefresh is sock close
// todo put message if auto crafting is done for one item ? Every time it's found ?

var BFMainScript = (function() {

    /*** SETTINGS ***/
    var settings = {"General": {}, "AutoCrafting": {}, "ZoneFiltering": {}, "SmartSelling": {}};

    var buildSettings = function () {
	/*** General Settings ***/
	settings.General.EditEquipped = true;
	settings.General.ChatValidation = {"Validators": {"quality": [0, 128]}};

	/*** Auto Crafting ***/
	settings.AutoCrafting[18511484] = {"Desc": "Longbarrel q6 m20", "Validators": {"quality": [2, 4]}};
	settings.AutoCrafting[18775716] = {"Desc": "longscope q5 m20", "Validators": {"quality": [2, 4]}};
	settings.AutoCrafting[18701453] = {"Desc": "shortscope q4 m20", "Validators": {"quality": [2, 4]}};
	settings.AutoCrafting[18775183] = {"Desc": "ammo projec q6 m20", "Validators": {"quality": [2, 5]}};
	settings.AutoCrafting[18780673] = {"Desc": "shield projec q5 m20", "Validators": {"quality": [2, 5]}};
	settings.AutoCrafting[18798202] = {"Desc": "shortbarrel e q6 m20", "Validators": {"quality": [2, 5]}};

	/*** Zone Filtering -- AutoSeller ***/
	var ss_types_5 = ['shortScope', 'longScope'];
	var ss_types_6 = ['longBarrelExtended', 'shortBarrelExtended'];
	var ss_types_7 = ['barrelClip', 'verticalGrip', 'shieldGenerator', 'dualBatteryShieldGenerator', 'shieldProjector'];
	var ss_extends = ['barrelExtender','barrelSplitterTwo','barrelSplitterThree'];
	settings.ZoneFiltering[0] = {"Validators": [{"quality": [7, 8]}]};
	settings.ZoneFiltering[91] = {"Validators": [{"quality": [4, 7], "type": ss_types_5},
						     {"quality": [5, 7], "type": ss_types_6},
						     {"quality": [6, 7], "type": ss_types_7}]};

	/*** Smart Selling ***/
	settings.SmartSelling.Rate = 1000;
	settings.SmartSelling.MinQuality = 2;
	settings.SmartSelling.MinSpace = 5;
	settings.SmartSelling.DeclutterOrder = [["mod", false], ["quality", false], ["plus", true]];
	/* WARNING THIS IS THE ONLY VALUE CAPABLE OF BREAKING YOUR EXISTING ITEMS. Existing items in this quality threshold (inclusive) will be edited/sold ! */
	settings.SmartSelling.DangerousThreshold = [0, 2];

	/* END OF buildSettings() */
	initializeSettings();
    };

    var initializeSettings = function () {
	for (var key in settings.AutoCrafting) {
	    settings.AutoCrafting[key].Candidates = [];
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
    var dataTypes = dataShieldTypes.concat(dataGunTypes);

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
    var tagKeep = 2;
    var tag3 = 4;

    /*** HELPFUL FUNCTIONS ***/
    function isInt(nb) {
	return nb % 1 === 0;
    }

    function validateChatMessage(item, msg) {
	if (itemValidation(item, settings.General.ChatValidation.Validators)) {
	    chatActions.addSystemMessage(msg);
	}
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
	if (prim.quality > crafting.limits.rarity
	    || consum.quality > crafting.limits.rarity
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
		    if (false) {
			isValid = false; // TODO not yet managed
		    }
		} else if (Object.prototype.toString.call(el[attrib[i]]) === '[object String]') {
		    if (valid[attrib[i]].indexOf(el[attrib[i]]) === -1) {
			isValid = false;
		    }
		}
	    } else {
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

    function autoCraftSell() {
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
	console.log("OVERLOAD :", overload)
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

    /*** TREATMENT ***/
    var newItemEvent = function(newItem) {
	var userLoc = user.data.lastAreaId in settings.ZoneFiltering ? user.data.lastAreaId : 0;

	/*** START Auto Craft ***/
	if (newItem !== undefined) {
	    var requestPrimaryItems = [];
	    for (var key in settings.AutoCrafting) {
		requestPrimaryItems.push({"Validators": {"id": parseInt(key)}, "Candidates": []}); /* Create a request for each Primary Item... */
	    }
	    findItemsCandidatesForRequest(requestPrimaryItems, settings.General.EditEquipped); /* ... And retrieve them */
	    for (var i = 0; i < requestPrimaryItems.length; i++) { /* Now retrieve mod/type from them and apply it to Consumed Validators */
		if (requestPrimaryItems[i].Candidates.length > 0) {
		    var candidate = requestPrimaryItems[i].Candidates[0];
		    settings.AutoCrafting[candidate.id].ItemRef = candidate;
		    settings.AutoCrafting[candidate.id].Validators.mod = candidate.mod;
		    settings.AutoCrafting[candidate.id].Validators.type = candidate.type;
		}
	    }
	    for (var key in settings.AutoCrafting) { /* Now check if newItem match any craft order */
		if (settings.AutoCrafting[key].hasOwnProperty("ItemRef")
		    && itemValidation(newItem, settings.AutoCrafting[key].Validators)) {
		    if (craftItem(settings.AutoCrafting[key].ItemRef, newItem) === true) {
			newItem = undefined; /* render it unusable if craftItem succeed */
			break;
		    }
		}
	    }
	}
	/*** END Auto Craft ***/
	// First TODO helper function who crawl v in search of ID. Return dict with ID founds, and location, and isEquipped
	// equipped : user.data.characters[0].constructions.{mainWeapon/shield}.parts[...].part{id/locked/mod/quality}
	// inventory : user.data.inventory.parts[..]{id/...}
	// Then TODO compare types/stats etc... first to validate => unequip/craft/equip

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
	    /* if item isn't valid, remove it, else ignore */
	    if (isValid === false) {
		if (settings.SmartSelling.Rate === 0) {
		    newItem = deleteItem(newItem);
		} else if (newItem.quality > crafting.limits.rarity) {
		    newItem = deleteItem(newItem);
		} else {
		    if (newItem.quality < settings.SmartSelling.DangerousThreshold[0] /* Absolute Rarity where request is */
			|| newItem.quality > settings.SmartSelling.DangerousThreshold[1]) { /* avoided and spared */
			inventoryLib.setPartTag(newItem, tagSell);
		    }
		    newItem = undefined; /* Candidates will also find newItem ! */
		}
	    }
	}
	/*** END Smart Zone Filtering ***/

	/* If newItem survived, list in chat */
	if (newItem !== undefined) {
	    inventoryActions.lockPart(newItem);
	    validateChatMessage(newItem, 'Got <b class="rarity-' + newItem.quality + '-text">' + newItem.name + '</b>');
	}
    };

    /*** START ***/
    var start = function () {
	craftingActions.getCraftingLimits();
	buildSettings();
    };

    /*** PUBLICIZE ***/
    return {
	start: start,
	buildSettings: buildSettings,
	newItemEvent: newItemEvent,
	autoCraftSell: autoCraftSell,
	ZFCRefreshRate: settings.SmartSelling.Rate,
    };
})();

/*** PUBLIC SCOPE FUNCTIONS ***/
function refreshBFMScript() {
    sock.onevent('newParts', function(data) {
	user.data.inventory.parts.push(data.parts[0]);

	window.BFMainScript.newItemEvent(data.parts[0]);

	userActions.update();
	notificationsActions.update();

	data.scriptEvent = 'newParts';
	ScriptAPI.execute(data);
    });

    window.BFMainScript = BFMainScript;
    window.BFMainScript.start();

    if (window.BFMainScript.ZFCRefreshRate > 0) {
	clearInterval(window.BFMainScriptLoop)
	window.BFMainScript.Interval = setInterval(window.BFMainScript.autoCraftSell, window.BFMainScript.ZFCRefreshRate);
    }
}

/*** EVENTS CATCHERS ***/
if (data.scriptEvent === "inventoryFull") {
    if (window.BFMainScript.ZFCRefreshRate > 0) {
	clearInterval(window.BFMainScriptLoop)
	inventoryLib.get();
	window.BFMainScript.Interval = setInterval(window.BFMainScript.autoCraftSell, window.BFMainScript.ZFCRefreshRate);
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
$(".system-log-container").scrollTop($(".system-log-container")[0].scrollHeight);

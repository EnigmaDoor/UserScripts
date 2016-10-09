# Battle-INF Scripts

Script for the game Battle-INF. Check it out : battleinf.com:4001/#

- List of features
  - Zone Filtering
  - Auto Crafting
  - Smart Selling

This script is probably incompatible with IE & older versions.

# Using the script

To start using the script, simply copy-paste the content of the JS file into one tab of the "Script" page.  
Then, before saving, I recommend you to carefully read the buildSettings() function and check if you are fine with them.

# Understanding the settings

Those settings are separated into different types, listed above. Before learning about them, let's speak about

### Validators

Validators are tools designed to precisely and quickly identify items (may them be in your inventory, equipped...). For that, you can specify any attributes. If the item validates them all, the item will be considered valid.  
You will usually set an array of Validators. In this case, if the item validates atleast one of them, it will be considered valid.  
For an item to validates an attribute,
- If you add an attribute with exact value (int, string...), the validator and item attribute must match.
- If you use an array of two elements, the attribute will be validated if the item attribute exact value (int) will be inside the interval (inclusive) formed by your array of two elements.
- If you use an array to compare to a string, if this string is found in the list, the item attribute will be validated.
To learn more about the possibles attributes of an item, type console.log(user.data.inventory.parts). This will print in console a list of your items.
To learn more about how the validators are executed, read the "itemValidation(el, valid)" function.

##### Examples:
```javascript
var item1 = {'id': 42, 'plus': 0, 'quality': 7, 'type': 'longScope'};
var item2 = {'id': 10, 'plus': 4, 'quality': 6, 'type': 'clip'};

var yourValidator1 = {'type': ['longScope', 'shortScope']};		// Will return item1
var yourValidator2 = {'type': ['longScope', 'shortScope'], 'id': 10};	// Will return nothing
var yourValidator3 = {'type': 'longScope', 'id': 42};			// Will return item1
var yourValidator4 = {'plus': [0, 5], 'quality': [5, 6]};		// Will return item2
var yourValidator5 = {'plus': [0, 5], 'quality': [5, 7]};		// Will return item1, item2
var yourValidator6 = {'none': 42};					// Will return nothing

var yourValidators1 = [yourValidator1, yourValidator2];			// Will return item1
var yourValidators2 = [yourValidator3, yourValidator4];			// Will return item1, item2
var yourValidators3 = [yourValidator2, yourValidator6];			// Will return nothing
```

### General

You will find here various "General" settings values.
<dl>
  <dt>EditEquipped</dt>
    <dd>Boolean, allows you to Auto Craft equipped items. Currently NOT IMPLEMENTED.</dd>
  <dt>ChatValidation</dt>
    <dd>Will only display events concerning items which validates.</dd>
</dl>

### Auto Crafting

Auto Crafting will ONLY edit items in an explicite way. -For the moment- You can only use ID of items as PRIMARY. That means you have to actually register every item you want to apply Auto Crafting on.  
All new items will then be tested against it. This feature WONT search items currently in inventory to use as Consumed.  
For each new item, this will be tested first, before Zone Filtering.  
Currently, in case of validators overlap, the Consumed attribution is undefined. This will be fixed in the future.

To register a new item, write :
```javascript
settings.AutoCrafting[ITEM_ID] = {"Desc": "QoL script unused by script", "Validators" : {}};
```
You don't have to worry about setting the right type nor mod, script do it himself.

##### Examples:
```javascript
settings.AutoCrafting[18569114] = {"Desc": "gene q5 m20", "Validators": {"quality": [2, 4]}};
// Will upgrade your item of ID 18569114 with all items which quality is equal to 2, 3 or 4.
```

### Zone Filtering

Zone Filtering will be the filter between the items you keep and the items available for Smart Selling. Each Filter will apply to a specific zone, designed by the ID of the zone (Find it in 'World' tab).  
In *addition*, the Filter of ID 0 will apply to ALL zones.

To register a new zone, write :
```javascript
settings.ZoneFiltering[ZONE_ID] = {"Validators": [{}, {}, ...]};
```

##### Examples:
```javascript
var mtypes = ['shortScope', 'longScope'];
settings.ZoneFiltering[0] = {"Validators": [{"quality": [7, 8]}]};
settings.ZoneFiltering[91] = {"Validators": [{"quality": [4, 7], "type": mtypes},
			     		     {"quality": 4, "type": "clip"}]};
// For all zones, will accept all items of quality 7 and 8,
// For zone ID91, will accept shortScope and longScope of quality 4, 5, 6, 7
// For zone ID91, will accept clip of quality 4
```

### Smart Selling

Smart Selling will, if activated, upgrade your rejected items (= not validated by ZoneFiltering) to items of higher rarity before selling them, in order to maximize the gain in credits. This is done by applying a Tag (value = 1) to rejected items.  
*Be careful with this mode, it WILL affects existing items. It WILL affects items you care about, if you misconfigure it.*  
This feature is quite heavy in ressource and requests.

You will find here various "Smart Selling" settings values.
<dl>
  <dt>DangerousThreshold</dt>
    <dd>This threshold (made to reduce requests count) specify than ALL items (existing and new) in threshold (inclusive) WILL be considered "rejected". As such, they wont be Sell-tagged BUT WILL be modified and sold. Use with caution.</dd>
  <dt>Rate</dt>
    <dd>Int, 0 to shut down, else Smart Selling will be run every Rate time (milli-seconds).</dd>
  <dt>MinQuality</dt>
    <dd>Will only sell capped (= max plus) items with quality >= MinQuality.</dd>
  <dt>MinSpace</dt>
    <dd>Will forcefully sell uncapped items (sorted by DeclutterOrder) if there is less than MinSpace space in your inventory.</dd>
  <dt>DeclutterOrder</dt>
    <dd>Will sort items sold by MinSpace. Use Int attributes. Try next attribute if current attribute is equal. False for ascending, True for descending.</dd>
</dl>

# Disclaimer

Obviously, I wont take any responsabilities for any misuses and inventory-wipes you encounter with this script ;)

# Final Words

Glad you hang on to the end ! I am open to any bug reports, typos reports and suggestions !  
Know however than I will *always* point you back to this documentation if you have any questions concerning how this script works. If you did read the entirety of this doc and really can't understand something, ask me with 'SlipDeBain' in your question. Else I will always point you back to this documentation.

Well then, enjoy this script !
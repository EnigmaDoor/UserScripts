// ==UserScript==
// @name        MidenQuest - Low Stamina Alert
// @namespace   https://github.com/SyntacticSaIt/MidenQUest_UserScripts
// @version	0.0.1
// @description MidenQuest Script - alerts when you're running low on stamina
// @author	SyntacticSaIt
// @updateURL	https://raw.githubusercontent.com/SyntacticSaIt/MidenQuest_UserScripts/master/MidenQuest.ui.LowStamina.js
// @include     http://www.midenquest.com/Game.aspx
// @include     http://midenquest.com/Game.aspx
// @grant       none
// ==/UserScript==

var player = document.createElement('audio');

// Users Variables : You're free to edit them.
var alertColorThreshold = 0.10;
var alertAudioThreshold = 0.05;
var intervalCheck = 20 * 1000;
// TODO make the color transition between defaultBodyColor to red =)

player.src = 'http://www.soundjay.com/button/beep-01a.mp3';
player.preload = 'auto';
player.volume = 0.3;
// TODO Edit volume to minvolume & maxvolume and make the sound incremental, 'cause whynot
// End of Users Variables : You're still free to edit if you want =)

var defaultBodyColor = $("body").css("background-color");

var i = setInterval(function() {
            var stam = $("#prgActionOverlay").text().match( /\d+/g );
            if (stam.length < 0 || stam[0] < stam[1] * alertColorThreshold) {
              $("body")[0].style.setProperty("background-color", "red", "important");
              if (stam[0] < stam[1] * alertAudioThreshold) {
                player.play();
              }
            }
            else {
              $("body")[0].style.setProperty("background-color", defaultBodyColor, "important");
            }
          }, intervalCheck);

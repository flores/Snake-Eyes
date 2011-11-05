require.paths.unshift('vendor/node-irc/lib');
require.paths.unshift('vendor/elizabot');

var Client = require('irc').Client,
    http = require('http'),
    ElizaBot = require('elizabot').ElizaBot;
      
var int_Client   = require('irc').Client;
var internal_irc = new int_Client( 'irc.borderstylo.com', 'spirebot', { channels: [ '#shark' ]});

var eliza = new ElizaBot();
// throw away initial (do I need to do this?)
eliza.getInitial();

var join_server  = "chat.freenode.com";
var botname      = "spire_bot";
var join_channel = "#spire";

var irc = new Client( join_server, botname, { channels: [ join_channel ]});

var httpHandler = function (req, res) {
  req.setEncoding('utf8');

  // on POSTs to /room, say body in #room
  req.on('data', function (data) {
    var room = req.url.replace(/\//, '');
    irc.say('#' + room, '\x032' + data);
  });
  req.on('end', function () { res.writeHead(204); res.end(); });
};

irc.on('motd', function () {
  // don't start listening for http traffic until connected on irc
  http.createServer(httpHandler).listen(8124);
});


// if someone joins an inactive room, give them the option to notify a developer
irc.on('join', function (to, nick) {
    // weak sleep
    if ( nick == botname ) return;
    var message_wait = 30000;
    irc.say( to, "hi " + nick );
    var newmessage = 0;
    function waitforNewMessage() {
      irc.on( 'message', function ( nick_last, join_channel, text ) {
        if ( nick_last == nick ) {
          //irc.say ( to, "this is the same guy, so let's pretend it's not a new message" );
          return;
        }
        else
        {
          //irc.say ( to, "i think this is a new message" );
          newmessage = 1
          return;
        }
      });
    };
    
    t = setInterval( waitforNewMessage(), message_wait / 10 );
    
    setTimeout( function() {
      if (newmessage == 0) {
        irc.say( to, "hey " + nick + ". You're free to hang out, but ask me to 'find a dev' and i'll see if nerds are around." );
      }
      clearInterval(t);
    }, message_wait );
});


// simple router
var watchers = [];
var watch = function (pattern, callback) {
  watchers.push({ pattern: pattern, callback: callback });
};

irc.on('message', function (nick, to, text) {
  if (/^#/.test(to) && (/^spire.+/i.test(text))) {
    // general handling of messages to snakeeyes in a channel
    var command = text.substr(10).trim();
    for (var i = 0; i < watchers.length; i++) {
      var watcher = watchers[i];
      if (watcher.pattern.test(command)) {
        watcher.callback(nick, to, command);
        return;
      }
    }
    // default (for command it doesn't understand)
    irc.say(to, nick + ': ' + eliza.transform(command));
    if (eliza.quit) { eliza.reset(); }
  }
  else {
    // responses to all non-command messages
    if (text.toLowerCase().match(/firefox/) && Math.random()<=0.15) {
      irc.say(to, "YOU'RE TEARING ME APART, FIREFOX!");
    }
  }
});

watch(/reload/i, function (nick, to, text) {
  irc.say(to, 'goodbye, cruel world');
	process.exit();
});

watch(/lunch/i, function (nick, to, text) {
  var lunchSpots = [
    "Tere's", 
    "Buddha's Belly",
    "Lulu's",
    "Kokomo",
    "Drinking Lunch",
    "India's Oven",
    "The Indian place next to the German place",
    "Thai spot",
    "Wirsthaus",
    "Tinga",
    "Bulan Thai Vegetarian",
    "M Cafe",
    "LaLa's",
    "Explore Fairfax, you cautious bitches."
  ];
	var lunch = lunchSpots[Math.floor(Math.random()*lunchSpots.length)];
	irc.say(to, 'Today we dine at ' + lunch + '. ' + botname + ' has spoken.');
	// todo: add chance that snakeyes will pick someone from the room at
	// random to choose the lunch spot
});

/* watch(/daniel/i, function (nick, to, text) {
  var danielInsults = [
    "STFU Donny... er, Daniel",
    "Forget it, Daniel, you're out of your element!",
    "Daniel you're out of your element! Dude, the Chinaman is not the issue here!",
    "He peed on the Dude's rug."
  ];
        var insult = danielInsults[Math.floor(Math.random()*danielInsults.length)];
        irc.say(to, insult);
});
*/


// make sure we don't send that notification in the middle of the night
watch(/find a dev/i, function ( nick, to, text ) {
/*    var now  = new Date().getTime();
    var hour = now.getHours();
    var day  = now.getDay();
*/
    //if ( hour >= 10 && hour <= 19 && day >= 1 && day <= 1 ) {
      irc.say( to, "doing it..." );
      internal_irc.say( "#shark", "TEST: hey guys.  " + nick +" is looking for help on #spire at chat.freenode.net" );
      irc.say( to, "pinged the nerds! if they're not here soon, try emailing support@spire.io" );
    //}
    /*else {
      irc.say( join_channel, "i pinged the nerds, but they work in California from 10am - 7pm Pacific." );
      irc.say( join_channel, "you can also email them at support@spire.io" );
    }*/
});

require.paths.unshift('vendor/node-irc/lib');
require.paths.unshift('vendor/elizabot');

var Client = require('irc').Client,
    http = require('http'),
    ElizaBot = require('elizabot').ElizaBot;

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

// simple router
var watchers = [];
var watch = function (pattern, callback) {
  watchers.push({ pattern: pattern, callback: callback });
};

irc.on('message', function (nick, to, text) {
  if (/^#/.test(to) && (/^SnakeEyes:/i.test(text))) {
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

// if someone joins a dead room, give them the option to notify a developer
irc.on('join', function (to, nick) {
    // weak sleep
    if ( nick == botname ) return;
    var message_wait = 60000;
    var now = new Date().getTime();
    irc.say( to, "hi " + nick + ". i see you got here at " + now );
    var newmessage = 0;
    while( new Date().getTime() < now + message_wait ) {
      irc.on( 'message', function ( nick_last, to, text ) {
        if ( nick_last == nick ) {
          irc.say( to, "since this was the same guy, it doesn't count as a message" );
        }
        else
        {
          newmessage = 1;
          irc.say( to, "i think this is a new msg" );
          
        }
      })
    }

    if (newmessage == 0) {
      irc.say( to, "hey " + nick + ". You're free to hang out, but ask me to 'find a dev' and i'll see if nerds are around." );
    }
});

watch(/find a dev/i, function ( nick, to, text ) {
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

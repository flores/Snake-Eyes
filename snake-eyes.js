require.paths.unshift('vendor/node-irc/lib');
require.paths.unshift('vendor/elizabot');

var Client = require('irc').Client,
    http = require('http'),
    ElizaBot = require('elizabot').ElizaBot;

var eliza = new ElizaBot();
// throw away initial (do I need to do this?)
eliza.getInitial();

var irc = new Client('eng.borderstylo.int', 'SnakeEyes', { channels: [ '#clients', '#rd' ]});

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

watch(/reload/i, function (nick, to, text) {
  irc.say(to, 'goodbye, cruel world');
	process.exit();
});

watch(/lunch/i, function (nick, to, text) {
  var lunchSpots = [
    "Tere's",
    "Astro",
    "Peruvian",
    "Grub",
    "Xiomara",
    "Wow Bento",
    "M Cafe",
    "Thai spot",
    "Pavillions Deli",
    "Larchmont",
    "Anarkali",
    "some place with beer.  SnakeEyes likes beer"
  ];
	var lunch = lunchSpots[Math.floor(Math.random()*lunchSpots.length)];
	irc.say(to, 'Today we dine at ' + lunch + '. SnakeEyes has spoken.');
	// todo: add chance that snakeyes will pick someone from the room at
	// random to choose the lunch spot
});

watch(/daniel/i, function (nick, to, text) {
  var danielInsults = [
    "STFU Donny, er, Daniel",
    "Forget it, Daniel, you're out of your element!",
    "Daniel you're out of your element! Dude, the Chinaman is not the issue here!",
    "He peed on the Dude's rug."
  ];
        var insult = danielInsults[Math.floor(Math.random()*danielInsults.length)];
        irc.say(to, insult);
});

require.paths.unshift('vendor/node-irc/lib');

var Client = require('irc').Client;
var http = require('http');


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

irc.on('message', function (nick, to, text) {
  if (/^#/.test(to) && /^SnakeEyes:/.test(text)) {
    // general handling of messages to snakeeyes in a channel
    switch (text) {
      case 'SnakeEyes: reload':
        irc.say(to, 'todo');
        break;
      default:
        irc.say(to, 'willis: what are you talking about?');
    }
  }
});

requires.paths.unshift('vendor/node-irc/lib');

var Client = require('irc').Client;
var http = require('http');

var irc = new Client('eng.borderstylo.int', 'SnakeEyes', { channels: [ '#clients', '#rd' ]});

irc.on('motd', function () {
http.createServer(function (req, res) {
  req.setEncoding('utf8');

  req.on('data', function (data) {
    var room = req.url.replace(/\//, '');
    irc.say('#' + room, '\x032' + data);
  });
  req.on('end', function () {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  });
:}).listen(8124);
});



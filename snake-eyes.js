var jerk = require('jerk');
var http = require('http');

var options = {
  server: 'eng.borderstylo.int',
  nick: 'SnakeEyes',
  channels: ['#rd', '#clients']
};

var irc = jerk(function (j) {}).connect(options);

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
}).listen(8124);

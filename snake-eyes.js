#!/usr/bin/env node

require.paths.unshift('vendor/node-irc/lib');
require.paths.unshift('vendor/elizabot');

var Client           = require('irc').Client;
var http             = require('http');
var ElizaBot         = require('elizabot').ElizaBot;

// configuration
// irc.  server names, guys to auto-op, etc
var botname_public   = "spirebot";
var server_public    = "chat.freenode.com";
var channel_public   = "#spire";
var opusers_public   = [
                       "dyoder",
                       "jxson",
                       "werwolf",
                       "lo-fi"
];

var botname_private  = "snake-eyes";
var server_private   = "irc.borderstylo.com";
var channel_private  = [ 
                       "#clients", 
                       "#ops",
                       "#shark",
                       "#pie"
];
                       
// we make an http server to listen for 
// continuous integration hooks from CI Joe.
var http_port        = 8124;

// #devlife
var lunchSpots       = [
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


// k.


// set up the irc clients
var irc = new Client( 
  server_private, 
  botname_private, 
  { channels: channel_private }
);
var irc_public = new Client( 
  server_public, 
  botname_public, 
  { channels: [ channel_public ] }
);

// set up the http server
var http = require('http');
  
irc.on('motd', function () {
  // don't start listening for http traffic until connected on irc
  http.createServer( httpHandler ).listen( http_port );
});

var httpHandler = function (req, res) {
  req.setEncoding('utf8');

  // on POSTs to /room, say body in #room
  req.on('data', function (data) {
    var room = req.url.replace(/\//, '');
    irc.say('#' + room, '\x032' + data);
  });
  req.on('end', function () { res.writeHead(204); res.end(); });
};

// give it some personality
var eliza = new ElizaBot();
// throw away initial (do I need to do this?)
eliza.getInitial();

// simple router
var watchers = [];
var watch = function (pattern, callback) {
  watchers.push({ pattern: pattern, callback: callback });
};

// op everyone internally
irc.on('join', function (channel, nick) {
  console.log(channel + " is channel and " + nick + " is nick");
  irc.send('mode', channel, '+o', nick);
});

// nerdery on the internal irc server
irc.on('message', function (nick, to, text) {
  var nameRegExp = new RegExp( '^' + botname_private, 'i' );
  if (/^#/.test(to) && (nameRegExp.test(text))) {
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
    // never question snake-eyes
    if ( text.match(/why.+(does|is).+have.+op.+/i) ) {
      irc.send('mode', to, '-o', nick);
      irc.say(to, nick + ": " + botname_private + " has spoken.");
    }
  }
});

watch(/reload/i, function (nick, to, text) {
  irc.say(to, 'goodbye, cruel world');
	process.exit();
});

watch(/lunch/i, function (nick, to, text) {
  var lunch = lunchSpots[Math.floor(Math.random()*lunchSpots.length)];
  irc.say(to, 'Today we dine at ' + lunch + '. ' + botname_private + ' has spoken.');
  // todo: add chance that snakeyes will pick someone from the room at
  // random to choose the lunch spot
});

// nerdery on the external irc server

irc_public.on('join', function(to, nick) {

  // the bot doesn't care about his own messages
  if ( nick == botname_public ) return;

  // auto-op
  if ( opusers_public.indexOf( nick ) ) {
    irc_public.send('mode', to, '+o', nick);
  }

  var message_wait = 60000;
  irc_public.say( to, "hi " + nick );
  var newmessage = 0;
  // if someone joins an inactive room, give them the option to notify a developer
  function waitforNewMessage() {
    irc_public.on( 'message', function ( nick_last, join_channel, text ) {
      if ( nick_last == nick ) {
        //irc.say ( to, "this is the same guy, so let's pretend it's not a new message" );
      }
      else
      {
        //irc.say ( to, "i think this is a new message" );
        newmessage = 1
        return;
      }
    });
  };
  
  // see if anyone is talking
  checkforNewMessage = setInterval( waitforNewMessage(), message_wait / 10 );
    
  setTimeout( function() {
    if (newmessage == 0) {
      irc_public.say( to, "hey " + nick + ". You're free to hang out, but ask me to 'find a dev' and i'll see if nerds are around." );
    }
    clearInterval(checkforNewMessage);
  }, message_wait );
});


irc_public.on('message', function (nick, to, text) {
    if(( /find a dev/.test( text )) && ( nick != botname_public )) {
      // check for work hours
      var now  = new Date();
      var hour = now.getHours();
      var day  = now.getDay();

      if (( hour >= 10 ) && ( hour <= 19 ) && ( day >= 1 ) && ( day <= 5 )) {
        irc_public.say( to, nick + ": doing it..." );
        irc.say( "#shark", "TEST: hey guys.  " + nick +" is looking for help on #spire at chat.freenode.net" );
        irc_public.say( to, nick + ": pinged the nerds! if they're not here soon, try emailing support@spire.io" );
      }
      else {
        irc_public.say( to, nick + ": i'm looking for nerds, but they work in California from 10am - 7pm Pacific, so no promises" );
        irc.say( "#shark", "TEST: hey guys.  " + nick +" is looking for help on #spire at chat.freenode.net." );
        irc.say( "#shark", "TEST: " + nick + " knows it's off hours." );
        irc_public.say( to, nick + ": if no one shows up soon, you can also email them at support@spire.io" );
      }
    }
});


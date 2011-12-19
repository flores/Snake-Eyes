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
                       "#pv",
                       "#mobile"
];

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

// we make an http server to listen for 
// continuous integration hooks from CI Joe.
var http_port        = 8124;

// want the bot to tweet notifications out?
// set this up (move twitter_settings.js.example to twitter_settings.js)
try {
  var twitter_settings = require('./twitter_settings'); 
  var sys   = require('sys');
  var twitter = require('twitter');
  var twit = new twitter({
   consumer_key:        twitter_settings.consumer_key,
   consumer_secret:     twitter_settings.consumer_secret,
   access_token_key:    twitter_settings.access_token_key,
   access_token_secret: twitter_settings.access_token_secret
  });
} catch(e) {
  var twit = undefined;
  console.log("if you'd like to tweet notifications, please move twitter_settings.js.example to twitter_settings.js");
}

// want it to send emails too?  
// set this up (move aws_ses_settings.js.example to aws_ses_settings.js)
try {
  var aws_ses_settings = require('./aws_ses_settings');
  var AmazonSES = require('amazon-ses');
  var ses = new AmazonSES(aws_ses_settings.accesskeyid, aws_ses_settings.secretaccesskey);
} catch(e) {
  var ses = undefined;
  console.log(e);
  console.log("if you'd like to send email notifications, please move aws_ses_settings.js.example to aws_ses_settings.js");
}

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

// give the bot some personality
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
    if ( text.match(/(why|what).+\sop(s)?.*/i) ) {
      irc.send('mode', to, '-o', nick);
      irc.say(to, nick + ": " + botname_private + " has spoken.");
    }
  }
});

// never question snake-eyes on direct messages either.
// doing it twice to use the cool router.
watch(/\sop(s)?.*/i, function (nick, to, text) {
  irc.send('mode', to, '-o', nick);
  irc.say(to, nick + ": " + botname_private + " has spoken.");
});

watch(/reload/i, function (nick, to, text) {
  irc.say(to, 'goodbye, cruel world');
	process.exit();
});

watch(/lunch/i, function (nick, to, text) {
  var now = new Date(); 
  var day = now.getDay();
    
  if (day == 5)
  irc.say(to, 'Today is Friday. We have conquered the week! Today we feast and drink at Wirsthaus! ' + botname_private + ' has spoken.');
  }
  else {
  var lunch = lunchSpots[Math.floor(Math.random()*lunchSpots.length)];  
  irc.say(to, 'Today we dine at ' + lunch + '. ' + botname_private + ' has spoken.');
  // todo: add chance that snakeyes will pick someone from the room at
  // random to choose the lunch spot
  // do I need the now variable? I don't see where it comes in.
  // todo: add a chance that snake-eyes will pick a drinking lunch for fridays.
});

// nerdery on the external irc server

irc_public.on('join', function(to, nick) {

  // the bot doesn't care about his own messages
  if ( nick == botname_public ) return;

  // auto-op
  if ( opusers_public.indexOf( nick ) >= 0 ) {
    irc_public.send('mode', to, '+o', nick);
    return;
  }

  var message_wait = 60000;
  irc_public.say( to, "hi " + nick );
  
  // if someone joins an inactive room, give them the option to 
  // find a developer
  var newmessage = 0;
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
  //    irc_public.say( to, "hey " + nick + ". You're free to hang out, but ask me to 'find a dev' and i'll see if nerds are around." );
      var needshelp = nick +" joined " + channel_public + " at " + server_public ;
      irc_public.say( to, "hey " + nick + ".  I'll see if I can find you a developer.");
      if (twit) {
        twit.updateStatus(twitter_settings.prepend_messages + needshelp, function(data) {
          console.log(data);
        });
      }
      if (ses) {
        ses.send({
          from: aws_ses_settings.sender,
          to: aws_ses_settings.recipients,
          replyTo: aws_ses_settings.replyto,
          subject: needshelp,
          body: {
            text: needshelp,
            html: needshelp
          }
        });
      }
      irc.say( "#shark", "hey guys.  " + needshelp );

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

      var needshelp = nick +" is looking for help on " + channel_public + " at " + server_public ;

      if (( hour >= 10 ) && ( hour <= 19 ) && ( day >= 1 ) && ( day <= 5 )) {
        irc_public.say( to, nick + ": doing it..." );
        irc.say( "#shark", "hey guys.  " + needshelp );
        irc_public.say( to, nick + ": pinged the nerds! if they're not here soon, try emailing support@spire.io" );
      }
      else {
        irc_public.say( to, nick + ": i'm looking for nerds, but they work in California from 10am - 7pm Pacific, so no promises" );
        irc.say( "#shark", "hey guys.  " + needshelp );
        irc.say( "#shark", nick + " knows it's off hours." );
        irc_public.say( to, nick + ": if no one shows up soon, you can also email them at support@spire.io" );
      }

    // tweet it too?
      if (twit) {
        twit.updateStatus(twitter_settings.prepend_messages + needshelp, function(data) {
          console.log(data);
        });
      }

    }
});

// log errors to stdout
irc.on('error', function(text) {
  console.log(text);
});

irc_public.on('error', function(text) {
  console.log(text);
});

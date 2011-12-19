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


watch(/lunch/i, function (nick, to, text) {
  var now = new Date(); 
  var day = now.getDay();
    
  if (day = 5)
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

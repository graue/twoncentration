var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var twitterAPI = require('node-twitter-api');

var app = express();

var config = require('./config');

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(cookieParser());
app.use(session({secret: config.secret}));

var twitter = new twitterAPI({
  consumerKey: config.twitter.key,
  consumerSecret: config.twitter.secret,
  callback: config.publicUrl + 'oauth-callback'
});

var requestTokens = {}; // Map tokens to token secrets
var friendsCache = {}; // Map screen names to previously fetched friends list

var HOUR = 60*60*1000;
var MAX_CACHE_AGE = 5 * HOUR;

function serveErrorPage(res, msg, code) {
  res.writeHead(code || 500, {'content-type': 'text/plain'});
  res.end('Error:\n' + msg);
}

function doTwitterAuth(req, res) {
  twitter.getRequestToken(function(err, reqToken, reqTokenSecret, results) {
    if (err) {
      return serveErrorPage(res, "Couldn't get OAuth request token:\n" + err);
    }
    requestTokens[reqToken] = reqTokenSecret;
    res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' +
      reqToken);
  });
}

function doOAuthCallback(req, res) {
  var reqToken = req.query.oauth_token;
  var reqTokenSecret = requestTokens[reqToken];
  if (!reqTokenSecret) {
    return serveErrorPage(res, 'Request token secret not found.\n' +
      'Try signing in again. Sorry about that.');
  }

  var gotAccessToken = function(err, accessToken, accessTokenSecret, results) {
    if (err) {
      return serveErrorPage(res, "Couldn't get access token:\n" + err);
    }
    var sess = req.session;
    sess.accessToken = accessToken;
    sess.accessSecret = accessTokenSecret;
    twitter.verifyCredentials(accessToken, accessTokenSecret,
      gotVerifiedCredentials);
  };

  var gotVerifiedCredentials = function(err, data, response) {
    if (err) {
      return serveErrorPage(res, "Couldn't verify credentials:\n" + err);
    }
    req.session.screenName = data.screen_name;
    res.redirect(config.publicUrl);
  };

  twitter.getAccessToken(reqToken, reqTokenSecret, req.query.oauth_verifier,
    gotAccessToken);
}

// Fetch and return friends info from Twitter.
function getFriends(req, res) {
  if (!req.session.accessToken) {
    return serveErrorPage(res, "You aren't logged in", 401);
  }

  var screenName = req.session.screenName;

  var gotFriendsList = function(error, data, response) {
    if (error) {
      return serveErrorPage(res, 'Fetching friends list failed:\n ' + error);
    }
    data.expiresAt = Date.now() + MAX_CACHE_AGE;
    friendsCache[screenName] = data;
    var output = JSON.stringify(data.users.map(function(userInfo) {
      return {
        name: userInfo.name,
        screenName: userInfo.screen_name,
        imageUrl: userInfo.profile_image_url.replace(/_normal\./, '_bigger.')
      };
    }));
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(output);
  };

  if ({}.hasOwnProperty.call(friendsCache, screenName)) {
    if (friendsCache[screenName].expiresAt <= Date.now()) {
      delete friendsCache[screenName];
    } else {
      gotFriendsList(null, friendsCache[screenName], '');
      return;
    }
  }

  twitter.friends('list',
    {
      screen_name: screenName,
      count: 200,
      include_user_entities: true
    },
    req.session.accessToken,
    req.session.accessSecret,
    gotFriendsList);
}

function doSignout(req, res) {
  delete req.session.accessToken;
  delete req.session.accessSecret;
  delete req.session.screenName;
  res.redirect(config.publicUrl);
}

app.get('/signin', doTwitterAuth);
app.get('/signout', doSignout);
app.get('/oauth-callback', doOAuthCallback);
app.get('/get-friends', getFriends);
app.get('/', function(req, res) {
  var sess = req.session;
  if (sess.accessToken) {
    res.render('app', {screenName: sess.screenName});
  } else {
    res.render('login');
  }
});
app.use(express.static(__dirname + '/static'));

var port = process.env.TWONCENTRATION_PORT || 3902;
app.listen(port);
console.log('Listening on http://127.0.0.1:' + port);

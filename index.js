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

var requestTokens = {}; // Map from tokens to token secrets

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
    res.redirect('https://twitter.com/oauth/authenticate?oauth_token='
      + reqToken);
  });
}

function doOAuthCallback(req, res) {
  var reqToken = req.query.oauth_token;
  var reqTokenSecret = requestTokens[reqToken];
  if (!reqTokenSecret) {
    return serveErrorPage(res, 'Request token secret not found.\n'
      + 'Try signing in again. Sorry about that.');
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
    req.session.screenName = data['screen_name'];
    res.redirect(config.publicUrl);
  };

  twitter.getAccessToken(reqToken, reqTokenSecret, req.query.oauth_verifier,
    gotAccessToken);
}

app.get('/signin', doTwitterAuth);
app.get('/oauth-callback', doOAuthCallback);
app.get('/session', function(req, res) {
  res.end('The following things are in the session:\n'
    + JSON.stringify(req.session));
});
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

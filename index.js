var express = require('express');
var app = express();

app.use(express.static(__dirname + '/static'));

var port = process.env.TWONCENTRATION_PORT || 3902;
app.listen(port);
console.log('Listening on http://127.0.0.1:' + port);

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());

past_searches = {};
fav = {};
session = NaN;

app.use('/', express.static(__dirname + '/static'));

app.post('/update_session', function(req, res){
    console.log(req.body);
    session = req.body;
    res.json(session);
});

app.post('/add_fav', function(req, res){
    console.log(req.body);
    fav[req.body.name] = req.body;
    res.json(fav);
});

var port = process.argv[2] || 8200;
app.listen(port);
console.log('Server running at http://127.0.0.1:%d', port);
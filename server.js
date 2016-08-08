var http = require('http');
var express = require('express');
var app = express();
//Page renderer
var jade = require('pug');
var bodyParser = require("body-parser");
var mysql = require('mysql');
var jws = require('jsrsasign');
const fs = require('fs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/res/'));
app.set('view engine', 'pug');
require('express-ws')(app);
//Config file
var config = require('./config');
//Load the emojis
var emojis = require('./emojis');

//Create connection details
var connection = mysql.createConnection({
    host : config.db.host,
    user : config.db.user,
    password : config.db.password,
    database : config.db.database,
    charset : 'utf8mb4'
});
connection.connect(function(err) {
    if(err){
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
});

var routes = require('./routes')(app, connection);

// Start the websocket server
var wsServer = app.listen('65080', function () {
    console.log('WebSocket server listening');
});

// Listen for non-websocket connections on port 8080. 
var server = http.createServer(app).listen(process.env.PORT || '8080', function () {
    console.log("Web server listening");
});

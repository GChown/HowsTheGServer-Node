var http = require('http'),
express = require('express'),
app = express(),
bodyParser = require("body-parser"),
mysql = require('mysql');
const fs = require('fs');
require('express-ws')(app);
//Config file
var config = require('./config');
//Load the emojis
var emojis = require('./emojis');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/res/'));

//Create connection details
var sqlDetails =
{
    host : config.db.host,
    user : config.db.user,
    password : config.db.password,
    database : config.db.database,
    charset : 'utf8mb4'
};
var connection = mysql.createConnection(sqlDetails);

connection.connect(function(err) {
    if(err){
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
});
connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
        connection = mysql.createConnection(sqlDetails);
    } else {
        throw err;
    }
});

var routes = require('./routes')(app, connection);

// Start the websocket server
var wsServer = app.listen('65080', function () {
    console.log('WebSocket server listening');
});

// Listen for non-websocket connections on port 8080. 
var server = http.createServer(app).listen(process.env.PORT || '80', function () {
    console.log("Web server listening");
});

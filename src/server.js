var http = require('http'),
https = require('spdy'),
express = require('express'),
app = express(),
cors = require('cors'),
WebSocketServer = require('websocket').server,
bodyParser = require('body-parser'),
mysql = require('mysql'),
path = require('path'),
morgan = require('morgan'),
hsts = require('hsts'),
fs = require('fs'),
//Config file
config = require(__dirname + '/../config'),
emojis = require('./emojis'),
accessLogStream = fs.createWriteStream(path.join(__dirname, '../access.log'), {flags: 'a'});

app.all('*', ensureSecure);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/../public/'));
app.use(cors());
app.use(morgan('combined', {stream: accessLogStream}));
app.use(hsts({
            maxAge: 10886400,
            includeSubDomains: true,
            preload: true
}));

// Create connection details
var sqlDetails = {
    connectionLimit : 10,
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    charset: 'utf8mb4'
};
var connection = mysql.createPool(sqlDetails);

connection.on('error', sqlError);

function sqlConnectionError (err) {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    }

    function sqlError (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            connection = mysql.createConnection(sqlDetails);
        } else {
            connection = mysql.createConnection(sqlDetails);
            throw err;
        }
        }

        var httpsOptions = {
            key: fs.readFileSync(__dirname + '/../privkey.pem', 'utf8'),
            cert: fs.readFileSync(__dirname + '/../cert.pem', 'utf8')
        };

        var server = https.createServer(httpsOptions, app);
        wsServer = new WebSocketServer({
                httpServer: server
        });

        // Route HTTP to HTTPS
        function ensureSecure (req, res, next) {
            if (req.secure) {
                return next();
            }
            res.redirect('https://' + req.hostname + req.url);
        }

        // Listen for HTTP requests so we can redirect them to HTTPS
        http.createServer(app).listen(80);
        server.listen(443, function () {
            console.log('HTTPS server running');
        });

        var routes = require('./routes')(app, connection, wsServer);

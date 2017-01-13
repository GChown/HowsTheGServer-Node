var http = require('http'),
  https = require('spdy'),
  express = require('express'),
  app = express(),
  cors = require('cors'),
  WebSocketServer = require('websocket').server,
  bodyParser = require('body-parser'),
  mysql = require('mysql')
const fs = require('fs')
// Config file
var config = require('./config')
// Load the emojis
var emojis = require('./emojis')

app.all('*', ensureSecure)
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/res/'))
app.use(cors());

// Create connection details
var sqlDetails = {
  connectionLimit : 10,
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  charset: 'utf8mb4'
}
var connection = mysql.createPool(sqlDetails);

//connection.connect(sqlConnectionError)
connection.on('error', sqlError)

function sqlConnectionError (err) {
  if (err) {
    console.error('Error connecting to MySQL: ' + err.stack)
    return
  }
}

function sqlError (err) {
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    connection = mysql.createConnection(sqlDetails)
  } else {
    throw err
    connection = mysql.createConnection(sqlDetails)
  }
}

var httpsOptions = {
  key: fs.readFileSync('privkey.pem', 'utf8'),
  cert: fs.readFileSync('cert.pem', 'utf8')
}

var server = https.createServer(httpsOptions, app)
wsServer = new WebSocketServer({
  httpServer: server
})

// Route HTTP to HTTPS
function ensureSecure (req, res, next) {
  if (req.secure) {
    return next()
  }
  res.redirect('https://' + req.hostname + req.url)
}

// Listen for HTTP requests so we can redirect them to HTTPS
http.createServer(app).listen(80)
server.listen(443, function () {
  console.log('HTTPS server running')
})

var routes = require('./routes')(app, connection, wsServer)

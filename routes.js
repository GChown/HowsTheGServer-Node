var jwt = require('jsonwebtoken');
const fs = require('fs');
var config = require('./config');
var cookieParser = require('cookie-parser');
var emojis = require('./emojis');

module.exports = function(app, connection){
    app.use(cookieParser());

    app.get('/', function(req, res) {
        if(typeof req.cookies.id_token !== 'undefined'){
        verifyToken(req.cookies.id_token, function(isValid){
            var getUser = "SELECT usrname FROM user WHERE googleid = ?";
            connection.query(getUser, isValid.sub, function(err, rows, fields) {
                if(err) console.log(err);
                username = rows[0].usrname;
                res.render('index.pug', {
                    externalIp: "localhost",
                    clientID: config.google.clientID,
                    username: username 
                });
            });
        });
        }else{
        res.render('index.pug', {
            externalIp: "localhost",
            clientID: config.google.clientID,
        });
        }
    });
    
    // Votes websocket endpoint
    app.ws('/votes', function (ws) {
        ws.on('message', function (msg) {
            getScores(function(response){
                ws.send(JSON.stringify(response));
            });
        });
    });


    // Votes http
    app.get('/votes', function (req, res) {
        var scores = getScores(function(response){
            res.json(response);
        });
    });
    //Retrieve number of random emojis for username set/change
    app.get('/emoji/:num', function(req, res){
      res.send(JSON.stringify({emojis: emojis.random(req.params.num) } ));  
    });

    app.post('/comment', function(req, res){
        //verifyToken(req.body.token, function(isValid){
        var isValid = '116549374870986095225';
        var insert = "INSERT INTO comment(text, timesent, googleid) VALUES(?, NOW(), ?);";
        //CHANGE TO : connection.query(insert, [req.text, isValid.sub], function(err, rows, fields) {
        connection.query(insert, [req.body.text, isValid], function(err, rows, fields) {
                if(err) console.log(err);
                if(rows.affectedRows == 1){
                        res.send(JSON.stringify("Success"));
                }else{
                        res.send(JSON.stringify("Fail"));
                }
            });
        //});
    });

    app.post('/rate', function(req, res) {
        //Check the vote is in valid range
        if(req.body.vote > 5 || req.body.vote < 0){
            res.send('error : invalid range');
            return;
            //Might not have a request token
        }else if(typeof req.body.token !== 'undefined'){
        verifyToken(req.body.token, function(isValid){
            if(isValid){
                //Query inserts vote to table
                var insert = "INSERT INTO vote(uid, vote_l, date)" + 
                    " VALUES(?, ?, DATE(NOW())) ON DUPLICATE KEY UPDATE vote_l = ?";
                connection.query(insert, 
                    [isValid.sub, req.body.vote, req.body.vote], 
                    function(err, rows, fields) {
                        if(err){
                            console.log('Error inserting vote: ');
                            console.dir(err);
                        }else if(rows.affectedRows == 1){
                                res.send(JSON.stringify("Success"));
                        }else{
                                res.send(JSON.stringify("Fail"));
                        }
                });
            }
        });
        }else{
            res.send('error : no token sent');
        }
    });

    // Profile websocket
    app.get('/profile/:user', function (req, res){
        if(typeof req.cookies.id_token !== 'undefined'){
            verifyToken(req.cookies.id_token, function(isValid){
                console.dir(isValid);
                //if(isValid.sub == req.params.user){
                res.render('profile.pug', {
                        userID : req.params.user,
                        isUser : true,
                        externalIp: "localhost"
                        });
                //}
            });
        }else{
        var getUser = "SELECT * FROM user WHERE usrname = ?";
        connection.query(getUser, req.params.user, function(err, rows, fields) {
            if (err) console.dir(err);
            if(rows.length == 0){
                res.render('profile.pug', {
                        error : "User " + req.params.user + " not found!",
                        externalIp: "localhost"
                        });
            }else{
                res.render('profile.pug', {
                    userID : req.params.user,
                    externalIp: "localhost"
                });
            }
        });
        }
    });

    app.post('/verifyToken/', function(req, res){
        verifyToken(req.body.token, function(idToken){
            if(idToken){
                res.send('Verified');
            }else{
                res.send('Not verified');
            }

        });
    });

    //Verifies the token_id from Google. 
    //Calls callback with the decoded data if the token is valid,
    //callback with no parameter if the token is not valid.
    function verifyToken(token, callback){
        //Check that there are 3 tokens
        var segments = token.split('.');
        if (segments.length !== 3) {
            throw new Error('Not enough or too many segments in token_id');
            callback();
        }
        var header = JSON.parse(base64urlDecode(segments[0]));

        //Read current tokens from file
        fs.readFile('certs.pem', 'utf8', function (err,data) {
            if (err) {
                downloadPem();
            }
            data = JSON.parse(data);
            if(data[header.kid] != 'undefined'){
                //check signature and return;
                jwt.verify(token, data[header.kid],
                    { algorithms : header.alg }, function(err, decoded) {
                        if(err){
                            console.dir(err);
                            callback();
                        } else {
                            if(decoded.aud == config.google.clientID){
                            callback(decoded);
                            }else{
                                callback();
                            }
                        }
                    });
            } else{
                console.log('Get new file from server');
            }
        });
        function downloadPem(){
            var file = fs.createWriteStream("certs.pem");
            var request = http.get('https://www.googleapis.com/oauth2/v3/certs', function(response) {
                response.pipe(file);
                file.on('finish', function() {
                    file.close(cb);  // close() is async, call cb after close completes.
                });
            }).on('error', function(err) { // Handle errors
                fs.unlink(dest); // Delete the file
                if (cb) cb(err.message);
            });
        };
    }

    function base64urlDecode(str) {
        return new Buffer(base64urlUnescape(str), 'base64').toString();
    };

    function base64urlUnescape(str) {
        str += Array(5 - str.length % 4).join('=');
        return str.replace(/\-/g, '+').replace(/_/g, '/');
    }

    function getScores(callback){
        var returning = [];
        //Query to find average
        var avgQuery = "SELECT AVG(vote_l) avg FROM vote WHERE date = DATE(NOW())";
        connection.query(avgQuery, function getAvg(err, rows, fields) {
            if (err) console.dir(err);
            returning.push({"avg":rows[0].avg});
        });
        //Now for the count 
        countQuery = "SELECT COUNT(vote_l) count FROM vote WHERE date = DATE(NOW());";
        connection.query(countQuery, function getCount(err, rows, fields) {
            if (err) console.dir(err);
            returning.push({"count":rows[0].count});
            callback(returning);
        });
    }
};

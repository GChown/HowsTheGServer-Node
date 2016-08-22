var jwt = require('jsonwebtoken'),
config = require('./config'),
emojis = require('./emojis'),
https = require('https');
const fs = require('fs');

module.exports = function(app, connection){
    //Array of connected sockets - notify when update happens
    var socketList = [];
    // Votes websocket endpoint
    app.ws('/votes', function (ws) {
        socketList.push(ws);
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
    //Insert comment
    app.post('/comment', function(req, res){
        //Check to see if they put in the required params first
        if(typeof req.body.token == 'undefined' || typeof req.body.text == 'undefined'){
            //Send Bad Request error (malformed syntax request)
            res.status(400).send('Malformed Request');
        }else{
            //Check if their token is valid
            verifyToken(req.body.token, function(isValid){
                if(!isValid){
                    //Send 401 Unauthorized error
                    res.status(401).send('Login failed');
                }else{
                var insertTime = Date.now() / 1000;
                var insert = "INSERT INTO comment(text, timesent, googleid) VALUES(?, FROM_UNIXTIME(?), ?);";
                connection.query(insert, [req.body.text, insertTime, isValid.sub], function(err, rows, fields) {
                    if(err){
                        console.log('Error inserting comment: ' + err);
                        res.status(500).send('Internal error inserting comment');
                    }
                    if(rows.affectedRows == 1){
                        //Get commenter's username
                        var userQuery = "SELECT username FROM user WHERE googleid = ?";
                        connection.query(userQuery, isValid.sub, function(err, rows, fields){
                            if(err){
                                console.log('Error finding username: ' + err);
                            }else{
                            var username = rows[0].username;
                            console.log(username);
                            //Send comments to each websocket
                            returning = {
                                text: req.body.text,
                                timesent: insertTime,
                                username: username
                            };
                            var sending = {
                                type: 'comment' ,
                                comments : returning 
                            };
                            sendToSockets(sending);
                            res.status(201).send('Success');
                            }
                        });
                    }else{
                        //There was no comment inserted
                        console.log('No comment inserted:');
                        console.dir(req.body.text);
                        res.status(500).send('Internal error');
                    }
                });
            }
            });
        }
    });

    //Returns comments since :time, a UNIX timestamp
    app.get('/comment/:time', function(req, res){
        getComments(req.params.time, function(response){
            res.send(JSON.stringify(response));
        });
    });

    //Insert a rating
    app.post('/rate', function(req, res) {
        //Check the vote is in valid range
        if(req.body.vote > 5 || req.body.vote < 0){
            //Send Bad Request error (malformed syntax request)
            res.status(400).send('Vote out of valid range');
            //Might not have a request token
        }else if(typeof req.body.token !== 'undefined' || typeof req.body.vote !== 'undefined'){
            verifyToken(req.body.token, function(isValid){
                if(!isValid){
                    //send Unauthorized access error 401
                    res.status(401).send('Login failed');
                }else{
                    //Insert vote to table
                    var insert = "INSERT INTO vote(googleid, vote_l, date)" + 
                        " VALUES(?, ?, DATE(NOW())) ON DUPLICATE KEY UPDATE vote_l = ?";
                    connection.query(insert, 
                        [isValid.sub, req.body.vote, req.body.vote], 
                        function(err, rows, fields) {
                            if(err){
                                console.log('Error inserting vote: ');
                                console.dir(err);
                            }else if(rows.affectedRows == 1){
                                //Notify all webSocket listening that there is a new vote
                                getScores(function(score){
                                    var sending = {
                                            type : 'vote',
                                            score : score
                                    };
                                    sendToSockets(sending);
                                });
                                res.status(201).send('Success');
                            }else{
                                res.status(500).send('Internal error');
                            }
                    });
                }
            });
        }else{
            //No login token sent
            res.status(400).send('No login token sent');
        }
    });
    //Verifies token for Google OAuth
    app.post('/verifyToken/', function(req, res){
        verifyToken(req.body.token, function(idToken){
            if(idToken){
                res.status(500).send('Verified');
            }else{
                //Send error 401
                res.status(401).send('Not verified');
            }

        });
    });

    //Verifies the token_id from Google. 
    //Calls callback with the decoded data if the token is valid,
    //callback with no parameter if the token is not valid.
    //TODO: return HTTP unauthorized error code if token not valid
    function verifyToken(token, callback){
        if(typeof token === 'undefined'){
            callback();
            return;
        }
        //Check that there are 3 tokens
        var segments = token.split('.');
        if (segments.length !== 3) {
            throw new Error('Not enough or too many segments in token_id');
            callback();
            return;
        }
        var header = JSON.parse(base64urlDecode(segments[0]));

        //Read current tokens from file
        fs.readFile('certs.json', 'utf8', function (err,data) {
            if (err) {
                //The file is messed up, download a new one then call this again
                downloadCerts(function(){
                    verifyToken(token, callback);
                });
            }else{
                data = JSON.parse(data);
                //The header's key ID will be in the pem file. 
                //If not, we need to get a new copy of the public certs.
                if(typeof data[header.kid] != 'undefined'){
                    //check signature and return;
                    jwt.verify(token, data[header.kid],
                        { algorithms : header.alg }, function(err, decoded) {
                            if(err){
                                var d = new Date();
                                console.log("Error logging in: " + d.toTimeString());
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
                    downloadCerts(function(){
                        verifyToken(token, callback);  
                    });
                }
            }
        });
        //When the key is not in the file, need to download another one
        function downloadCerts(callback){
            //The key is not in the file, so we need to get a new one.
            var file = fs.createWriteStream("certs.json");
            var request = https.get('https://www.googleapis.com/oauth2/v1/certs', function(response) {
                response.pipe(file);
                file.on('finish', function() {
                    console.log('Finished getting file from server');
                    file.close(callback);  // close() is async, call cb after close completes.
                });
            }).on('error', function(err) { 
            // Something went wrong
            fs.unlink(dest); // Delete the file
            if (callback) callback(err.message);
            });
        }
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

    function getComments(time, callback){
        //Note that mysql unix_timestamp is seconds, so multiply by 1000 to get miliseconds, comparable with javascript version
        var commentQuery = "SELECT text, timesent, user.username FROM comment JOIN user ON comment.googleid = user.googleid WHERE UNIX_TIMESTAMP(timesent) * 1000 > ?";
        connection.query(commentQuery, time, function(err, rows, fields) {
            if(err){
                console.log(err);
                callback();
            }else{
                var returning = [];
                var rowsInserted = 0;
                //Hackish way of adding a callback to forEach:
                rows.forEach(function(data, index, array){
                    returning.push({
                            text: data.text,
                            timesent: data.timesent,
                            username: data.username
                    });
                    rowsInserted++;
                    if(rowsInserted === array.length){
                        callback(returning);
                    }
                });
            }
        });
    };

    //Send data to all websockets. If socket isn't connected, remove it from list.
    function sendToSockets(data){
        socketList.forEach(function(ws){
            if(ws.readyState == 1){
                ws.send(JSON.stringify(data));
            }else{
                socketList.splice(socketList.indexOf(ws), 1);
            }
        });
    }
};

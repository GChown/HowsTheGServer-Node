//Google user's ID token
var id_token;
//Signs in Google user
function onSignIn(googleUser) {
    //id_token is sent with every POST request
    id_token = googleUser.getAuthResponse().id_token;
    //Hide the sign in modal
    $('#googleSignin').hide('fast');
    //Check if user exists and create if they don't
    $.post("/checkUser", { token: id_token });
}

var HTGApp = angular.module('HTGApp', ['ngRoute'])
.controller('mainController', function($scope) {
    $('#aboutLink').click(function(){
        $('#homeLink').removeClass('active');
        $('#aboutLink').addClass('active');
    });
    $('#homeLink').click(function(){
        $('#aboutLink').removeClass('active');
        $('#homeLink').addClass('active');
    });
}).controller('aboutController', function($scope) {
}).controller('voteController', function($scope, $http, webSocket){
//Vote update listener
$scope.sendVote = function(numStars){
    $.ajax({
            type: 'POST',
            url: '/rate',
            data: {
                vote : numStars,
                token : id_token 
            }
    });
    };
    //Initial get vote
    $http.get("/votes").then(function(data) {
        var rating = data.data;
        var avg = rating.avg;
        var count = rating.count;
        //If nobody has voted yet it'll be null
        if(avg == null && count == 0){
            $('#count').html('Nobody has voted on lunch yet!');
        }else{
            if(count == 1){
                $('#count').html(count + ' person has given lunch ' + avg + ' / 5');
            }else{
                $('#count').html(count + ' people have given lunch ' + avg + ' / 5');
            }
        }
    });
    $scope.voteListener = function(data){
        var rating = data;
        var avg = rating.avg;
        var count = rating.count;
        //If nobody has voted yet it'll be null
        if(avg == null && count == 0){
            $('#count').html('Nobody has voted on lunch yet!');
        }else{
            if(count == 1){
                $('#count').html(count + ' person has given lunch ' + avg + ' / 5');
            }else{
                $('#count').html(count + ' people have given lunch ' + avg + ' / 5');
            }
            }
            };
            webSocket.voteListeners.push($scope.voteListener);
}).controller('commentsController', function($scope, $http, webSocket) {
//Array of comments
$scope.comments = [];
//User's profile viewing in modal
$scope.profile = {};
//Retrieve comments
//On initial request, get all comments from today.
//Every 10 seconds after, get comments since most recent check.
var midnight = new Date();
midnight.setHours(0,0,0,0);
$http.get("/comment/" + midnight.getTime())
.then(function(comments) {
    comments.data.forEach(function(dataRetrieved){
        $scope.comments.push({
                text: dataRetrieved.text,
                timesent: dataRetrieved.timesent,
                username: dataRetrieved.username
        });
    });
});
$scope.sendComment = function(){
    var userComment = $('#userComment').val();
    var sendingData = {
        text : userComment,
        token: id_token
    };
    $http.post("/comment", sendingData, function(returned){
    });
    $('#userComment').val('');
}
$scope.commentListener = function(data){
    //Parse date from server
    var date = new Date(data.timesent * 1000);
    $scope.comments.push({
            text: data.text,
            timesent: date,
            username: data.username
    });
    //Must do this to update the ng-repeat comment div
    $scope.$apply();
}
$scope.showUser = function(username){
    $scope.profile.username = username;
    $http.get("/user/" + username).then(function(data) {
        //Dada?
        data = data.data;
        $scope.profile.numRatings = data.votes;
        $scope.profile.numComments = data.comments;
    });
}
webSocket.commentListeners.push($scope.commentListener);
})
//Use this filter to reverse order of comments - newest at top
.filter('reverse', function() {
    return function(items) {
        return items.slice().reverse();
    };
})
.filter('beautifyTime', function($interval) {
    return function(dateString) {
        var returning,
        timeStamp = new Date(Date.parse(dateString)),
        now = new Date(),
        secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;
        if(secondsPast < 60){
            return parseInt(secondsPast) + 's';
        }
        if(secondsPast < 3600){
            return parseInt(secondsPast/60) + 'm';
        }
        if(secondsPast <= 86400){
            return parseInt(secondsPast/3600) + 'h';
        }
        if(secondsPast > 86400){
            day = timeStamp.getDate();
            month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ","");
            year = timeStamp.getFullYear() == now.getFullYear() ? "" :  " "+timeStamp.getFullYear();
            return day + " " + month + year;
        }
    }
})
.filter('refreshAuto', function($filter) {
    return function(items){
        //Update time every second
        return setTimeout(function(){
            $filter('beautifyTime')(items);
        }, 1000);
    }
})
.config(function($routeProvider, $locationProvider) {
    $routeProvider
    .when('/', {
            templateUrl : 'home.html',
            controller  : 'mainController'
    })
    .when('/home', {
            templateUrl : 'home.html',
            controller  : 'mainController'
    })
    .when('/about', {
            templateUrl : 'about.html',
            controller  : 'aboutController'
    });
    $locationProvider.html5Mode(true);
})
//WebSocket functions for realtime communication with server
.service('webSocket', function(){
    //Functions that listen for incoming votes and comments
    var voteListeners = [];
    var commentListeners = [];

    var webSocketHost = location.protocol === 'https:' ? 'wss://' : 'ws://';
    var externalIp = 'localhost';
    var webSocketUri =  webSocketHost + externalIp + ':65080/votes';
    // Establish the WebSocket connection and register event handlers.
    var websocket = new WebSocket(webSocketUri);

    websocket.onclose = function() {
        websocket.close();
        console.log('Closed');
    };
    websocket.onopen = function() {
        console.log('Opened');
    };
    //Server sends new messages on every new comment & vote
    websocket.onmessage = function(e) {
        data = JSON.parse(e.data);
        //Route to the data type
        switch(data['type']){
        case 'vote':
            voteListeners.forEach(function(listener){
                listener(data.score);
            });
            break;
        case 'comment':
            commentListeners.forEach(function(listener){
                listener(data.comments);
            });
            break;
        default:
            console.log('Didn\'t understand that data:');
            console.dir(data);
            break;
        }
    };

    websocket.onerror = function(e) {
        console.log(e);
    };
    return {
        voteListeners : voteListeners,
        commentListeners : commentListeners
    }
});

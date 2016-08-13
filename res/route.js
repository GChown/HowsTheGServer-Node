var HTGApp = angular.module('HTGApp', ['ngRoute'])
.controller('mainController', function($scope) {
}).controller('aboutController', function($scope) {
}).controller('commentsController', function($scope, $http) {
$scope.comments = [];
//Retrieve comments
//On initial request, get all comments from today.
//Every 10 seconds after, get comments since most recent check.
var midnight = new Date();
midnight.setHours(0,0,0,0);
$http.get("/comment/" + midnight)
.then(function(comments) {
    comments.data.forEach(function(dataRetrieved){
        $scope.comments.push({
                text: dataRetrieved.text,
                timesent: dataRetrieved.timesent,
                username: dataRetrieved.usrname
        });
    });
});
var time = Date.now();
var checkInterval = setInterval(function() {
    $http.get("/comment/" + time)
    .then(function(comments) {
        comments.data.forEach(function(dataRetrieved){
            $scope.comments.push({
                    text: dataRetrieved.text,
                    timesent: dataRetrieved.timesent,
                    username: dataRetrieved.usrname
            });
        });
        //Set time to the last time we checked for updates
        time = Date.now();
    });
}, 5000);
})
//Use this filter to reverse order of comments - newest at top
.filter('reverse', function() {
    return function(items) {
        return items.slice().reverse();
    };
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
});

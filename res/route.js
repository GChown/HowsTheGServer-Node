var HTGApp = angular.module('HTGApp', ['ngRoute'])
.controller('mainController', function($scope) {
    $scope.message = 'Everyone come and see how good I look!';
}).controller('aboutController', function($scope) {
    $scope.message = 'Look! I am an about page.';
}).controller('commentsController', function($scope) {
    $scope.comments = [];
    $scope.comments.push({username: 'gordie', comment: 'hi', time: '2016-08-15 12:56 PM'});
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

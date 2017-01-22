// Google user's ID token
var id_token
var address = location.origin
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(function(reg) {
    // updatefound is fired if service-worker.js changes.
    reg.onupdatefound = function() {
      // The updatefound event implies that reg.installing is set; see
      // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
      var installingWorker = reg.installing;

      installingWorker.onstatechange = function() {
        switch (installingWorker.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              // At this point, the old content will have been purged and the fresh content will
              // have been added to the cache.
              // It's the perfect time to display a "New content is available; please refresh."
              // message in the page's interface.
              console.log('New or updated content is available.');
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a "Content is cached for offline use." message.
              console.log('Content is now available offline!');
            }
            break;

          case 'redundant':
            console.error('The installing service worker became redundant.');
            break;
        }
      };
    };
  }).catch(function(e) {
    console.error('Error during service worker registration:', e);
  });
}

var callbackFunc = function () {
  // Signed in with Google
}
// Signs in Google user
function onSignIn (googleUser) {
  // id_token is sent with every POST request
  id_token = googleUser.getAuthResponse().id_token
  $('#loginModal').modal('hide')
  // Hide the sign in modal
  // Check if user exists and create if they don't
  $.post(address + '/checkUser', { token: id_token }, function(data){
        $('#signedin').html('Your username is ' + data)
        //Activate helpful tooltip
        $('#signedin').tooltip(); 
  })
  //Call this function when user has signed in (could be send vote or comment)
  callbackFunc()
}

var HTGApp = angular.module('HTGApp', ['ngRoute'])
  .controller('mainController', function ($scope) {
    $('#aboutLink').click(function () {
      $('#homeLink').removeClass('active')
      $('#aboutLink').addClass('active')
    })
    $('#homeLink').click(function () {
      $('#aboutLink').removeClass('active')
      $('#homeLink').addClass('active')
    })
  }).controller('aboutController', function ($scope) {}).controller('voteController', function ($scope, $http, webSocket) {
    gapi.signin2.render('homeSignIn', {
      'theme': 'dark',
      'onsuccess': onSignIn
    })
  // Vote update listener
    $scope.sendVote = function (numStars) {
      $.post(address + '/rate', {
        vote: numStars,
        token: id_token
      }).fail(function () {
        gapi.signin2.render('googleSignin', {
          'theme': 'dark',
          'onsuccess': onSignIn
        })
        $('#loginModal').modal('show')
        callbackFunc = function () {
          $.post(address + '/rate', {vote: numStars, token: id_token}).fail(function () {
            console.log('Tried to send too many times')
          })
        }
      })
      styleStars(numStars)
    }
  // Initial get vote
    $http.get(address + '/votes').then(function (data) {
      var rating = data.data
      var avg = rating.avg
      var count = rating.count
    // If nobody has voted yet it'll be null
      if (avg == null && count == 0) {
        $('#count').html('Nobody has voted on ' + getMeal() + ' yet!')
      } else {
        avg = Math.round(avg * 10) / 10
        if (count == 1) {
          $('#count').html(count + ' person has given ' + getMeal() + ' ' + avg + ' / 5')
        } else {
          $('#count').html(count + ' people have given ' + getMeal() + ' ' + avg + ' / 5')
        }
      }
    })
    $scope.voteListener = function (data) {
      var rating = data
      var avg = rating.avg
      var count = rating.count
    // If nobody has voted yet it'll be null
      if (avg == null && count == 0) {
        $('#count').html('Nobody has voted on ' + getMeal() + ' yet!')
      } else {
        avg = Math.round(avg * 10) / 10
        if (count == 1) {
          $('#count').html(count + ' person has given ' + getMeal() + ' ' + avg + ' / 5')
        } else {
          $('#count').html(count + ' people have given ' + getMeal() + ' ' + avg + ' / 5')
        }
      }
    }
    webSocket.voteListeners.push($scope.voteListener)
  }).controller('commentsController', function ($scope, $http, webSocket) {
  // Array of comments
    $scope.comments = []
  // User's profile viewing in modal
    $scope.profile = {}
  // Retrieve comments
  // On initial request, get all comments from today.
  // Every 10 seconds after, get comments since most recent check.
    var midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    $http.get(address + '/comment/' + midnight.getTime())
    .then(function (comments) {
      comments.data.forEach(function (dataRetrieved) {
        $scope.comments.push({
          text: dataRetrieved.text,
          timesent: dataRetrieved.timesent,
          username: dataRetrieved.username
        })
      })
    })
    $scope.sendComment = function () {
      var userComment = $('#userComment').val()
          if(userComment.length > 140){
             $('#countdown').fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100)
                 return
          }else if(userComment.length <= 0){
                return 
          }
      var sendingData = {
        text: userComment,
        token: id_token
      }
      $.post(address + '/comment', sendingData).fail(function () {
        gapi.signin2.render('googleSignin', {
          'theme': 'dark',
          'onsuccess': onSignIn
        })
        $('#loginModal').modal('show')
        callbackFunc = function () {
          var sendingData = {
            text: userComment,
            token: id_token
          }
          $.post(address + '/comment', sendingData).fail(function () {
            console.log('Tried too many times to send data')
          })
        }
      })
      $('#userComment').val('')
    }
    $scope.commentListener = function (data) {
    // Parse date from server
      var date = new Date(data.timesent * 1000)
      $scope.comments.push({
        text: data.text,
        timesent: date,
        username: data.username
      })
    // Must do this to update the ng-repeat comment div
      $scope.$apply()
    }
    $scope.showUser = function (username) {
      $scope.profile.username = username
      $http.get(address + '/user/' + username).then(function (data) {
      // Dada?
        data = data.data
        $scope.profile.numRatings = data.votes
        $scope.profile.numComments = data.comments
      })
    }
    updateCountdown();
    $('#userComment').change(updateCountdown);
    $('#userComment').keyup(updateCountdown);
    webSocket.commentListeners.push($scope.commentListener)
  })
  // Use this filter to reverse order of comments - newest at top
  .filter('reverse', function () {
    return function (items) {
      return items.slice().reverse()
    }
  })
  .filter('beautifyTime', function ($interval) {
    return function (dateString) {
      return moment(dateString).fromNow()
    }
  })
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'home.html',
        controller: 'mainController'
      })
      .when('/home', {
        templateUrl: 'home.html',
        controller: 'mainController'
      })
      .when('/about', {
        templateUrl: 'about.html',
        controller: 'aboutController'
      })
    $locationProvider.html5Mode(true)
  })
  // WebSocket functions for realtime communication with server
  .service('webSocket', function () {
    // Functions that listen for incoming votes and comments
    var voteListeners = []
    var commentListeners = []

    var webSocketHost = location.protocol === 'https:' ? 'wss://' : 'ws://'
    var externalIp = location.hostname
    var webSocketUri = webSocketHost + externalIp + '/websocket'
    // Establish the WebSocket connection and register event handlers.
    var websocket = new WebSocket(webSocketUri)

    websocket.onclose = function () {
      websocket.close()
      console.log('Closed')
    }
    websocket.onopen = function () {
      console.log('Opened')
    }
    // Server sends new messages on every new comment & vote
    websocket.onmessage = function (e) {
      data = JSON.parse(e.data)
      // Route to the data type
      switch (data['type']) {
        case 'vote':
          voteListeners.forEach(function (listener) {
            listener(data.score)
          })
          break
        case 'comment':
          commentListeners.forEach(function (listener) {
            listener(data.comments)
          })
          break
        default:
          console.log("Didn't understand that data:")
          console.dir(data)
          break
      }
    }

    websocket.onerror = function (e) {
      console.log(e)
    }
    return {
      voteListeners: voteListeners,
      commentListeners: commentListeners
    }
  })
function getMeal () {
  var insertTime = new Date()
  var hours = insertTime.getHours()
  if (hours < 10) {
    return 'breakfast'
  } else if (hours >= 10 && hours < 16) {
    return 'lunch'
  } else if (hours >= 16) {
    return 'dinner'
  }
}
function styleStars (numStars) {
  $('.star').addClass('notVoted')
  $('.star').removeClass('voted')
  for (var i = 1; i <= numStars; i++) {
    $('#vote_' + i).addClass('voted')
    $('#vote_' + i).removeClass('notVoted')
  }
  $('.notVoted').html('☆')
  $('.voted').html('★')
}
function updateCountdown() {
    // 140 is the max message length
    var remaining = 140 - $('#userComment').val().length;
    $('#countdown').text(remaining);
    if(remaining <=0){
        $('#countdown').attr('style', 'color:red') 
    }else{
        $('#countdown').attr('style', 'color:black') 
    }
}

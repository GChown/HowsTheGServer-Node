
importScripts('js/cache-polyfill.js')
self.addEventListener('install', function (e) {
  e.waitUntil(
        caches.open('howstheg').then(function (cache) {
          return cache.addAll([
            '/',
            '/index.html',
            '/home.html',
            '/about.html',
            '/js/route.js',
            '/js/cache-polyfill.js',
            '/sw.js',
            'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
            'https://code.jquery.com/jquery-3.1.0.js',
            'https://bootswatch.com/yeti/bootstrap.min.css',
            'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.8/angular.js',
            'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.8/angular-route.js'
          ])
        })
        )
})
self.addEventListener('fetch', function(event) {
    //console.log(event.request.url);
    event.respondWith(
            caches.match(event.request).then(function(response) {
                return response || fetch(event.request);
            })
            );
});


importScripts('/js/cache-polyfill.js')
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
            '/js/sw.js'
          ])
        })
        )
})

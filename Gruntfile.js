var swPrecache = require('sw-precache'),
path = require('path');
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
            pkg: grunt.file.readJSON('package.json'),
            swPrecache: {
                dev: {
                    handleFetch: false,
                    rootDir: 'public'
                },
            },
            jshint: {
                all: ['Gruntfile.js', 'src/*.js']
            },
            concat: {
                options: {
                    separator: ';',
                },
                dist: {
                    src: ['src/server.js', 'src/routes.js', 'src/emojis.js'],
                    dest: 'build/server.js',
                },
            },
            uglify: {
                options: {
                    banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
                },
                build: {
                    src: 'build/server.js',
                    dest: 'build/server.min.js'
                }
            }
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');


    // Default task(s).
    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

    grunt.registerMultiTask('swPrecache', function() {
        var done = this.async();
        var rootDir = this.data.rootDir;
        var handleFetch = this.data.handleFetch;

        writeServiceWorkerFile(rootDir, handleFetch, function(error) {
            if (error) {
                grunt.fail.warn(error);
            }
            done();
        });
    });

    function writeServiceWorkerFile(rootDir, handleFetch, callback) {
        var config = {
            staticFileGlobs: [
                'public/**.html',
                'public/assets/images/**.*',
                'public/js/**.js'
                                  ],
                                  stripPrefix: 'public/',
        };
        swPrecache.write(path.join(rootDir, '/service-worker.js'), config, callback);
    }
    };

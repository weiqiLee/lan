var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mqtt = require("mqtt");
var coap = require("coap");
var WebSocketServer = require('ws').Server;
var session = require('express-session');

var routes = require('./server/index');
var loader = require('./loader');
var passport = require('passport');

var app = express();
var configure, start;

configure = function () {
	app.set('views', path.join(__dirname + '/server', 'views'));
	app.set('view engine', 'jade');
  app.set('trust proxy', 1);
  app.use(session({
    secret: 'keyboard cat', //Change this in Production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }));

  app.use(function(req, res, next){
    var err = req.session.error
      , msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
    if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
    next();
  });

  app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: false}));
	app.use(cookieParser());
  app.use(passport.initialize());
  app.use(passport.session());
	app.use(express.static(path.join(__dirname + '/server', 'public')));

	app.use('/', routes);

	app = loader.load(app, 'http');
	app = loader.load(app, 'mqtt');
	app = loader.load(app, 'coap');
	app = loader.load(app, 'websocket');
	return app;
};

start = function (opts, callback) {
	configure();
	app.listen(8899, function () {
		console.log("http server run on http://localhost:8899");
	});


	var server = new WebSocketServer({ port: 8898 });
	app.websocket(server);

	coap.createServer(app.coap).listen(5683, function () {
		console.log("coap server listening on port %d", 5683);
	});

	mqtt.createServer(app.mqtt).listen(1883, function () {
		console.log("mqtt server listening on port %d", 1883);
	});
	return app;
};

if (require.main.filename === __filename) {
	start();
}

module.exports.app = app;
module.exports.configure = configure;
module.exports.start = start;

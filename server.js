var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var winston = require("winston");
var async = require("async");
var _ = require("lodash");

var Workers = require('./server/workers/workers');
var srv = require ("./server/core/srv");
var config = require("./server/core/config");
var logger = srv.logger;

var app = express();
var port = process.env.PORT || 5000;


app.use(express.static(__dirname + "/public"));

var server = http.createServer(app);
server.listen(port);

logger.setLevels(winston.config.syslog.levels);
logger.info("http server listening on %d", port);

var wss = new WebSocketServer({server: server});
logger.info("websocket server created");

wss.on("connection", function(ws) {
	srv.ws = ws;

	var id = setInterval(function() {
    ws.send(JSON.stringify(new Date()), function() {  })
  }, 1000);

  logger.info("websocket connection open");

  ws.on("close", function() {
    logger.info("websocket connection close");
    clearInterval(id)
  })
});

/*
var i, signals = ["SIGTERM"];
for (i in signals) {
	process.on(signals[i], function() {
		srv.workers.closeGracefully(signals[i]);
	});
}
*/

srv.config = _.cloneDeep(config);

srv.db.on('error', function (err) {   // any connection errors will be written to the console
	logger.crit("%s: init_db: %s", srv.name, err.message);
});

srv.workers = new Workers();


var mongodbURI = process.env.MONGOLAB_URI;
if (!mongodbURI) {
	logger.warning("%s: For using mongodb please set environment variable MONGOLAB_URI", srv.name);
	srv.workers.start();
} else {
	logger.info(srv.name, "Connecting to mongodb://" + mongodbURI.replace(/[^@]*@/, ""));
	mongoose.connect(mongodbURI, function(err) {
		if (err) {
			logger.crit(srv.name, " connect_db: %s", err.message);
			logger.crit(srv.name, "Workers not started!");
		} else {
			logger.info(srv.name, "connect_db: mongodb connection successful");
			logger.info(srv.name, "Starting workers");
			srv.workers.start();
		}
	});
}


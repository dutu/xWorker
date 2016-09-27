
const winston = require('winston');
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const morgan = require('morgan');

const Workers = require('./server/workers/workers');
const srv = require ('./server/core/srv');
const config = require('./server/core/config');
const logger = srv.logger;

const routes = require('./routes');
const api = require('./routes/api');

const app = module.exports = express();

const server = http.createServer(app);
const io = require('socket.io')(server);
srv.io = io;

logger.info('Socket.io server created');

/**
 * Configuration
 */

// all environments


app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));

// app.use(bodyParser()); // body-parser deprecated bodyParser: use individual json/urlencoded middlewares
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.set('json spaces', 4);


// development only
if (process.env.NODE_ENV === 'development') {
	app.use(express.errorHandler());
}

// production only
if (env === 'production') {
	// TODO
}

/**
 * Routes
 */

// serve index and view partials
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

// JSON API
app.get('/api/name', api.name);
/*
 app.get('/api/post/:id', api.post);
 app.post('/api/post', api.addPost);
 app.put('/api/post/:id', api.editPost);
 app.delete('/api/post/:id', api.deletePost);
 */

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);

// Socket.io Communication
io.sockets.on('connection',  function (socket) {
	socket.emit('send:name', {
		name: 'Bob'
	});
});

/**
 * Start Server
 */

server.listen(app.get('port'), function () {
	logger.info(`Express server listening on port ${app.get('port')}`);
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
	logger.crit(`${srv.name}: init_db: ${err.message}`);
});

srv.workers = new Workers();


const mongodbURI = process.env.MONGOLAB_URI;
if (!mongodbURI) {
	logger.warning(`${srv.name}: For using mongodb please set environment variable MONGOLAB_URI`);
	srv.workers.start();
} else {
	logger.info(`${srv.name}: Connecting to mongodb://${mongodbURI.replace(/[^@]*@/, "")}`);
	mongoose.connect(mongodbURI, function(err) {
		if (err) {
			logger.crit(`${srv.name}: connect_db: ${err.message}`);
			logger.crit(`${srv.name}: Workers not started!`);
		} else {
			logger.info(`${srv.name}: connect_db: mongodb connection successful`);
			logger.info(`${srv.name}: Starting workers`);
			srv.workers.start();
		}
	});
}


'use strict';

import { runWorkers } from './server/workers/workers.js';

const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const morgan = require('morgan');
const env = require('node-env-file');

const routes = require('./routes');
const api = require('./routes/api');
const app = module.exports = express();

export const httpServer = http.createServer(app);
console.log('HTTP server created');
export const ioSocket = require('socket.io')(httpServer);
console.log('Socket.io server created');


try {
  env('./.env', {verbose: false, overwrite: false});
} catch (err) {
  console.log(err.message);
}



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
if (process.env.NODE_ENV === 'production') {
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
ioSocket.sockets.on('connection',  function (socket) {
  socket.emit('send:name', {
    name: 'Bob'
  });
});

/**
 * HTTP Start Server
 */

httpServer.listen(app.get('port'), function () {
	console.log(`Express server listening on port ${app.get('port')}`);
});


runWorkers();
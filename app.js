
var express   =     require("express");
var app       =     express();
var http 	  = 	require('http').Server(app);
var io 		  = 	require('socket.io')(http);
var shortid   =     require('shortid');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var moment = require('moment');
var mongourl = 'mongodb://streamcal:streamcal@ds037571.mongolab.com:37571/streamcal';
var env = process.env.NODE_ENV || 'development';

app.use('/js',express.static( __dirname + '/lib'));
app.use('/style',express.static( __dirname + '/css'));

var rooms = [];

// Routing
app.get('/', function(req, res){
	//res.send('id: ' + req.query.id);
  res.sendFile(__dirname + '/client/fullcalendar.html');
});

app.get('/:room', function(req, res){
  res.sendFile(__dirname + '/client/fullcalendar.html');
});

// Socket.io
io.on('connection', function(socket) {

	// generate room id, if not requested in URL
	var room_id = (socket.request.headers.referer).split('/')[3];
	if (room_id == '') {
		shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@_');
		room_id = shortid.generate();
	} else {
		// load data from Mongodb
		MongoClient.connect(mongourl, function(err, db) {
      assert.equal(null, err);
      console.log('Connected to Mongodb for loading events in room ' + room_id);
      var collection = db.collection(room_id);
      collection.find().toArray(function(err, docs) {
        assert.equal(null, err);
        //assert.equal(2, docs.length);
        console.log( 'Retrived ' + docs.length + ' events from room ' + room_id );
        socket.join(room_id);
        for (i = 0; i < docs.length; i++) {
            var e = docs[i];
            io.sockets.in(room_id).emit('load_event', e);
        }
        db.close();
	    });
	  });
  }

	socket.emit('room_request', room_id);
	socket.join(room_id);
	console.log('client ' + socket.id + ' connected in room ' + room_id);
	socket.broadcast.to(room_id).emit('messages', 'new client ' + socket.id + 'has connected to this room');
    //socket.emit('updaterooms', rooms, room_id);

	// brodcast the updated client connected in room
	socket.broadcast.to(room_id).emit('userscount', countClientsInRoom(socket.adapter.rooms, room_id));
	console.log('clients '+ countClientsInRoom(socket.adapter.rooms, room_id) + ' in room ' + room_id)

	socket.on('add_event', function(e) {
		console.log("add event " + e._id + " on room " + room_id + " with background "+e.backgroundColor + " with bordercolor "+e.border);
    io.sockets.in(room_id).emit('add_event', e);
		storeEvent('upsert',room_id,e); // update mongodb
	});

	socket.on('remove_event', function(e) {
		console.log("remove event " + e._id + " on room " + room_id + " with background "+e.backgroundColor + " with bordercolor "+e.border);
		io.sockets.in(room_id).emit('remove_event', e);
		storeEvent('remove',room_id,e); // update mongodb
	});

	socket.on('move_event', function(e) {
		console.log("move event " + e._id + " on room " + room_id + " with background "+e.backgroundColor + " with bordercolor "+e.border);
    io.sockets.in(room_id).emit('remove_event', e);
		io.sockets.in(room_id).emit('add_event', e);
		storeEvent('move',room_id,e); // update mongodb
	});

    socket.on('disconnect', function() {
        // socket.leave(room_id); Rooms are left automatically upon disconnection.
        console.log('client ' + socket.id + ' disconnected from room '+ room_id);
        console.log('clients '+ countClientsInRoom(socket.adapter.rooms, room_id) + ' in room ' + room_id)
    });
});


// Express
var port = process.env.PORT || 5000; // Use the port that Heroku provides or default to 5000
http.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});

// Utility methods
function countClientsInRoom(array, room){
	return Object.size(array[room]);
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

// Mongofb storage by event
function storeEvent(action, room, event){
  console.log("store event:" + event.title);
	MongoClient.connect(mongourl, function(err, db) {
	  assert.equal(null, err);
	  	var collection = db.collection(room);
      var now = moment().format('MMMM Do YYYY, h:mm:ss a');

      if(action == 'upsert'){
        event.created_at = now; // add created at field
        event.updated_at = now; // add updated_at field
        collection.save(event);
        console.log("mongodb: stored event " + event._id + " on room " + room);

		  } else if (action == 'remove') {
		  	collection.remove({ _id : event._id }, 1);
        console.log("mongodb: remove event " + event._id + " on room " + room);

		  } else if (action =='move') {
		  	collection.remove({ _id : event._id }, 1);
        event.updated_at = now; // add updated_at field - missing created_at
		  	collection.save(event);
        console.log("mongodb: moved event " + event._id + " on room " + room);
		  }
	  db.close();
	});
}

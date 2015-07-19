
var express   =     require("express");
var app       =     express();
var http 	  = 	require('http').Server(app);
var io 		  = 	require('socket.io')(http);
var shortid   =     require('shortid');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var mongourl = 'mongodb://streamcal:streamcal@ds037571.mongolab.com:37571/streamcal';


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
io.on('connection', function(socket){
	
	// generate room id, if not requested in URL
	var room_id = (socket.request.headers.referer).split('/')[3];
	if (room_id == '') {
		shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@_');
		room_id = shortid.generate();
	} else {
		// load data from mongo
		MongoClient.connect(mongourl, function(err, db) {
		  	assert.equal(null, err);
		  	var collection = db.collection(room_id);
			var docs = collection.find();
			/* collection.find().toArray(function(err, items) {
				console.log('here');
				console.log(items);
				for (i = 0; i < items.length; i++) { 
				    console.log(items[i]);
				}
			});*/
		  db.close();
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
		console.log("dropped event " + e._id + " on room " + room_id + " with background "+e.backgroundColor + " with bordercolor "+e.border);
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

function storeEvent(action, room, event){

	MongoClient.connect(mongourl, function(err, db) {
	  assert.equal(null, err);
	  	var collection = db.collection(room);
		  if(action == 'upsert'){
		  	collection.save(event);
		  } else if (action == 'remove') {
		  	collection.remove({ _id : event._id }, 1);
		  } else if (action =='move') {
		  	collection.remove({ _id : event._id }, 1); 
		  	collection.save(event);
		  }
	  db.close();
	});
}


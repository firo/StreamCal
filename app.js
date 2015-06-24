
var express   =     require("express");
var app       =     express();
var http 	  = 	require('http').Server(app);
var io 		  = 	require('socket.io')(http);
var shortid   =     require('shortid');
var nsc;

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
	
	var room_id = (socket.request.headers.referer).split('/')[3];
	if (room_id == '') {
		shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
		room_id = shortid.generate();
	}
	
	// response room id
	socket.emit('room_request', room_id);
	socket.join(room_id);
	console.log('client ' + socket.id + ' connected in room '+ room_id);
	socket.broadcast.to(room_id).emit('messages', 'new client ' + socket.id + 'has connected to this room');
    socket.emit('updaterooms', rooms, room_id);

	socket.on('add_event', function(e) {
		console.log("dropped event " + e._id + " on room " + room_id + " with background "+e.backgroundColor);
		io.sockets.in(room_id).emit('add_event', e);
	});

	socket.on('remove_event', function(e) {
		console.log("remove event " + e._id + " on room " + room_id + " with background "+e.backgroundColor);
		io.sockets.in(room_id).emit('remove_event', e);
	});

	socket.on('move_event', function(e) {
		console.log("move event " + e._id + " on room " + room_id + " with background "+e.backgroundColor);
		io.sockets.in(room_id).emit('remove_event', e);
		io.sockets.in(room_id).emit('add_event', e);
	});

    socket.on('disconnect', function() {
        socket.leave(room_id);
    });
});


// Express 
http.listen(80, function(){
  console.log('listening on *:80');
});
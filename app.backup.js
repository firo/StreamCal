
var express   =     require("express");
var app       =     express();
var http 	  = 	require('http').Server(app);
var io 		  = 	require('socket.io')(http);
var shortid   =     require('shortid');
var nsc;

app.use('/js',express.static( __dirname + '/lib'));
app.use('/style',express.static( __dirname + '/css'));

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

	var referer = socket.request.headers.referer;
	var req_room = referer.split('/')[3];

	if (req_room == null || req_room == '') {
		// use $ and @ instead of - and _ 
		shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
		var room = shortid.generate();
		socket.room = room;
		socket.emit('requestroom', room);
		console.log('generated room: '+ room);

	} else {
		
		room = req_room;
		socket.join(room);
	}
	
	console.log('client connected in room ' + room);

	socket.on('events', function(e) {

		console.log("dropped event: " + e._id + " on room " + e.room);
	});
});


// Express 
http.listen(3000, function(){
  console.log('listening on *:3000');
});
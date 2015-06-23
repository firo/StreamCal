var redis 	  =     require("redis");

var client1 = redis.createClient('12070', 'pub-redis-12070.eu-west-1-1.1.ec2.garantiadata.com', {no_ready_check: true});
var client2 = redis.createClient('12070', 'pub-redis-12070.eu-west-1-1.1.ec2.garantiadata.com', {no_ready_check: true});

client1.auth('calendarmatch', function (err) {
    if (err) console.log('error auth');
});

client2.auth('calendarmatch', function (err) {
    if (err) console.log('error auth');
});


var msg_count = 0;

// Most clients probably don't do much on "subscribe".  This example uses it to coordinate things within one program.
client1.on("subscribe", function (channel, count) {
    console.log("client1 subscribed to " + channel + ", " + count + " total subscriptions");
    if (count === 2) {
        client2.publish("a nice channel", "I am sending a message.");
        client2.publish("another one", "I am sending a second message.");
        client2.publish("a nice channel", "I am sending my last message.");
    }
});

client1.on("unsubscribe", function (channel, count) {
    console.log("client1 unsubscribed from " + channel + ", " + count + " total subscriptions");
    if (count === 0) {
        client2.end();
        client1.end();
    }
});

client1.on("message", function (channel, message) {
    console.log("client1 channel " + channel + ": " + message);
    msg_count += 1;
    if (msg_count === 3) {
        client1.unsubscribe();
    }
});

client1.on("ready", function () {
    // if you need auth, do it here
    client1.incr("did a thing");
    client1.subscribe("a nice channel", "another one");
});

client2.on("ready", function () {
    // if you need auth, do it here
});
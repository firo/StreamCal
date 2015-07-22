var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
//var mongourl = 'mongodb://streamcal:streamcal@ds037571.mongolab.com:37571/streamcal';
var mongourl = 'mongodb://localhost:27017/streamcal';

var room_id = "NJPhuQow";
MongoClient.connect(mongourl, function(err, db) {
  assert.equal(null, err);
  console.log('Connected to Mongodb');

  var collection = db.collection(room_id);
  //var docs = collection.find();

  collection.find().toArray(function(err, docs) {
    assert.equal(null, err);
    //assert.equal(2, docs.length);
    //console.log( 'numebr of docs in collections ' + docs.length );
    for (i = 0; i < docs.length; i++) {
        console.log(docs[i]);
    }
    db.close();
  });
});

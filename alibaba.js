require('dotenv').config();

var co = require('co');
var OSS = require('ali-oss');
var client = new OSS({
  region: process.env.ALIBABA_OSS_REGION,
  accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET
});

co(function* () {
  client.useBucket(process.env.ALIBABA_OSS_USE_BUCKET);
  /*
  var result = yield client.list({
    'max-keys': 5
  });
  */
  var result = yield client.put('/project/LostArticle/sample.png', '/Users/TakuKobayashi/Desktop/ogp.png');
  console.log(result.url);
  console.log(result);
}).catch(function (err) {
  console.log(err);
});
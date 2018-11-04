var line = require('@line/bot-sdk');

var underscore = require('underscore');
var underscoreString = require("underscore.string");

var applicationName = "LostArticle";
var userStatusEnum = {
  follow: 0,
  unfollow: 1,
}

var DynamoDB = require(__dirname + '/dynamodb.js');
var dynamodb = new DynamoDB();

var LineBot = function(accessToken){
  this.lineClient = new line.Client({channelAccessToken: accessToken});

  this.getUserProfile = function(user_id){
    return this.lineClient.getProfile(user_id);
  }

  this.follow = function(user_id, timestamp) {
    var userProfileObj = {userId: user_id};
    return this.getUserProfile(user_id).then(function(profile){
      userProfileObj = Object.assign(userProfileObj, profile);
      return dynamodb.getPromise("users", {user_id: user_id});
    }).then(function(userData){
      if(userData.Item){
        var updateObject = {
          updated_at: timestamp
        }
        updateObject[applicationName] = userStatusEnum.follow
        return dynamodb.updatePromise("users", {user_id: user_id}, updateObject);
      }else{
        var insertObject = {
          user_id: userProfileObj.userId,
          name: userProfileObj.displayName,
          icon_url: userProfileObj.pictureUrl,
          description: userProfileObj.statusMessage,
          updated_at: timestamp
        }
        insertObject[applicationName] = userStatusEnum.follow
        return dynamodb.createPromise("users", insertObject);
      }
    });
  }

  this.unfollow = function(user_id, timestamp) {
    return dynamodb.getPromise("users", {user_id: user_id}).then(function(userData){
      if(userData.Item){
        var updateObject = {
          updated_at: timestamp
        }
        updateObject[applicationName] = userStatusEnum.unfollow
        return dynamodb.updatePromise("users", {user_id: user_id}, updateObject);
      }
    });
  }

  this.advanced_sequence = function(userId, postbackObj){
    var userProfileObj = {userId: userId};
    return this.getUserProfile(user_id).then(function(profile){
      userProfileObj = Object.assign(userProfileObj, profile);
      return dynamodb.getPromise("users", {user_id: user_id});
    }).then(function(userData){
      var beforeAction = userData.Item.beforeAction;
      var updateObject = {
        beforeAction: postbackObj.action
      }
      return dynamodb.updatePromise("users", {user_id: user_id}, updateObject);
    }).then(function(){
      return new Promise((resolve, reject) => {
        var messageObj = {}
        if(postbackObj.action == "start_register_token"){
          messageObj.type = "text"
          messageObj.text = "謝礼の金額をいくらにしますか?(ETH)"
        }else if(postbackObj.action == "check_registering"){
          messageObj.type = "template"
          messageObj.altText = "現在登録されているものはこちらです"
          messageObj.template = {
            type: "carousel",
            columns: underscore.map([{
              qrcode_url: "https://promonorge.no/wp-content/themes/promowp/framework/etc/image.php?src=https://promonorge.no/wp-content/uploads/importedmedia/qr-markedsforing.jpg&w=auto&h=auto&zc=1&a=c&f=0&q=100",
              resource_id: "aaaaa",
              status: "bbbb",
              price: 0,
            }], function(resource){
              var carouselActions = []
              carouselActions.push({
                type: "postback",
                label: "「なくした」ステータスにする",
                data: JSON.stringify({action: "change_state"})
              });
              return {
                thumbnailImageUrl: resource.qrcode_url,
                title: "ID: " + resource.resource_id + " に登録さてている情報",
                text: "現在のステータス: " + resource.status + "\n謝礼金額(ETH): " + resource.price,
                actions: carouselActions.slice(0,3),
              }
            })
          }
        }else if(postbackObj.action == "check_wallet"){
          messageObj.type = "text"
          messageObj.text = "WalletのAddress: XXXXXXXXXXXX\n現在の金額: 0ETH"
        }else if(postbackObj.action == "announce_lost"){
          messageObj.type = "text"
          messageObj.text = "TOKEN HASHを入力するかQRコードを読み込んでください!!"
        }
        resolve(messageObj);
    });
  }

  this.linkRichMenu = function(userId, richMenuId){
    return this.lineClient.linkRichMenuToUser(userId, richMenuId)
  }

  this.unlinkRichMenu = function(userId){
    return this.lineClient.unlinkRichMenuFromUser(userId)
  }

  this.createRichmenu = function(){
    return this.lineClient.createRichMenu({
      size:{
        width:2500,
        height:1686
      },
      selected: true,
      name: "LostArticle",
      chatBarText: "忘れ物回収メニュー",
      areas:[
        {
          bounds:{
            x:0,
            y:0,
            width:1250,
            height:843
          },
          action:{
            type: "postback",
            data: JSON.stringify({action: "start_register_token"})
          }
        },
        {
          bounds:{
            x:1250,
            y:0,
            width:1250,
            height:843
          },
          action:{
            type: "postback",
            data: JSON.stringify({action: "check_registering"})
          }
        },
        {
          bounds:{
            x: 0,
            y: 843,
            width:1250,
            height:843
          },
          action:{
            type: "postback",
            data: JSON.stringify({action: "check_wallet"})
          }
        },
        {
          bounds:{
            x: 1250,
            y: 843,
            width:1250,
            height:843
          },
          action:{
            type: "postback",
            data: JSON.stringify({action: "announce_lost"})
          }
        }
      ]
    }).then(function(richmenuId){
      console.log(richmenuId);
    }).catch(function(err){
      console.log(err);
      console.log(JSON.stringify(err.originalError.response.data));
    });
  }

  this.setRichmenuImage = function(richMenuId, filePath){
    var fs = require('fs');
    return this.lineClient.setRichMenuImage(richMenuId, fs.readFileSync(filePath));
  }

  this.deleteRichMenu = function(richMenuId){
    return this.lineClient.deleteRichMenu(richMenuId);
  };

  this.getRichMenuList = function(){
    return this.lineClient.getRichMenuList();
  }

  this.isHttpUrl = function(url){
    var pattern = new RegExp('^(https?:\/\/)?' + // protocol
     '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|' + // domain name
     '((\d{1,3}\.){3}\d{1,3}))' + // OR ip (v4) address
     '(\:\d+)?(\/[-a-z\d%_.~+]*)*' + // port and path
     '(\?[;&a-z\d%_.~+=-]*)?' + // query string
     '(\#[-a-z\d_]*)?$','i'); // fragment locater
     return pattern.test(url)
  }
}

module.exports = LineBot;
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
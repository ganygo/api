


var module_holder = {};


global.db={};
global.repoDb={};

var DIR = path_module.join(__dirname, '../db');

global.mongoose = require('mongoose');
global.mongoosePaginate = require('mongoose-paginate-v2');
global.mongooseAggregatePaginate = require('mongoose-aggregate-paginate-v2');
mongoosePaginate.paginate.options = { 
    lean:  true,
    limit: 10
};
// global.autoIncrement = require('mongoose-sequence')(mongoose);

global.ObjectId = mongoose.Types.ObjectId;

mongoose.set('useCreateIndex', true)

global.dbconn = mongoose.createConnection(config.mongodb.address,{ useNewUrlParser: true ,useUnifiedTopology:true });

global.sendToTrash=(conn,collectionName,member,filter,cb)=>{
    conn.model(collectionName).findOne(filter,(err,doc)=>{
        if(!err){
            function silelim(cb1){
                conn.model('recycle').insertMany([{collectionName:collectionName,documentId:doc._id,document:doc,deletedBy:member.username}],(err)=>{
                    if(!err){
                        conn.model(collectionName).deleteOne(filter,(err,doc)=>{
                            cb1(err,doc);
                        });
                    }else{
                        cb1(err);
                    }
                });
            }

            if(conn.model(collectionName).relations){
                var keys=Object.keys(conn.model(collectionName).relations);
                var index=0;

                function kontrolEt(cb2){
                    if(index>=keys.length){
                        cb2(null);
                    }else{
                        var relationFilter={};
                        var k=keys[index];

                        relationFilter[conn.model(collectionName).relations[k]]=doc._id;
                        conn.model(k).countDocuments(relationFilter,(err,c)=>{
                            if(!err){
                                if(c>0){
                                    cb2({name:'RELATION_ERROR',message:"Bu kayit '" + k + "' tablosuna baglidir. Silemezsiniz!"})

                                }else{
                                    index++;
                                    setTimeout(kontrolEt,0,cb2);
                                }
                            }else{
                                cb2(err);
                            }
                        });
                    }
                }

                kontrolEt((err)=>{
                    if(!err){
                        silelim(cb);
                    }else{

                        cb(err);
                    }
                });
            }else{
                silelim(cb);
            }
            
        }else{
            cb(err);
        }
    });
}


global.dberr=(err,cb)=>{
    if(!err){
        return true;
    }else{
        cb({success: false, error: {code: err.name, message: err.message}});
        return false;
    }
}

global.dbnull=(doc,cb)=>{
    if(doc!=null){
        return true;
    }else{
        cb({success: false, error: {code: 'RECORD_NOT_FOUND', message: 'Kayit bulunamadi'}});
        return false;
    }
}


mongoose.set('debug', false);

process.on('SIGINT', function() {  
  mongoose.connection.close(function () { 
    eventLog('Mongoose default connection disconnected through app termination'); 
    process.exit(0); 
  }); 
}); 



function LoadModules(path,callback) {

    //alt directory lere dalmayalim

    fs.readdir(path, function(err, files) {
        var f, l = files.length;
        for (var i = 0; i < l; i++) {
            f = path_module.join(path, files[i]);

            var fileName=path_module.basename(f);
            var suffix='.collection.js';
            var apiName=fileName.substring(0,fileName.length-suffix.length);
            if(apiName!='' && (apiName + suffix)==fileName){
                eventLog('collection ' + apiName.green + ' loaded.' + f);
                module_holder[apiName]=require(f);
            }else{
                
            }
        }
        callback();
    });
   
}

global.loadUserDb=(_id,userDb,userDbHost,dbName,cb)=>{
    if(repoDb[_id]!=undefined){
        eventLog('if(userDb[_id]!=undefined){');
        return cb(null);
    }
    var path = path_module.join(__dirname, '../db/userdb');
    var usrConn = mongoose.createConnection(userDbHost + userDb,{ useNewUrlParser: true, useUnifiedTopology:true});
    usrConn.on('connected', function () {  
        
        var models={};
        fs.readdir(path,(err,repoFiles)=>{
            if(!err){
                for(var i=0;i<repoFiles.length;i++){
                    f = path_module.join(path, repoFiles[i]);
                    var fileName=path_module.basename(f);
                    var suffix='.collection.js';
                    var apiName=fileName.substring(0,fileName.length-suffix.length);
                    if(apiName!='' && (apiName + suffix)==fileName){
                        
                        models[apiName]=require(f)(usrConn);
                       
                    }else{
                        
                    }
                }
                repoDb[_id]=models;
                repoDb[_id]['_id']=_id;
                repoDb[_id]['userDb']=_id;
                repoDb[_id]['dbName']=dbName;
                eventLog('userDb ' + dbName.brightGreen + ' loaded.');
                if(typeof services!='undefined'){
                    eventLog('Yeni veri ambari servisleri baslatiliyor');
                    repoDb[_id]['runUserDbServices']=services.runUserDbServices;
                    repoDb[_id].runUserDbServices();
                }
                cb(null);
            }else{
                errorLog('Mongoose user connection "' + userDbHost + userDb + '" error: ', err);
                cb(err);
            }
            
        });
        
        
    }); 

    usrConn.on('error',function (err) {  
        errorLog('Mongoose user connection "' + userDbHost + userDb + '" error: ', err);
        cb(err);
    }); 
}

function init_userdb(callback){

    db.dbdefines.find({deleted:false,passive:false},(err,docs)=>{
        if(!err){
            var startFunc=(new Date()).yyyymmddhhmmss();
            var veriAmbarlari=[];
            docs.forEach((doc,index)=>{
                doc['finish']=false;
                veriAmbarlari.push(doc);
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
                // veriAmbarlari.push({_id:veriAmbarlari.length.toString(),userDb:doc.userDb,userDbHost:doc.userDbHost,dbName:doc.dbName + veriAmbarlari.length.toString(),finish:false});
            });

            veriAmbarlari.forEach((doc)=>{
                loadUserDb(doc._id,doc.userDb,doc.userDbHost,doc.dbName,(err)=>{
                    doc.finish=true;                    
                });
            });
                       

            function kontrolet(cb){
                var bitmemisVar=false;
                veriAmbarlari.forEach((doc)=>{
                    if(doc.finish==false){
                        bitmemisVar=true;
                        return;
                    }
                });
                if(bitmemisVar){
                    setTimeout(kontrolet,0,cb);
                }else{
                    cb(null);
                }
            }

            kontrolet((err)=>{
                // var endFunc=(new Date()).yyyymmddhhmmss();
                // eventLog('veriAmbarlari.length:',veriAmbarlari.length);
                // eventLog('startFunc:',startFunc);
                // eventLog('endFunc:',endFunc);
                callback(err);
            });
            
        }else{
            callback(err);
        }
    });
}


function init_userdb_eski(cb){
    db.dbdefines.find({deleted:false,passive:false},(err,docs)=>{
        if(!err){
            var index=0;
            

            function baglan(cb){
                if(index>=docs.length){
                    return cb(null);
                }

                loadUserDb(docs[index]._id,docs[index].userDb,docs[index].userDbHost,docs[index].dbName,(err)=>{
                    if(!err){
                        index++;
                        setTimeout(baglan,0,cb);
                    }else{
                        
                    }
                    
                });
            }

            baglan((err)=>{
                cb(err);
            });
            
        }else{
            cb(err);
        }
    });
}

global.epValidateSync=(doc)=>{
    var err = doc.validateSync();
    if(err){
        var keys=Object.keys(err.errors);
        var returnError={name:'VALIDATION_ERROR',message:''}
        for(var i=0;i<keys.length;i++){
            returnError.message +='Hata ' + (i+1).toString() + ':' + err.errors[keys[i]].message;
            if(i<keys.length-1){
                returnError.message +='  |  ';
            }
        }
        
        return returnError;
    }else{
        return err;
    }
}

module.exports=(cb)=>{

    dbconn.on('connected', function () { 
        eventLog('Mongoose default connection open to ' + config.mongodb.address);
        
        LoadModules(DIR,function(err){
            if(err){
                eventLog('ERROR db loading.');
                cb(err);
            }else{
                db=module_holder;

                
                init_userdb(cb);
            }
        });
        
    }); 

    dbconn.on('error',function (err) {  
      eventLog('Mongoose default connection error: ' + err);
      cb(err);
    }); 

    dbconn.on('disconnected', function () {  
      eventLog('Mongoose default connection disconnected'); 
    });
}
// function generate_ResonanceIDs(){
//     db.resonanceids.find({password:'',passive:true}).count(function(err,c){
//         if(err){
//             eventLog('RESONANCE ID uretilemedi  Error:' + err.name + ' - '  + err.message);
//         }else{
//             if(c<1000){

//             }
//             eventLog('generate_ResonanceIDs:' + doc);
//         }
//     });
// }

// function generate_1resonanceID(){
//     var u=uuid.v4();
    
// }
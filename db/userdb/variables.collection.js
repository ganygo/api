module.exports=function(conn){
    var schema = mongoose.Schema({
        parameter: {type: String, trim:true, default:"", unique:true},
        description: {type: String, trim:true, default:"",index:true},
    	value: {type: Object}
    });

    schema.pre('save', function(next) {
        next();
        //bir seyler ters giderse 
        // next(new Error('ters giden birseyler var'));
    });
    schema.pre('remove', function(next) {
        next();
    });

    schema.pre('remove', true, function(next, done) {
        next();
        //bir seyler ters giderse 
        // next(new Error('ters giden birseyler var'));
    });

    schema.on('init', function(model) {
        
    });

    schema.plugin(mongoosePaginate);
 

    var collectionName='variables';
    var model=conn.model(collectionName, schema);
    defaultValues(model);
    model.removeOne=(member, filter,cb)=>{ sendToTrash(conn,collectionName,member,filter,cb); }
    // model.removeMany=(member, filter,cb)=>{ sendToTrashMany(conn,collectionName,member,filter,cb); }
    //model.relations={pos_devices:'location'}

    
    return model;
}

function defaultValues(model){
    var defaulVariables=require('./variables.default.json');
    var keys=Object.keys(defaulVariables);
    var index=0;

    function parametreEkle(cb){
        if(index>=keys.length) return cb(null);
        model.findOne({parameter:keys[index]},(err,doc)=>{
            if(!err){
                if(doc==null){
                    var obj={
                        parameter:keys[index],
                        description:(defaulVariables[keys[index]].description || ''),
                        value:(defaulVariables[keys[index]].value || '')
                    }
                    var newDoc=model(obj);
                    newDoc.save((err,newDoc2)=>{
                        if(!err){
                            console.log('newDoc2:',newDoc2);
                            index++;
                            setTimeout(parametreEkle,0,cb);
                        }else{
                            errorLog(err);
                            cb(err);
                        }
                    })
                }else{
                    index++;
                    setTimeout(parametreEkle,0,cb);
                }
            }else{
                errorLog(err);
                cb(err);
            }
        })
    }

    eventLog('parametreEkle basladi.')
    parametreEkle((err)=>{
        eventLog('parametreEkle bitti.')
    });
}
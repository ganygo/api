module.exports = function(activeDb, member, req, res, callback) {
   
    switch(req.method){
        case 'GET':
        if(req.params.param1!=undefined){
            getOne(activeDb,member,req,res,callback);
        }else{
            getList(activeDb,member,req,res,callback);
        }
        break;
        case 'POST':
        if(req.params.param1=='copy'){
            copy(activeDb,member,req,res,callback);
        }else{
            post(activeDb,member,req,res,callback);
        }
        break;
        case 'PUT':
        put(activeDb,member,req,res,callback);
        break;
        case 'DELETE':
        deleteItem(activeDb,member,req,res,callback);
        break;
        default:
        callback({success: false, error: {code: 'WRONG_METHOD', message: 'Method was wrong!'}});
        break;
    }

}

function copy(activeDb,member,req,res,callback){
    var id=req.params.param2 || req.body['id'] || req.query.id || '';
    var newName=req.body['newName'] || req.body['name'] || '';

    if(id=='') return callback({success: false,error: {code: 'WRONG_PARAMETER', message: 'Para metre hatali'}});
    
    activeDb.pallets.findOne({ _id: id},(err,doc)=>{
        if(dberr(err,callback)) {
            if(dbnull(doc,callback)) {
                var data=doc.toJSON();
                data._id=undefined;
                delete data._id;
                if(newName!=''){
                    data.name=newName;
                }else{
                    data.name +=' copy';
                }
                data.pack=[];
                data.location=undefined;
                delete data.location;
                data.subLocation=undefined;
                delete data.subLocation;
                
                data.createdDate=new Date();
                data.modifiedDate=new Date();
                var newdoc = new activeDb.pallets(data);
                var err=epValidateSync(newdoc);
                if(err) return callback({success: false, error: {code: err.name, message: err.message}});

                newdoc.save(function(err, newdoc2) {
                    if(dberr(err,callback)) {
                        callback({success: true,data: newdoc2});
                    } 
                });
            }
        }
    });
}

function getList(activeDb,member,req,res,callback){
    var options={page: (req.query.page || 1),
        sort:{name:1}
    }
    if(!req.query.page){
        options.limit=50000;
    }
    var filter = {};

    for(var i=0;i<100;i++){
        if(req.query['order'+i]!=undefined){
            var o1=req.query['order'+i];
            var oBy='asc';
            if(o1.substring(0,4)=='desc') oBy='desc';
            if(o1.indexOf('_')>-1){
                var key=o1.substr(o1.indexOf('_')+1);
                if(options['sort']==undefined) options['sort']={};

                if(key.indexOf('.')<0 && key!=''){
                    if(key=='locationTypeName') key='locationType';
                    options['sort'][key]=oBy;
                }
                
            }
        }else{
            break;
        }
    }
    
    if((req.query.name || '')!=''){
        filter['name']={ $regex: '.*' + req.query.name + '.*' ,$options: 'i' };;
    }
    if((req.query.palletType || '')!=''){
        filter['palletType']=req.query.palletType;
    }
    
    if((req.query.passive || '')!=''){
        filter['passive']=req.query.passive;
    }


    activeDb.pallets.paginate(filter,options,(err, resp)=>{
        if (dberr(err,callback)) {
            callback({success: true,data: resp});
        } else {
            errorLog(__filename,err);
        }
    });
}

function getOne(activeDb,member,req,res,callback){
    activeDb.pallets.findOne({_id:req.params.param1},(err,doc)=>{
        if (!err) {
            callback({success: true,data: doc});
        } else {
            callback({success: false, error: {code: err.name, message: err.message}});
        }
    });
}

function post(activeDb,member,req,res,callback){
    var data = req.body || {};
    data._id=undefined;
    
    var newdoc = new activeDb.pallets(data);
    var err=epValidateSync(newdoc);
    if(err) return callback({success: false, error: {code: err.name, message: err.message}});
    newdoc.save(function(err, newdoc2) {
        if (!err) {
            callback({success:true,data:newdoc2});
        } else {
            callback({success: false, error: {code: err.name, message: err.message}});
        }
    });
}

function put(activeDb,member,req,res,callback){
    if(req.params.param1==undefined){
        callback({success: false,error: {code: 'WRONG_PARAMETER', message: 'Para metre hatali'}});
    }else{
        var data=req.body || {};
        data._id = req.params.param1;
        data.modifiedDate = new Date();

        activeDb.pallets.findOne({ _id: data._id},(err,doc)=>{
            if (!err) {
                if(doc==null){
                    callback({success: false,error: {code: 'RECORD_NOT_FOUND', message: 'Kayit bulunamadi'}});
                }else{
                    var doc2 = Object.assign(doc, data);
                    var newdoc = new activeDb.pallets(doc2);
                    var err=epValidateSync(newdoc);
                    if(err) return callback({success: false, error: {code: err.name, message: err.message}});
                    newdoc.save(function(err, newdoc2) {
                        if (!err) {
                            callback({success: true,data: newdoc2});
                        } else {
                            callback({success: false, error: {code: err.name, message: err.message}});
                        }
                    });
                }
            }else{
                callback({success: false, error: {code: err.name, message: err.message}});
            }
        });
    }
}

function deleteItem(activeDb,member,req,res,callback){
    if(req.params.param1==undefined){
        callback({success: false,error: {code: 'WRONG_PARAMETER', message: 'Parametre hatali'}});
    }else{
        var data = req.body || {};
        data._id = req.params.param1;
        activeDb.pallets.removeOne(member,{ _id: data._id},(err,doc)=>{
            if (!err) {
                callback({success: true});
            }else{
                callback({success: false, error: {code: err.name, message: err.message}});
            }
        });
    }
}

exports.yeniFaturaNumarasi=function(dbModel,eIntegratorDoc,newInvoice,cb){
    if(newInvoice.ID.value!='') return cb(null,newInvoice);
    if(newInvoice.issueDate.value.length!=10) return cb(null,newInvoice);
    if(eIntegratorDoc.eInvoice.prefix.length!=3) return cb(null,newInvoice);
    var yil = newInvoice.issueDate.value.substr(0,4);

    dbModel.e_invoices.find({ioType:0, 'ID.value':{'$regex': eIntegratorDoc.eInvoice.prefix + yil + '.*','$options':'i'} }).sort({'ID.value':-1}).limit(1).exec((err,docs)=>{
        if(!err){
            var yeniNo=0;
            var invoiceNum=eIntegratorDoc.eInvoice.prefix + yil;
            if(docs.length>0){
                var s=docs[0].ID.value.substr(7);
                if(!isNaN(s)) yeniNo=Number(s);
            }
            yeniNo++;
            if(yeniNo.toString().length<9){
                for(var i=0;i<(9-yeniNo.toString().length);i++){
                    invoiceNum +='0';
                }
            }
            invoiceNum +=yeniNo.toString();
            newInvoice.ID.value=invoiceNum;
            return cb(null,newInvoice)
        }else{
            return cb(null,newInvoice);
        }
    });
}


exports.kontrolImportEArsiv=function(dbModel,eIntegratorDoc,newInvoice,cb){
    try{
        if(newInvoice.profileId.value == 'IHRACAT' || newInvoice.profileId.value == 'YOLCUBERABERFATURA' || newInvoice.profileId.value =='EARSIVFATURA') return cb(null,newInvoice);
        
        var vergiNo='';
        newInvoice.accountingCustomerParty.party.partyIdentification.forEach((e)=>{
            var schemeID=(e.ID.attr.schemeID || '').toUpperCase();
            if(schemeID=='VKN' || schemeID=='TCKN'){
                vergiNo=e.ID.value;
                return;
            }
        });
        
        if(vergiNo=='') return cb(null,newInvoice);
        db.einvoice_users.findOne({identifier:vergiNo,enabled:true},(err,doc)=>{
            if(!err){
                if(doc==null){
                    eventLog('EARSIVFATURA');
                    newInvoice.profileId.value='EARSIVFATURA';
                }
                cb(null,newInvoice);
            }else{
                cb(null,newInvoice);
            }
        });

    }catch(tryErr){
        errorLog('kontrolImportEArsiv:',tryErr);
        cb(null, newInvoice)
    }
}

exports.insertEInvoice=function(dbModel,eIntegratorDoc,connectorResult,callback){
    try{
        eventLog('insertEInvoice started');
        var connInvoices;
        if(typeof connectorResult=='string'){
           connInvoices=JSON.parse(connectorResult);
        }
        
        var invoices=[];
        if(Array.isArray(connInvoices)){
            invoices=connInvoices;
        }else{
            invoices.push(connInvoices);
        }
        invoices.forEach((e)=>{
            e.invoiceStatus='Draft';
            e.ioType=0;
            e.invoiceErrors=[];
            e.localStatus='transferred';
            e.localErrors=[];
            e.ID='';
            e.eIntegrator=eIntegratorDoc._id;
            e.uuid={value:uuid.v4()};
            if(e.localDocumentId==undefined){
                e.localDocumentId='';
            }
            e=mrutil.amountValueFixed2Digit(e,'');
        });

        var index=0;
        function kaydet(cb){
            if(index>=invoices.length) return cb(null);
            dbModel.e_invoices.findOne({ioType:0, localDocumentId:{$ne:''},localDocumentId:invoices[index].localDocumentId},(err,doc)=>{
                if(!err){
                    if(doc==null){
                        var tempInvoice=(new dbModel.e_invoices(invoices[index])).toJSON();
                        tempInvoice=mrutil.deleteObjectFields(tempInvoice,["_id","__v","createdDate","modifiedDate",'eIntegrator', "pdf", "html"]);
                        tempInvoice=mrutil.deleteObjectProperty(tempInvoice,'_id');

                        var data1=mrutil.eInvoiceSetCurrencyIDs(tempInvoice,tempInvoice.documentCurrencyCode.value);
                        data1['eIntegrator']=eIntegratorDoc._id;
                        var newEInvoice=new dbModel.e_invoices(data1);

                        eInvoiceHelper.yeniFaturaNumarasi(dbModel,eIntegratorDoc,newEInvoice,(err,newEInvoice2)=>{
                            eInvoiceHelper.kontrolImportEArsiv(dbModel,eIntegratorDoc,newEInvoice2,(err,newEInvoice3)=>{
                                newEInvoice3.save((err,newDoc)=>{
                                    if(err){
                                        eventLog('insertEInvoice newEInvoice.save Error:',err);
                                    }else{
                                        eventLog('insertEInvoice newEInvoice.save OK _id:',newDoc._id);
                                    }
                                    index++;
                                    setTimeout(kaydet,0,cb);
                                })
                            })
                        });
                        
                    }else{
                        eventLog('localDocumentId zaten var:',invoices[index].localDocumentId);
                        index++;
                        setTimeout(kaydet,0,cb);
                    }
                }else{
                    cb({code: err.name, message: err.message});
                }
            });
            
        }

        kaydet((err)=>{
            if(err){
                errorLog('insertEInvoice kaydet error:',err);
            }else{
                eventLog('insertEInvoice kaydet basarili');
            }
            
            callback(err);
        })

    }catch(tryErr){
        errorLog('insertEInvoice tryErr:',tryErr);
        callback({code:tryErr.name,message:tryErr.message});
    }
}


exports.findDefaultEIntegrator=function(dbModel,eIntegratorId,callback){
    
    var filter={passive:false}
    if(eIntegratorId){
        filter['_id']=eIntegratorId;
    }
    // dbModel.e_integrators.find(filter).populate(['invoice.xslt','invoice.xsltFiles']).exec((err,docs)=>{
    dbModel.e_integrators.find(filter).exec((err,docs)=>{
        if(!err){
            if(docs.length==0) return callback({code:'RECORD_NOT_FOUND',message:'Aktif GIB entegrator bulunamadi'});
            if(docs.length==1) return callback(null,docs[0]);
            var bFoundDefault=false;
            var foundDoc;
            docs.forEach((e)=>{
                if(e.isDefault){
                    bFoundDefault=true;
                    foundDoc=e;
                    return;
                }
            });
            if(bFoundDefault) return callback(null,foundDoc);
            callback(null,docs[0]);

        }else{
            callback(err);
        }
    });
}

exports.yeniSiparisNumarasi=function(dbModel,eIntegratorDoc,newOrder,cb){
    if(newOrder.ID.value!='') return cb(null,newOrder);
    if(newOrder.issueDate.value.length!=10) return cb(null,newOrder);
    if(eIntegratorDoc.order)
        if(eIntegratorDoc.order.prefix.length!=3) return cb(null,newOrder);
    var yil = newOrder.issueDate.value.substr(0,4);
    console.log('eIntegratorDoc.order.prefix:',eIntegratorDoc.order.prefix);
    dbModel.orders.find({ioType:0, 'ID.value':{'$regex': eIntegratorDoc.order.prefix + yil + '.*','$options':'i'} }).sort({'ID.value':-1}).limit(1).exec((err,docs)=>{
        if(!err){
            var yeniNo=0;
            var invoiceNum=eIntegratorDoc.order.prefix + yil;
            if(docs.length>0){
                var s=docs[0].ID.value.substr(7);
                if(!isNaN(s)) yeniNo=Number(s);
            }
            yeniNo++;
            if(yeniNo.toString().length<9){
                for(var i=0;i<(9-yeniNo.toString().length);i++){
                    invoiceNum +='0';
                }
            }
            invoiceNum +=yeniNo.toString();
            newOrder.ID.value=invoiceNum;
            
            return cb(null,newOrder)
        }else{
            return cb(null,newOrder);
        }
    });
}
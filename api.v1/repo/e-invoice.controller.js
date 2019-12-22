module.exports = function(activeDb, member, req, res, callback) {

    if(req.params.param1==undefined) return callback({success:false,error:{code:'WRONG_PARAMETER',message:'Hatali Parametre'}});
    //if(req.params.param2==undefined) return callback({success:false,error:{code:'WRONG_PARAMETER',message:'Hatali Parametre'}});

    // activeDb.e_integrators.findOne({_id:req.params.param1},(err,eIntegratorDoc)=>{
    //     if(dberr(err,callback)){
    //         if(dbnull(eIntegratorDoc,callback)){
    //             if(eIntegratorDoc.passive)  return callback({success:false,error:{code:'PASSIVE',message:'Entegrator tanimi pasif durumdadir.'}});
    switch(req.method){
        case 'GET':
        switch(req.params.param1.lcaseeng()){
            case 'iseinvoiceuser':
            return isEInvoiceUser(activeDb,member,req,res,callback);
            break;
            case 'inboxinvoicelist':
            return getInvoiceList(1,activeDb,member,req,res,callback);
            break;
            case 'outboxinvoicelist':
            return getInvoiceList(0,activeDb,member,req,res,callback);
            break;
            case 'invoice':
            return getInvoice(activeDb,member,req,res,callback);
            break;
            case 'invoicexmlxslt':
            case 'invoicexml':
            case 'invoicexslt':
            case 'invoicexsltxml':
            return getInvoiceXmlXslt(activeDb,member,req,res,callback);
            break;
            default:
            return callback({success: false, error: {code: 'WRONG_METHOD', message: 'Method was wrong!'}});
            break;
        }

        break;
        default:
        return callback({success: false, error: {code: 'WRONG_METHOD', message: 'Method was wrong!'}});
        break;
    }

            // }
    //     }
    // });


}


function getInvoiceList(ioType,activeDb,member,req,res,callback){
    var options={page: (req.query.page || 1), 
        populate:[
        {path:'eIntegrator',select:'_id eIntegrator username'}
        ],
        limit:10
        ,
        select:'_id profileId ID uuid issueDate issueTime invoiceTypeCode documentCurrencyCode lineCountNumeric pricingExchangeRate accountingCustomerParty accountingSupplierParty legalMonetaryTotal taxTotal withholdingTaxTotal invoiceStatus invoiceErrors localStatus localErrors'
    }

    if((req.query.pageSize || req.query.limit)){
        options['limit']=req.query.pageSize || req.query.limit;
    }

    var filter = {ioType:ioType}
    
    if(req.query.eIntegrator){
        filter['eIntegrator']=req.query.eIntegrator;
    }
    
    if(req.query.date1){
        filter['issueDate.value']={$gte:req.query.date1};
    }

    if(req.query.date2){
        if(filter['issueDate.value']){
            filter['issueDate.value']['$lte']=req.query.date2;
        }else{
            filter['issueDate.value']={$lte:req.query.date2};
        }
    }
    activeDb.e_invoices.paginate(filter,options,(err, resp)=>{
        if (dberr(err,callback)) {
            var liste=[]
            resp.docs.forEach((e,index)=>{
                console.log(e['_id']);
                var obj={}
                obj['_id']=e['_id'];
                obj['ioType']=e['ioType'];
                obj['profileId']=e['profileId'].value;
                obj['ID']=e['ID'].value;
                obj['uuid']=e['uuid'].value;
                obj['issueDate']=e['issueDate'].value;
                obj['issueTime']=e['issueTime'].value;
                obj['invoiceTypeCode']=e['invoiceTypeCode'].value;
                
                obj['accountingParty']={title:'',vknTckn:''}
                if(ioType==0){
                    obj['accountingParty']['title']=e.accountingCustomerParty.party.partyName.name.value;
                    e.accountingCustomerParty.party.partyIdentification.forEach((e2)=>{
                        var schemeID='';
                        if(e2.ID.attr!=undefined){
                            schemeID=(e2.ID.attr.schemeID || '').toLowerCase();
                        }
                        if(schemeID.indexOf('vkn')>-1 || schemeID.indexOf('tckn')>-1){
                            obj['accountingParty']['vknTckn']=e2.ID.value || '';
                            return;
                        }
                    });
                }else{
                    obj['accountingParty']['title']=e.accountingSupplierParty.party.partyName.name.value;
                    e.accountingSupplierParty.party.partyIdentification.forEach((e2)=>{
                        var schemeID='';
                        if(e2.ID.attr!=undefined){
                            schemeID=(e2.ID.attr.schemeID || '').toLowerCase();
                        }
                        
                        if(schemeID.indexOf('vkn')>-1 || schemeID.indexOf('tckn')>-1){
                            obj['accountingParty']['vknTckn']=e2.ID.value || '';
                            return;
                        }

                    });
                }
                obj['payableAmount']=e['legalMonetaryTotal'].payableAmount.value;
                obj['taxExclusiveAmount']=e['legalMonetaryTotal'].taxExclusiveAmount.value;
                obj['taxSummary']={
                    vat1:0,vat8:0,vat18:0,
                    vat0TaxableAmount:0,
                    vat1TaxableAmount:0,
                    vat8TaxableAmount:0,
                    vat18TaxableAmount:0
                }
                var taxTotal=0,withholdingTaxTotal=0;
                e['taxTotal'].forEach((e2)=>{
                    taxTotal=taxTotal + e2.taxAmount.value;
                    e2.taxSubtotal.forEach((e3)=>{
                        switch(e3.percent.value){
                            case 1:
                                obj['taxSummary'].vat1+=e3.taxAmount.value;
                                obj['taxSummary'].vat1TaxableAmount+=e3.taxableAmount.value;
                            break;
                            case 8:
                                obj['taxSummary'].vat8+=e3.taxAmount.value;
                                obj['taxSummary'].vat8TaxableAmount+=e3.taxableAmount.value;
                            break;
                            case 18:
                                obj['taxSummary'].vat18+=e3.taxAmount.value;
                                obj['taxSummary'].vat0TaxableAmount+=e3.taxableAmount.value;
                            break;
                            default:
                                obj['taxSummary'].vat18TaxableAmount+=e3.taxableAmount.value;
                            break;
                        }
                    });
                });
                e['withholdingTaxTotal'].forEach((e2)=>{
                    withholdingTaxTotal=withholdingTaxTotal + e2.taxAmount.value;
                });
                obj['taxTotal']=taxTotal;
                obj['withholdingTaxTotal']=withholdingTaxTotal;
                obj['documentCurrencyCode']=e['documentCurrencyCode'].value;
                obj['exchangeRate']=e['pricingExchangeRate'].calculationRate.value;

                obj['lineCountNumeric']=e['lineCountNumeric'].value;
                obj['invoiceStatus']=e['invoiceStatus'];
                obj['invoiceErrors']=e['invoiceErrors'];
                obj['localStatus']=e['localStatus'];
                obj['localErrors']=e['localErrors'];
                

                liste.push(obj);
            });
            resp.docs=liste;
            callback({success: true,data: resp});
        } else {
            console.log('error:',err);
        }
    });


}
function getInvoice(activeDb,member,req,res,callback){
    var _id= req.params.param2 || req.query._id || '';
    if(_id=='') return callback({success:false,error:{code:'WRONG_PARAMETER',message:'Hatali Parametre'}});
    activeDb.e_invoices.findOne({_id:_id},(err,doc)=>{
        if(dberr(err,callback))
            if(dbnull(doc,callback)){
                var data=doc.toJSON();
                callback({success: true,data: data});
            }
        });
}
function getInvoiceXmlXslt(activeDb,member,req,res,callback){
    var _id= req.params.param2 || req.query._id || '';
    if(_id=='') return callback({success:false,error:{code:'WRONG_PARAMETER',message:'Hatali Parametre'}});
    activeDb.e_invoices.findOne({_id:_id},(err,doc)=>{
        if(dberr(err,callback))
            if(dbnull(doc,callback)){
                var invoice=doc.toJSON();
                var xml=btoa(mrutil.e_invoice2xml(invoice));
                var xslt=mrutil.e_invoiceXslt(invoice);
                callback({success: true,data: {xml:xml,xslt:xslt}});
            }
        });
}


function getInvoices(ioType,activeDb,member,req,res,callback){
    var options={page: (req.query.page || 1), 
        populate:[
        {path:'eIntegrator',select:'_id eIntegrator username'}
        ],
        limit:10
    }

    if((req.query.pageSize || req.query.limit)){
        options['limit']=req.query.pageSize || req.query.limit;
    }

    var filter = {};
    
    if(req.query.eIntegrator){
        filter['eIntegrator']=req.query.eIntegrator;
    }
    
    if(req.query.date1){
        filter['issueDate.value']={$gte:req.query.date1};
    }

    if(req.query.date2){
        if(filter['issueDate.value']){
            filter['issueDate.value']['$lte']=req.query.date2;
        }else{
            filter['issueDate.value']={$lte:req.query.date2};
        }
    }
    activeDb.e_invoices.paginate(filter,options,(err, resp)=>{
        if (dberr(err,callback)) {
            callback({success: true,data: resp});
        } else {
            console.log('error:',err);
        }
    });


}


function isEInvoiceUser(activeDb,member,req,res,callback){
    callback({success:true,data:{value:'ok'}});
  // var vknTckn=req.query.vknTckn || req.query.vkntckn || '';
  // if(vknTckn.trim()=='') return callback({success:false,error:{code:'MISSING_PARAM',message:'\'vknTckn\' query parametresi bos olamaz.'}})
  // switch(eIntegratorDoc.eIntegrator){
  //   case 'uyumsoft':
  //     uyumsoft.isEInvoiceUser(eIntegratorDoc,vknTckn,callback);
  //   break;
  //   default:
  //     callback({success:false,error:{code:'INTEGRATOR_ERROR',message:'Integrator function not completed or unknown.'}})
  //   break;
  // }
}


module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			getOne(dbModel, member, req, res, next, cb)
		}else{
			getList(dbModel, member, req, res, next, cb)
		}
		break
		case 'POST':
		post(dbModel, member, req, res, next, cb)
		break
		case 'PUT':
		put(dbModel, member, req, res, next, cb)
		break
		case 'DELETE':
		deleteItem(dbModel, member, req, res, next, cb)
		break
		default:
		error.method(req)
		break
	}

}

var locationTypes=[
{"text":"(0)Depo","value": 0},
{"text":"(1)Magaza","value": 1},
{"text":"(2)Uretim","value":2},
{"text":"(3)Iade","value":3},
{"text":"(4)Seyyar","value":4},
{"text":"(5)Diger","value":5}
]

function getList(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1)}
	if(!req.query.page)
		options.limit=50000
	
	var filter = {}

	if((req.query.name || '')!='')
		filter['passive']={ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }
	

	if((req.query.locationType || '')!=''){
		// if(Number(req.query.locationType>=0)){
		filter['locationType']=req.query.locationType
		// }
	}

	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive
	
	dbModel.locations.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			// resp.docs.forEach((doc)=>{
			// 	doc['locationTypeName']=''
			// 	locationTypes.forEach((e)=>{
			// 		if(e.value==doc.locationType){
			// 			doc['locationTypeName']=e.text
			// 			return
			// 		}
			// 	})
			// })
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.locations.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined

	var newDoc = new dbModel.locations(data)
	if(!epValidateSync(newDoc,next))
		return

	newDoc.save((err, newDoc2)=>{
		if(dberr(err,next)){
			cb(newDoc2)
		}
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		error.param1(req)

	var data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	dbModel.locations.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.locations(doc2)
				if(!epValidateSync(newDoc,next))
					return

				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next))
						cb(newDoc2)
				})
			}
		}
	})
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		error.param1(req)
	
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.locations.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}

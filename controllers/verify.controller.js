module.exports= function (member, req, res,cb) {
	if(req.method=='GET' || req.method=='POST'){
		var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''

		var username = util.clearText(req.body.username || req.query.username || '')
		var authCode = util.clearText(req.body.authCode || req.query.authCode || '')
		var deviceid = util.clearText(req.body.deviceid || req.query.deviceid || '')
		var devicetoken = util.clearText(req.body.devicetoken || req.query.devicetoken || '')

		if(username.trim()=='')
			throw {code:'USERNAME_EMPTY',message:'Telefon numarasi veya email bos olamaz.'}
		
		db.members.findOne({username:username},function(err,doc){
			if(dberr(err))
				if(dbnull(doc)){
					if(doc.authCode==authCode){
						doc.verified=true
						doc.deviceid = deviceid
						doc.devicetoken = devicetoken

						doc.save((err,newdoc)=>{
							if(dberr(err)){
								var userinfo = { 
									_id : doc._id,
									username: doc.username,
									name: doc.name,
									lastName: doc.lastName,
									gender: doc.gender,
									role : doc.role,
									isSysUser:false,
									isMember:true,
									isMobile: doc.isMobile,
									country : doc.country,
									deviceId : doc.deviceId,
									deviceToken : doc.deviceToken,
									authCode : doc.authCode,
									ip: IP
								}
								var token 
								var jwt = require('jsonwebtoken')
								if(doc.ismobile==false){
									token=jwt.sign(userinfo, 'gizliSir', {expiresIn: 30*1440*60})
								}else{
									token=jwt.sign(userinfo, 'gizliSir', {expiresIn: 5*365*1440*60})
								}
								cb(token)
							}
						})
					}else{
						throw {code:'AUTH_CODE_ERROR',message:'Onay kod hatali.'}
					}
				}
			})
	
	}else{
		error.method(req)
	}
}

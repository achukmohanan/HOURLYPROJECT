const User = require('../models/userSchema')




const adminAuth = (req,res,next)=>{
     

    User.findOne({isAdmin:true})
    .then(data =>{
        if(data){
        next()
        }else{
            res.redirect('/admin/adminlogin')
        }
    })
    .catch(error =>{
        console.log('Error happened in adminAuth');
        res.status(500).send("Internal Server error")
        
    })
}

const checksession = (req,res,next) =>{
    if(req.session.admin){
        res.redirect('/admin/seconddash')
    }else{
        next()
    }
}

module.exports = {
    
    adminAuth,
    checksession
}
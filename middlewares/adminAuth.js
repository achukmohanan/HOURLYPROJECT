const User = require('../models/userSchema')




const adminAuth = (req,res,next)=>{
     if(!req.session.admin){
        return res.redirect('/admin/adminlogin')
     }
         // ✅ Prevent browser from caching dashboard
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');


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

const adminchecksession = (req,res,next) =>{
    if(req.session.admin){
        res.redirect('/admin/seconddash')
    }else{
        next()
    }
}

module.exports = {
    
    adminAuth,
    adminchecksession
}
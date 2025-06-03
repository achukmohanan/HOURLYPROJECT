const User = require('../models/userSchema')


const userAuth = (req,res,next) =>{
    if(req.session.user){
        User.findById(req.session.session)
        .then(data =>{
            if(data && !data.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }
        })
        .catch(error =>{
            console.log("Error in user Auth middleware");
            res.status(500).send("Internal Server Error ")
        })
    }else{
        res.redirect('/login')
    }
}

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

module.exports = {
    userAuth,
    adminAuth
}
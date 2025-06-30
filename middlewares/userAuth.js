const User =  require('../models/userSchema');

const userAuth = (req,res,next) =>{
    if(req.session.user){
        
        User.findById(req.session.user)
        .then(data =>{
            if(data && !data.isBlocked){
                next()
                // res.redirect('/home')
            }else{
                
                console.log('user is blocked or not found')
                req.session.destroy(()=>{
                    res.redirect('/login?blocked=true')
                })
               
            }
        })
        .catch(error =>{
            console.log("Error in user Auth middleware",error);
            res.status(500).send("Internal Server Error ")
        })
    }else{
        res.redirect('/login')
    }
}

const checksession = (req,res,next) =>{
    if(req.session.user){
        res.redirect('/home')
    }else{
        next()
    
    }
}

module.exports = {
    userAuth,
    checksession
}
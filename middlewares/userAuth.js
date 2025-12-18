const Cart = require('../models/cartSchema');
const User =  require('../models/userSchema');
const Wishlist = require('../models/wishlistSchema');

const userAuth = (req,res,next) =>{
    if(req.session.user){
        const userId = req.session.user._id || req.session.user 
        User.findById(userId)
        .then(async data =>{
            if(data && !data.isBlocked){

                res.locals.user = data;

                try {
                    const [cart,wishlist] = await Promise.all([
                        Cart.findOne({userId:data._id}),
                        Wishlist.findOne({userId:data._id})
                    ]);
                    res.locals.cartCount = cart ? cart.items.length : 0;
                    
                    res.locals.wishlistCount = wishlist ? wishlist.products.length : 0;

                } catch (error) {
                    console.log("error in the userAuth",error)  
                }

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
            res.status(500).json("Internal Server Error ")
        })
    }else{
        res.redirect('/login')
    }
}

const checksession = (req,res,next) =>{
    if(req.session.user ||  req.isAuthenticated()){
        res.redirect('/home')
    }else{
        next()
    }
}

module.exports = {
    userAuth,
    checksession
}
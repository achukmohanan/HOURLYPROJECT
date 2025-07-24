const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const getCart = async (req,res) =>{
    try {
        const userId = req.session.user
        const findUser = await User.findById(userId)
        // console.log("User finded",findUser)  
       return res.render('user/cart',{
           user:findUser
        })
    } catch (error) {
       console.log("error in get cart",error);
        
    }
}
const addToCart = async (req,res) =>{
    try {

        const { productId } = req.body;
        const userId =  req.session.user;
        
        const findProduct = await Product.findById(productId)
         
        let cart = await Cart.findOne({userId});

        if(!cart){
            cart = new Cart({userId , items:[]});
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId)

        if(existingItem){
            existingItem.quantity += 1;
        }else{
            cart.items.push({
                productId,
                quantity:1,

            });
        }
        // console.log("Cart before save:", cart);

        await cart.save();
        // console.log("cart is ",cart)
        return res.status(200).json({success:true,message:"Successfully Added "})
    } catch (error) {
        console.log("error in backend post add to cart ",error);
        res.status(500).json({success:false,message:"Internal Server Error"});
    }
}




module.exports = {
    getCart,
    addToCart
}
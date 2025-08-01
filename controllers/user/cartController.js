
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');


const getCart = async (req,res) =>{
    try {
        const userId = req.session.user
        const findUser = await User.findById(userId)

        const cart = await Cart.findOne({userId}).populate('items.productId');
        // console.log("cart is ",cart)  
       return res.render('user/cart',{
           user:findUser,
           cart,

        })
    } catch (error) {
       console.log("error in get cart",error);
        
    }
}
const addToCart = async (req,res) =>{
    try {

        const { productId } = req.body;
        const userId =  req.session.user;
        
        // console.log("product id from frontend" ,productId ,  typeof productId)
        const product = await Product.findOne({
            _id:productId, 
        }).populate('category');
        
        if(product.isBlocked===true){
            return res.status(400).json({success:false,message:"Product is Blocked!"})
        }
        if(!product){
            return  res.status(400).json({success:false,message:"Product Not Found or Blocked!"})
        }
        if(!product.category || product.category.isListed === false || product.category.isBlocked){
            return res.status(400).json({success:false,message:"Product Category is Blocked or Unlisted"})
        }   
         
        let cart = await Cart.findOne({userId});

        if(!cart){  
            cart = new Cart({userId , items:[]});
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId.toString())

        if(existingItem){
            existingItem.quantity += 1;
        }else{
            cart.items.push({
                productId,
                quantity:1, 

            });
        }
    // console.log("Cart items before saving:", cart.items);

        await cart.save();
        // console.log("cart is ",cart)
        return res.status(200).json({success:true,message:"Successfully Added "})
    } catch (error) {
        console.log("error in backend post add to cart ",error);
        res.status(500).json({success:false,message:"Internal Server Error"});
    }
}


const deleteCartItem = async(req,res) =>{
    try {
        const userId = req.session.user;
        const{productId} = req.body;
        // console.log("productId is",productId, typeof productId);

        

        const cart = await Cart.findOne({userId});
        if(!cart){
            return res.status(404).json({status:false, message:" Cart not Found"});
        }

        cart.items = cart.items.filter(item=> item.productId.toString() !== productId)

        await cart.save();
        return res.status(200).json({success:true,message:"Item Removed from the cart"})
    } catch (error) {
        console.log("error in detecart item",error);
        res.status(500).json({success:false,message:"Internal Server error"})
        
    }
}

const updateCartQuantity = async (req,res) =>{
    try {
        const userId = req.session.user;
        const {productId,change} = req.body;

        const cart = await Cart.findOne({userId});
        if(!cart){
            return res.status(404).json({success:false,message:"Cart not Found"})
        }
        const item = cart.items.find(item=>item.productId.toString() === productId.toString())

        if(!item){
            return res.status(404).json({success:false,message:"product not in the Cart"})
        }

        const product = await Product.findById(productId)
        if(!product){
            return res.status(400).json({success:false,message:"Product not Found"})
        }


        if(item.quantity + change < 1){
            return res.status(400).json({success:false,message:"Minimum Quantity Should be 1"})
        }
        const maxLimit = Math.min(5,product.quantity)
        if(item.quantity + change > maxLimit){
            return res.status(400).json({success:false,message:"Maximum quantity limit reached"})
        }
        item.quantity +=change;
         await cart.save();
        return res.status(200).json({success:true,newQuantity:item.quantity})

    } catch (error) {
        console.log("error in the updateCartQuantity",error);
        res.status(500).json({success:false,message:"Internal Server Error"});
    }
}

const gettest = async (req,res) =>{
    try {
        const userId = req.session.user

        const user = await User.findById(userId)
        return res.render('user/testing',{
            user:user
        })
    } catch (error) {
        
    }
}
module.exports = {
    getCart,
    addToCart,
    deleteCartItem,
    updateCartQuantity,
    gettest
}
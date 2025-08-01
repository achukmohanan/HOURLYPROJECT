const Wishlist = require('../../models/wishlistSchema');
const User = require('../../models/userSchema')

const getWishList = async(req,res)=>{
    try {
        const userId = req.session.user
        const findUser = await User.findById(userId)
        const wishlist = await Wishlist.findOne({userId}).populate('products.productId')
       
        return res.render('user/wishlist',{
            user:findUser,
            wishlist
        })


    } catch (error) {
        console.log("error in get wishlist",error);
        
    }
}

const postWishList = async (req,res) =>{
    try {
        const userId = req.session.user
        const{productId} = req.body
        console.log("productId is ",productId);
        
        if(!productId){
            return res.status(400).json({success:false,message:"Product is Not Found "});
        }
        let wishlist = await Wishlist.findOne({userId});

        if(wishlist){
            const alreadyExist = wishlist.products.some(item=>item.productId.toString()=== productId)

            if(alreadyExist){
                return res.status(200).json({success:true,message:"Product is already Exists"})
            }
            wishlist.products.push({productId});
            await wishlist.save()
            return res.status(200).json({success:true,message:"Product Added to Wishlist"})
        }else{
            const newWishlist = new Wishlist({
                userId,
                products:[{productId}]
            })
            await newWishlist.save();
            return res.status(200).json({success:true,message:"Wishlist Created and Product Added"})
        }

    } catch (error) {
        console.log("error in postwishlist",error)
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}



module.exports ={
    getWishList,
    postWishList
}
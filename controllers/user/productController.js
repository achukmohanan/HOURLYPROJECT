const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');





const productDetails = async (req,res) =>{
    try {
       const userId = req.session.user;
       const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
        const categoryOffer = findCategory ?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;
        res.render('user/productdetails',{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory
        });



    } catch (error) {
        console.error("Error happened in fetching product details offer",error);
res.redirect('/pagenotfound');
    }
}

module.exports = {
    productDetails
}
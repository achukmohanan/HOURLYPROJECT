const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const Brand = require('../../models/brandSchema');

const { render } = require('ejs');
const { search } = require('../../routes/userRouter');





const productDetails = async (req,res) =>{
    try {
        // console.log("sessiondata", req.session)
       const userId = req.session.user;
       const userData = await User.findById(userId);

        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
        const categoryOffer = findCategory ?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        const relatedProducts = await Product.find(
            {_id:{$ne:product._id},
           $or:[
            {category:product.category._id},
            {brand:product.brand},
           ]     
        }).limit(4);

        // console.log("product", product)
        res.render('user/productdetails',{
            user:userData,
            product,
            quantity:product.quantity,
            totalOffer,
            category:findCategory,
            relatedProducts
        });



    } catch (error) {
        console.error("Error happened in fetching product details offer",error);
res.redirect('/pagenotfound');
    }
}

const loadShoppingpage = async(req,res) =>{
    try {       
     
        const user = req.session.user;

        

        const userData = await User.findOne({_id:user})
      const categories = await Category.find({isListed:true});
      const categoryIds = categories.map((category)=>category._id.toString());

     const page = parseInt(req.query.page) || 1;
     const limit = 6;
     const skip = (page -1) * limit;



     const products = await Product.find({
        isBlocked:false,
        category:{$in:categoryIds}
        // quantity:{$gt:0}    
     }).sort({createdOn:-1}).skip(skip).limit(limit);

     const totalProducts =  await Product.countDocuments({
        isBlocked:false,
        category:{$in:categoryIds}
        // quantity:{$gt:0}

     });
     const totalPages = Math.ceil(totalProducts/limit);

     const brands = await Brand.find({isBlocked:false});
     const categoriesWithIds = categories.map(category=>({_id:category._id,name:category.name}));

     res.render('user/shop',{
        user:userData,
        products:products,
        category:categoriesWithIds,
        brand:brands,
        totalProducts:totalProducts,
        currentPage:page,
        totalPages:totalPages

     })
    } catch (error) {
        console.error("error happemd in view image ",error);
        
    }
}   

const filterProduct = async(req,res) => {
    try {
        const user = req.session.user;  
        const category  = req.query.category ? req.query.category.trim() : null;
        const brand = req.query.brand ? req.query.brand.trim() : null;   
        const findCategory  = category ? await Category.findOne({_id:category}) : null;
        const findBrand = brand ? await Brand.findOne({_id:brand}) : null;
        const brands = await Brand.find({}).lean(); 

        const query = {
            isBlocked:false,
            // quantity:{$gt:0}
        }
        if(findCategory){
            query.category = findCategory._id;
        }
        if(findBrand){
            query.brand = findBrand.brandName;
        }
        let findProducts = await Product.find(query).lean();
        findProducts.sort((a,b)=> new Date (b.createdOn) - new Date(a.createdOn));
        const categories = await Category.find({isListed:true});
        let itemsPerPage = 3;
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage -1 ) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length/itemsPerPage);
        const currentProduct = findProducts.slice(startIndex,endIndex);
        let userData = null;
       
            userData = await User.findOne({_id:user});

            console.log("user data is in filter product ",userData)
            if(userData){
                const searchEntry = {
                    category : findCategory ? findCategory._id : null,
                    brand : findBrand ? findBrand.brandName : null,
                    searchedOn : new Date()

                }
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
           
        req.session.filteredProducts = currentProduct;
        res.render('user/shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            selectedCategory : category || null,
            selectedBrand : brand || null,

        })        

    } catch (error) {
        console.log("error in filter product ",error)
        res.redirect('/pagenotfound')
    }
}

const filterByPrice = async (req,res) =>{
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user})
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({isListed:true}).lean();

        let findProducts = await Product.find({
            salePrice:{$gt:req.query.gt,$lt:req.query.lt},
            isBlocked:false,
            quantity:{$gt:0}
        }).lean();

        findProducts.sort((a,b)=> new Date(b.createdOn) - new Date(a.createdOn));

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length/itemsPerPage);
        let currentProduct = findProducts.slice(startIndex,endIndex);

        req.session.filteredProducts = findProducts;

        res.render('user/shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage
        })

    } catch (error) {
        console.log("error in filtered Product ",error);
        res.redirect('/pagenotfound')
    }
};

const searchProducts = async (req,res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user})
        let search = req.body.query;
        
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({isListed:true}).lean()
        const categoryIds = categories.map(category=>category._id.toString());
        let searchResult = [];
        if(req.session.filteredProducts && req.session.filteredProducts.length > 0){
            searchResult = req.session.filteredProducts.filter(product => 
                product.productName.toLowerCase().includes(search.toLowerCase())
            )
        }else{
            searchResult = await Product.find({
                productName:{$regex:'.*'+search+'.*',$options:"i"},
                isBlocked:false,
                quantity:{$gt:0},
                category:{$in:categoryIds}
            })
        }

        searchResult.sort((a,b)=> new Date(b.createdOn)- new Date(a.createdOn));
        
        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex  = (currentPage - 1)* itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(searchResult.length/itemsPerPage);
        const currentProduct = searchResult.slice(startIndex,endIndex);

        res.render('user/shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            count:searchResult.length, 
        })

    } catch (error) {
        console.log("error happened in searchproduct",error);
        res.redirect('/pagenotfound')
    }
}
 


module.exports = {
    productDetails,
    loadShoppingpage,
    filterProduct,
    filterByPrice,
    searchProducts,

}
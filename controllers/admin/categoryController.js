const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const {STATUS_CODE} = require('../../utils/statusCode')

const categoryInfo  = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit

        const search = req.query.search || "";
        const searchResult = {
            name:{$regex:".*" + search + ".*" , $options:"i"}
        };  

        const categoryData = await Category.find( search?searchResult :{})
        .sort({createdAt :-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments(search ? searchResult : {});
        const totalPages = Math.ceil(totalCategories/limit);

        res.render('admin/category',{
         
            cat: categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories,
            searchValue:search  
        })
    } catch (error) {
        console.log("error happend in categoryInfo",error);
        res.redirect("/pageerror")
    }
}

const addCategory = async (req,res) =>{
    const {name,description} = req.body;
    try {
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(STATUS_CODE.BAD_REQUEST).json({error:"Category already exists"})
        }
        const newCategory = new Category({
            name,
            description
        }) 
        await newCategory.save();
        return res.json({message:"Category added Successfully"})
    } catch (error) {
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({error:"Internal Server Error"});
    }
}

const  addCategoryOffer = async (req,res) =>{
    try {
        console.log("addCategoryOffer API hit", req.body);


        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if(!category){
            return res.status(STATUS_CODE.NOT_FOUND).json({status:false, message:"Category not found"});
        }
        const products =  await Product.find({category:category._id})
        // const hasProductOffer = products.some((product)=>product.productOffer > percentage);

        // if(hasProductOffer){
        //     return res.json({status:false,message:"Products within this category already have product offers"})
        // }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

        for(const product of products){
            // product.productOffer = 0;
            
           
            product.salePrice = product.regularPrice - Math.floor(product.regularPrice * percentage/100);
            
            await product.save();
        }
        console.log("product sale price",products)
        res.json({status:true});
    } catch (error) {
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({status:false,message:"Internal Server Error"});
        console.log("error in add category offer",error);
        
    }
};

const  removeCategoryOffer = async (req,res)=>{
    try {
        // console.log("data is passsssss");
        const categoryId = req.body.categoryId;
        // console.log("category id is ",categoryId);
        const category = await Category.findById(categoryId);

        if(!category){
         return res.status(STATUS_CODE.NOT_FOUND).json({status:false,message:"Category not found"})   
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id})

        if(products.length >0){
            for(const product of products){
                if(product.productOffer > 0){
                product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (product.productOffer/100));
                }else{
                    product.salePrice = product.regularPrice
                }
                // product.productOffer = 0
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save()
        res.json({status:true});
    } catch (error){
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({status:false,message:"Internal Server Error"})
    }
}

const getListCategory = async (req,res) =>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const getUnlistCategory = async (req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const getEditCategory = async (req,res) =>{
    try {
        const id = req.query.id;
        const category = await Category.findOne({_id:id});
        res.render("admin/editcategory",{category:category});
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const editCategory = async (req, res) => {
    try {
        console.log(req.body)
        const id = req.params.id;
        const { categoryName, description } = req.body;

        const existingCategory = await Category.findOne({ name: categoryName });

        if (existingCategory && existingCategory._id.toString() !== id) {
            console.log("duplicate")
            return res.redirect('/admin/category?error=exist');
        }

        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });

        if (updateCategory) {
            return res.redirect('/admin/category?success=updated'); 
            } else {
            return res.redirect('/admin/category?error=notfound');  
        }

    } catch (error) {
        console.log("error")
        res.status(500).json({ error: "Internal Server error" });
    }
}




module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory

} 
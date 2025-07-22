const Brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');


const getBrandPage = async (req,res) =>{
    try {
        const page  = parseInt(req.query.page) || 1;
        const limit = 2;
        const skip = (page-1)*limit;
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();
        res.render('admin/brands',{
            data : reverseBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands,
        })
    } catch (error) {
        res.redirect('admin/pageerror')
    }
}

const addBrand = async (req,res) =>{
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({brand});
        if(findBrand){
            res.json({success:false,message:"Exsiting Brand "})
        }
        console.log(req.body.brandImage)
        if(!findBrand){
            // const image = req.file.filename;
            const newBrand = new Brand({
                brandName:brand,
                brandImage:req.body.brandImage,
            })
            await newBrand.save();
            // console.log(newBrand);
            
             res.status(200).json({success:true , message:"Brand Uploaded successfully"})
        }
     } catch (error) {
        res.status(500).json({success:false,message:"Internal Server Error"}); 
    }
}
const blockBrand = async (req,res) =>{
    try {
        const id  = req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/brands');
    } catch (error) {
        
    }
}


const   unBlockBrand = async (req,res) =>{
    try {
        const id = req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/brands');

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const deleteBrand = async (req,res) =>{
    try {
        const {id} = req.query;
        if(!id){
            return res.status(400).json({success:false , message:"Brand Id is not Found"})
        }
        await Brand.deleteOne({_id:id});
       return   res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        console.log("error deleting brand :",error);
        res.status(500).redirect('/admin/pageerror')
    }
}



module.exports = {
    getBrandPage,
    addBrand,
    unBlockBrand,
    deleteBrand,
    blockBrand
}   
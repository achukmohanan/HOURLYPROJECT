const Coupon = require('../../models/couponSchema')


const getCouponPage = async(req,res) =>{
    try {
        const coupon = await Coupon.find({}).sort({createdOn:-1})
        return res.render('admin/coupon',{coupon})
    } catch (error) {
        console.log("error in the getCouponPage",error);
        
    }

}
const postCoupon = async (req,res) =>{
    try {
        console.log("data is received ",req.body)
        const {code,discountType,discountValue,maxDiscount,description,limit,expiryDate,minPurchase,} = req.body

        if(!code || !discountType || !expiryDate){
            return res.status(400).json({success:false,message:"Required fields are missing"})
        }

        if(new Date(expiryDate) <= new Date()){
            return res.status(400).json({success:false,message:"Expiry date must be future"})
        }
        const existing = await Coupon.findOne({code})
        if(existing){
            return res.status(400).json({success:false,message:"Coupon code already exists"})
        }

        const coupon = new Coupon({
            code,
            purpose:'General',
            discountType,
            discountValue,
            maxDiscount,
            description,
            limit,
            expireOn:expiryDate,
            minPurchase
        })
        await coupon.save()
        return res.status(200).json({success:true,message:"Coupon Created Successfully"})
    } catch (error) {
        console.log("error in the backend of post coupon",error);
        
    }
}
const deleteCoupon = async (req,res) =>{
    const code = req.params.code;
       
    const deleted = await Coupon.findOneAndDelete({code});

    if(!deleted){
        return res.status(404).json({success:false,message:"Coupon is not Found"})
    }

    return res.status(200).json({success:true,message:'Deleted Successfully'})
    
}

module.exports = {
    getCouponPage,
    postCoupon,
    deleteCoupon
}
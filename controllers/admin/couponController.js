const Coupon = require("../../models/couponSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const getCouponPage = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = 5;
    let skip = (page - 1) * limit;

    await Coupon.updateMany(
      {expireOn:{$lt:new Date()},isActive:true},
      {$set:{isActive:false}}
    )

    let totalCoupons = await Coupon.countDocuments();

    const coupon = await Coupon.find({})
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);
    return res.render("admin/coupon", {
      coupon,
      totalCoupons,
      currentPage: page,
      totalPages: Math.ceil(totalCoupons / limit),
    });
  } catch (error) {
    console.log("error in the getCouponPage", error);
  }
};

const postCoupon = async (req, res) => {
  try {
    
    const {
      code,
      discountValue,
      maxDiscount,
      description,
      limit,
      expiryDate,
      minPurchase,
    } = req.body;

    if (!code || !expiryDate ||!discountValue ||discountValue <= 0|| !maxDiscount||maxDiscount <= 0|| !minPurchase|| minPurchase <= 0||!limit || limit <= 0) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Invalid coupon values"});
    }

    if (new Date(expiryDate) <= new Date()) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Expiry date must be future" });
    }
    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = new Coupon({
      code,
      purpose: "General",
      discountType:'percentage',
      discountValue,
      maxDiscount,
      description,
      limit,
      expireOn: expiryDate,
      minPurchase,
    });
    await coupon.save();
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Coupon Created Successfully" });
  } catch (error) {
    console.log("error in the backend of post coupon", error);
  }
};
const toggleCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const {isActive} = req.body

  // const updated = await Coupon.findOneAndUpdate(
  //   { code,isActive:true },
  //   {$set:{isActive:false}},
  //   {new:true}
  // );

  const coupon = await Coupon.findOne({code})

  if (!coupon) {
    return res
      .status(STATUS_CODE.NOT_FOUND)
      .json({ success: false, message: "Coupon is not Found" });
  }

  if(coupon.expireOn < new Date()){
    if(coupon.isActive){
      coupon.isActive = false;
      await coupon.save();
    }
    return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"Coupon is expired and cannot be enabled"})
  }

  coupon.isActive = isActive;
  await coupon.save()

  return res.status(STATUS_CODE.SUCCESS).json({ success: true, message: `Coupon ${isActive ? "enabled" : "disabled"} Successfully` });
    } catch (error) {
      console.log("error in the soft delete of coupon",error)
      return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong",
    });
    }
 
};

module.exports = {
  getCouponPage,
  postCoupon,
  toggleCoupon,
};

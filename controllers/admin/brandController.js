const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const { STATUS_CODE } = require("../../utils/statusCode");
const streamifier = require('streamifier')
const cloudinary = require('../../utils/cloudinary')

const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    const reverseBrand = brandData.reverse();
    res.render("admin/brands", {
      data: reverseBrand,
      currentPage: page,
      totalPages: totalPages,
      totalBrands: totalBrands,
    });
  } catch (error) {
    res.redirect("admin/pageerror");
  }
};

const addBrand = async (req, res) => {
  try {
    const brand = req.body.name;
    const findBrand = await Brand.findOne({
      brandName: { $regex: `^${brand}$`, $options: "i" },
    });
    if (findBrand) {
      return res.json({ success: false, message: "Exsiting Brand " });
    }
    console.log(req.body.brandImage);
    if (!findBrand) {
      
      const newBrand = new Brand({
        brandName: brand,
        brandImage: req.body.brandImage,
      });
      await newBrand.save();
      res
        .status(STATUS_CODE.SUCCESS)
        .json({ success: true, message: "Brand Uploaded successfully" });
    }
  } catch (error) {
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};
const blockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/brands");
  } catch (error) {
    console.log("error in the blockBrand",error);
  }
};

const unBlockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/brands");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const getBrandEditPage = async(req,res) =>{
  try {
    const brandId = req.query.id;
    const brand = await Brand.findById(brandId)

    if(!brand)return ;

    return res.render('admin/editBrand',{
      brand
    })
  } catch (error) {
    console.log("error getBrandEditPage",error); 
  }
}

const postEditBrand = async(req,res) =>{
  try {
    const brandId = req.query.id;
    
    const brandName = req.body.brandName?.trim();

      if(!brandId) return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:'Brand is Required'})
    if(brandName){
      const Exsiting = await Brand.findOne({brandName:{$regex:`^${brandName}$`,$options:'i'},_id:{$ne:brandId}})
      if(Exsiting)return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"Name is Already Existing"})
    }
   // If no file, just update name
      if(!req.file){
          await Brand.findByIdAndUpdate(brandId,{brandName},{new:true});
          return res.json({message:'Brand Updated (Name Only) '})
      }

      const uploadFromBuffer = (buffer) =>{
          return new Promise((resolve,reject)=>{
            const stream = cloudinary.uploader.upload_stream(
              {folder:'brands',resource_type:'image'},
              (error,result) =>{
                if(error) return reject(error)
                  resolve(result)
              }
            );
            streamifier.createReadStream(buffer).pipe(stream);
          });
      };

      const result = await uploadFromBuffer(req.file.buffer);
      const imageUrl = result.secure_url;
      await Brand.findByIdAndUpdate(brandId,{brandName,brandImage:imageUrl},{new:true});
      return res.json({message:"Brand updated Successfully",imageUrl})
  } catch (error) {
    console.log("error in the backend post Edit Brand",error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
module.exports = {
  getBrandPage,
  addBrand,
  unBlockBrand,
  blockBrand,
  getBrandEditPage,
  postEditBrand
};

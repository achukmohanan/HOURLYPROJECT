const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

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
    console.log("brabd is ", brand);

    const findBrand = await Brand.findOne({
      brandName: { $regex: `^${brand}$`, $options: "i" },
    });
    console.log("regex b", findBrand);
    if (findBrand) {
      return res.json({ success: false, message: "Exsiting Brand " });
    }
    console.log(req.body.brandImage);
    if (!findBrand) {
      // const image = req.file.filename;
      const newBrand = new Brand({
        brandName: brand,
        brandImage: req.body.brandImage,
      });
      await newBrand.save();
      // console.log(newBrand);

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
  } catch (error) {}
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

    console.log("brand is in get brandEditPage is",brand)
    // console.log('req.body.',brand)
    return res.render('admin/editBrand',{
      brand
    })
  } catch (error) {
    console.log("error getBrandEditPage",error);
    
  }
}

module.exports = {
  getBrandPage,
  addBrand,
  unBlockBrand,
  blockBrand,
  getBrandEditPage
};

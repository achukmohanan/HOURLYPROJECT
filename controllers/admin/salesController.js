const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJs = require("exceljs");
const { STATUS_CODE } = require("../../utils/statusCode");

const getsalesReport = async (req, res) => {
  try {
     let { page = 1, limit = 10 } = req.query;
     page = parseInt(page);
     limit = parseInt(limit);

    const matchFilter = { "orderedItems.status": "Delivered" };
const totalOrders = await Order.countDocuments(matchFilter);
    const totalPages = Math.ceil(totalOrders / limit);
    const skip = (page - 1) * limit;

    const orders = await Order.find( matchFilter )
      .populate("userId", "name email")
      .populate("orderedItems.product", "productName salePrice")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);
    
    return res.render("admin/salesReport", { 
      orders,
      currentPage:page,
      totalPages
     });
  } catch (error) {
    console.log("error in the getsales report ", error);
  }
};


const getFilteredSalesData = async(req,res) =>{
  try {
    console.log("req.body is ",req.query)
     const { startDate, endDate, filter, page = 1, limit = 5 } = req.query;
     const matchfilter = {
      "orderedItems.status": "Delivered",
    };

     // Date logic
    const today = new Date();

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if(end > today){ 
        return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"Future dates are not allowed."})
      }

      end.setHours(23, 59, 59, 999);
      matchfilter.createdOn = { $gte: start, $lte: end };
    } else if (filter) {
      if (filter === "daily") {
        const start = new Date(today.setHours(0, 0, 0, 0));
        const end = new Date();
        matchfilter.createdOn = { $gte: start, $lte: end };
      } else if (filter === "weekly") {
        const start = new Date();
        start.setDate(today.getDate() - 7);
        const end = new Date();
        matchfilter.createdOn = { $gte: start, $lte: end };
      } else if (filter === "monthly") {
        const start = new Date();
        start.setDate(today.getDate() - 30);
        const end = new Date();
        matchfilter.createdOn = { $gte: start, $lte: end };
      } else if (filter === "yearly") {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        matchfilter.createdOn = { $gte: start, $lte: end };
      }
    }

     // Pagination setup
    const skip = (parseInt(page) - 1) * parseInt(limit);
console.log("matchfilter is .............",matchfilter)
     const orders = await Order.find(matchfilter)
      .populate("userId", "name email")
      .populate("orderedItems.product", "productName salePrice")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(parseInt(limit));

      const totalOrders = await Order.countDocuments(matchfilter);
      console.log("total Orders aere",totalOrders)
    const totalPages = Math.ceil(totalOrders / limit);

     res.json({
      orders,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
     console.log("Error in getFilteredSalesData:", error);
    return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({ success:false,message: "Server error" });
  }
}

module.exports = {
  getsalesReport,
 
  getFilteredSalesData
};

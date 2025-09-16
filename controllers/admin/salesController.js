const Order = require('../../models/orderSchema')

const getsalesReport = async (req,res) =>{
    try {
        const orders = await Order.find({status:'Delivered'})
        .populate('userId','name email')
        .populate('orderedItems.product','productName salePrice')
        // console.log("sales are",orders)
        return res.render('admin/salesReport',{orders});
    } catch (error) {
        console.log("error in the getsales report ",error)
    }
}
const filterSales = async(req,res) =>{
    try {
       const {startDate,endDate}= req.query;

       const matchfilter = {
        'orderedItems.status':'Return Approved',
       }
       console.log("chechkinng 1",matchfilter);

       if(startDate && endDate){
           const start = new Date(startDate);
           const end = new Date(endDate);   
           end.setHours(23, 59, 59, 999);
           matchfilter.createdOn = { $gte: start, $lte: end };

           console.log("Aggregation filter:", matchfilter);

            const orderrr = await Order.find()
            console.log("Total Orders in DB:",orderrr.length)

            const matched = await Order.aggregate([
  { $match: { "orderedItems.status": "Return Approved" } },
  { $unwind: "$orderedItems" },
  { $match: { "orderedItems.status": "Return Approved" } }
]);
console.log("Matched items:", matched.length);


        const report = await Order.aggregate([
            
            {$unwind:'$orderedItems'},
            { $match: matchfilter },
            {
                $group:{
                _id:null,
                totalSales:{$sum:{$multiply:['$orderedItems.quantity','$orderedItems.price']}},
                totalOrders:{$sum:1},
                totalQuantity:{$sum:'$orderedItems.quantity'},
            },
        },
        ])
        
        const statuses = await Order.distinct("status");
      console.log("All statuses in DB:", statuses);

        console.log("report is" ,report[0])
        const raw = await Order.aggregate([
    { $unwind: '$orderedItems' },
    { $match: matchfilter }
]);
console.log("Raw matched items:", raw);

        res.json(report[0]|| { totalSales: 0, totalOrders: 0, totalQuantity: 0 })
       }
    }
    catch (error) {
        console.log("errrr in the filter sales in sales controller ",error);
        
    }
}

// const filterSales = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     // 1️⃣ Date filter (optional)
//     let dateFilter = {};
//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//       dateFilter.createdOn = { $gte: start, $lte: end };
//     }

//     // 2️⃣ Debug: total orders in DB
//     const totalOrders = await Order.countDocuments();
//     console.log("Total Orders in DB:", totalOrders);

//     // 3️⃣ Debug: all items after unwind
//     const debugItems = await Order.aggregate([
//       ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
//       { $unwind: "$orderedItems" },
//     ]);
//     console.log("Items after unwind:", debugItems.length);

//     // 4️⃣ Main aggregation
//     const report = await Order.aggregate([
//       ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
//       { $unwind: "$orderedItems" },
//       { $match: { "orderedItems.status": "Return Approved" } },
//       {
//         $group: {
//           _id: null,
//           totalSales: {
//             $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] },
//           },
//           totalOrders: { $sum: 1 },
//           totalQuantity: { $sum: "$orderedItems.quantity" },
//         },
//       },
//     ]);

//     // 5️⃣ Distinct statuses in DB (optional)
//     const statuses = await Order.distinct("status");
//     console.log("All statuses in DB:", statuses);

//     // 6️⃣ Return response safely
//     console.log("Report raw:", report);
//     res.json(report[0] || { totalSales: 0, totalOrders: 0, totalQuantity: 0 });
//   } catch (error) {
//     console.log("Error in filterSales:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// };

module.exports = {
    getsalesReport,
    filterSales
}
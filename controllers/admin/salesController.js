const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJs = require("exceljs");

const getsalesReport = async (req, res) => {
  try {
    const orders = await Order.find({ status: "Delivered" })
      .populate("userId", "name email")
      .populate("orderedItems.product", "productName salePrice");
    // console.log("sales are",orders)
    return res.render("admin/salesReport", { orders });
  } catch (error) {
    console.log("error in the getsales report ", error);
  }
};
const filterSales = async (req, res) => {
  try {
    const { startDate, endDate, filter, type } = req.query;
    console.log("filter is ", type);
    const matchfilter = {
      "orderedItems.status": "Delivered",
    };
    console.log("chechkinng 1", matchfilter);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchfilter.createdOn = { $gte: start, $lte: end };
    }
    console.log("Aggregation filter:", matchfilter);
    //chose filter
    if (!startDate && !endDate && filter) {
      const today = new Date();
      if (filter === "daily") {
        const start = new Date(today.setHours(0, 0, 0, 0));
        const end = new Date();
        matchfilter.createdOn = { $gte: start, $lte: end };
      }
      if (filter === "weekly") {
        const start = new Date();
        start.setDate(today.getDate() - 7);
        const end = new Date();
        matchfilter.createdOn = { $gte: start, $lte: end };
      }
      if (filter === "monthly") {
        const start = new Date();
        start.setDate(today.getDate() - 30);
        const end = new Date();
        matchfilter.createdOn = { $gte: start, $lte: end };
      }
      if (filter === "yearly") {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        matchfilter.createdOn = { $gte: start, $lte: end };
      }
    }

    //aggregation

    const report = await Order.aggregate([
      { $unwind: "$orderedItems" },
      { $match: matchfilter },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: {
              $multiply: ["$orderedItems.quantity", "$orderedItems.price"],
            },
          },
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: "$orderedItems.quantity" },
        },
      },
    ]);
    // Fetch full orders
    const orders = await Order.find(matchfilter)
      .populate("userId", "name email")
      .populate("orderedItems.product", "productName salePrice");

    const result = report[0] || {
      totalSales: 0,
      totalOrders: 0,
      totalQuantity: 0,
    };

    if (type === "pdf") {
      const doc = new PDFDocument({ margin: 30 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales-report.pdf"
      );
      doc.pipe(res);

      // Title
      doc
        .fontSize(20)
        .fillColor("#2c3e50")
        .text("Sales Report", { align: "center" });
      doc.moveDown(1);

      // Calculate available width (page width - margins)
      const pageWidth =
        doc.page.width - (doc.page.margins.left + doc.page.margins.right);

      // Adjusted column widths to fit within page
      const colWidths = [70, 100, 100, 35, 50, 60, 45, 60]; // Reduced widths
      const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);

      // If still too wide, scale down proportionally
      if (totalTableWidth > pageWidth) {
        const scale = pageWidth / totalTableWidth;
        colWidths.forEach((width, i) => {
          colWidths[i] = Math.floor(width * scale);
        });
      }

      const headers = [
        "User",
        "Email",
        "Product",
        "Qty",
        "Price",
        "Payment",
        "Coupon",
        "Total",
      ];
      const tableTop = 100;
      const rowHeight = 25;

      // Table Header
      let x = doc.page.margins.left;
      headers.forEach((header, i) => {
        doc
          .fillColor("white")
          .rect(x, tableTop, colWidths[i], rowHeight)
          .fill("#34495e")
          .stroke()
          .fillColor("white")
          .font("Helvetica-Bold")
          .fontSize(9) // Reduced font size
          .text(header, x + 2, tableTop + 8, {
            width: colWidths[i] - 4,
            align: "center",
          });
        x += colWidths[i];
      });

      // Reset Y position for rows
      let y = tableTop + rowHeight;

      let totalSales = 0;
      let totalOrders = 0;
      let totalQuantity = 0;

      orders.forEach((order, orderIndex) => {
        order.orderedItems.forEach((item, itemIndex) => {
          // Check if we need a new page
          if (y > doc.page.height - 100) {
            doc.addPage();
            y = 50;
          }

          let x = doc.page.margins.left;

          const row = [
            order.userId?.name || "-",
            order.userId?.email || "-",
            item.product?.productName || "-",
            item.quantity.toString(),
            "₹" + item.price,
            order.paymentMethod,
            order.couponApplied ? "Yes" : "No",
            "₹" + item.price * item.quantity, // Fixed: per item total
          ];

          // Alternate row background color
          if ((orderIndex + itemIndex) % 2 === 0) {
            doc
              .rect(
                doc.page.margins.left,
                y,
                colWidths.reduce((a, b) => a + b, 0),
                rowHeight
              )
              .fill("#ecf0f1")
              .stroke();
          }

          // Print each cell
          row.forEach((text, i) => {
            doc
              .fillColor("#2c3e50")
              .font("Helvetica")
              .fontSize(8) // Reduced font size
              .text(text, x + 2, y + 8, {
                width: colWidths[i] - 4,
                align: i >= 3 ? "right" : "left",
                ellipsis: true, // Truncate long text
              });
            x += colWidths[i];
          });

          // Calculate totals
          totalSales += item.price * item.quantity;
          totalOrders += 1;
          totalQuantity += item.quantity;

          y += rowHeight;
        });
      });

      // Summary section
      y += 20;
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#34495e")
        .text(`Total Orders: ${totalOrders}`, doc.page.margins.left, y)
        .text(
          `Total Quantity: ${totalQuantity}`,
          doc.page.margins.left + 200,
          y
        )
        .text(`Total Sales: ₹${totalSales}`, doc.page.margins.left + 400, y);

      doc.end();
      return;
    }

    if (type === "excel") {
      const workbook = new ExcelJs.Workbook();
      const sheet = workbook.addWorksheet("Sales Report");

      sheet.columns = [
        { header: "User Name", key: "name", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Product", key: "product", width: 25 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Price", key: "price", width: 10 },
        { header: "Payment Method", key: "payment", width: 15 },
        { header: "Coupon Applied", key: "coupon", width: 15 },
        { header: "Total Price", key: "total", width: 15 },
      ];

      orders.forEach((order) => {
        order.orderedItems.forEach((item) => {
          sheet.addRow({
            name: order.userId?.name || "-",
            email: order.userId?.email || "-",
            product: item.product?.productName || "-",
            quantity: item.quantity,
            price: item.price,
            payment: order.paymentMethod,
            coupon: order.couponApplied ? "Yes" : "No",
            total: order.totalPrice,
          });
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales-report.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
      return;
    }
    res.json(result);
  } catch (error) {
    console.log("errrr in the filter sales in sales controller ", error);
  }
};

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
  filterSales,
};

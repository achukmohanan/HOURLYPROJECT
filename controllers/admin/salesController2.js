const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJs = require("exceljs");
const { STATUS_CODE } = require("../../utils/statusCode");

const filterSales = async (req, res) => {
  try {
    const { startDate, endDate, filter, type } = req.query;
    
    const matchfilter = {
      "orderedItems.status": "Delivered",
    };
  
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchfilter.createdOn = { $gte: start, $lte: end };
    }
   
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
      const colWidths = [70, 110, 100, 30, 50, 60, 45, 60, 50, 80]; // Reduced widths
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
        "Discount",
        "Total",
        "Date/Time"
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
            "₹" + (order.discount || 0) ,
            "₹" +((item.price * item.quantity)- order.discount) , // Fixed: per item total
            new Date(order.createdOn).toLocaleDateString('en-IN',{
              timeZone:'Asia/Kolkata',
              year:'numeric',
              month:'short',
              day:'2-digit',
              hour:'2-digit',
              minute:'2-digit',
              hour12:true
            })
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
              .text(text, x + 4, y + 8, {
                width: colWidths[i] - 8,
                align: i === 3 || i>=4  ? "right" : "left",
                ellipsis: true, // Truncate long text
              });
            x += colWidths[i];
          });

          // Calculate totals
          totalSales += ((item.price * item.quantity) - order.discount) ;
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
        { header: "Discount", key: "discount", width: 12 },
        { header: "Total Price (₹)", key: "total", width: 15 },
        { header: "Date/Time" , key :'date', width:22}
      ];
      let totalOrders = 0;
      let totalQuantity = 0;
      let totalSales = 0;

      orders.forEach((order) => {
        order.orderedItems.forEach((item) => {

      const itemTotal = item.price * item.quantity;
      const discountValue = order.discount;
      const finalTotal = itemTotal - discountValue;

          sheet.addRow({
            name: order.userId?.name || "-",
            email: order.userId?.email || "-",
            product: item.product?.productName || "-",
            quantity: item.quantity,
            price: item.price,
            payment: order.paymentMethod,
            coupon: order.couponApplied ? "Yes" : "No",
            discount:order.discount || 0,
            total: finalTotal,
            date:new Date(order.createdOn).toLocaleDateString('en-IN',{
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          });
 // Update totals
      totalOrders += 1;
      totalQuantity += item.quantity;
      totalSales += finalTotal;
      sheet.getRow(1).font = { bold: true };

        });
      });
      

       // Add empty row before summary
  sheet.addRow([]);

  // Add total summary row
  const summaryRow = sheet.addRow({
    name: "TOTAL SUMMARY →",
    quantity: totalQuantity,
    total: totalSales,
  });

  
  // Style the summary row
  summaryRow.font = { bold: true };
  summaryRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCE6F1" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Auto filter for table header
  sheet.autoFilter = {
    from: "A1",
    to: "J1",
  };

  // Auto fit column width (optional improvement)
  sheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength;
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

module.exports ={
    filterSales
}
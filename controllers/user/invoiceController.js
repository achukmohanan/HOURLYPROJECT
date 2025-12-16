const PDFDocument = require("pdfkit");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

function calculateSalePrice(product) {
  console.log("dbvJHBVJhsbdvjklhb")
  const regularPrice = product.regularPrice;
  const productOffer = product.productOffer || 0;
  const categoryOffer = product.category?.categoryOffer || 0;

  const bestOffer = Math.max(productOffer, categoryOffer);

  const discountAmount = (regularPrice * bestOffer) / 100;

  return Math.round(regularPrice - discountAmount);
}


const invoice = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findOne({ orderId: orderId })
      .populate({path:"orderedItems.product",populate:{path:'category'}})
      .populate("userId");

    if (!order) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status === "Delivered") {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
      });

      const filename = `invoice-${orderId}.pdf`;
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.setHeader("Content-Type", "application/pdf");

      doc.pipe(res);

      // Colors
      const colors = {
        primary: "#2563eb",
        secondary: "#f1f5f9",
        success: "#10b981",
        text: "#1f2937",
        lightText: "#6b7280",
        border: "#e5e7eb",
      };

      // Helpers
      function addBox(x, y, width, height, fillColor = null, strokeColor = colors.border) {
        if (fillColor) {
          doc.rect(x, y, width, height).fillColor(fillColor).fill();
        }
        doc.rect(x, y, width, height).strokeColor(strokeColor).stroke();
      }

      function addLine(x1, y1, x2, y2, color = colors.border) {
        doc.strokeColor(color).lineWidth(1).moveTo(x1, y1).lineTo(x2, y2).stroke();
      }

      let currentY = 50;

      // Company header
      addBox(50, currentY, 495, 80, colors.primary);
      doc.fillColor("white")
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("HOURLY WATCHES", 70, currentY + 15);

      doc.fontSize(10)
        .font("Helvetica")
        .text("OLASSA , KOTTAYAM ", 70, currentY + 45)
        .text("Phone: 8137980901 | Email: hourlywatches@gmail.com", 70, currentY + 60);

      currentY += 100;

      // Invoice title
      doc.fillColor(colors.text)
        .fontSize(32)
        .font("Helvetica-Bold")
        .text("INVOICE", 50, currentY);

      // Invoice info right box
      addBox(350, currentY, 195, 70, colors.secondary);

      doc.fillColor(colors.text)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Invoice ID:", 370, currentY + 15)
        .font("Helvetica")
        .text(`#${order._id.toString().toUpperCase()}`, 370, currentY + 30);

      doc.font("Helvetica-Bold")
        .text("Date:", 370, currentY + 45)
        .font("Helvetica")
        .text(order.createdOn.toDateString(), 370, currentY + 60);

      currentY += 90;

      // CUSTOMER DETAILS
      doc.fillColor(colors.primary)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("CUSTOMER DETAILS", 50, currentY);

      currentY += 25;

      addBox(50, currentY, 300, 85, colors.secondary);

      doc.fillColor(colors.text)
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(`Name: ${order.userId.name}`, 70, currentY + 20);

      doc.fontSize(11)
        .font("Helvetica")
        .fillColor(colors.lightText)
        .text(`Email: ${order.userId.email}`, 70, currentY + 40);

      doc.text(
        `Address: ${order.address.addressType}, ${order.address.name}, ${order.address.city}, ${order.address.landMark}, ${order.address.state}, ${order.address.pincode}`,
        70,
        currentY + 60,
        { width: 260 }
      );

      currentY += 130;

      // ORDER DETAILS
      doc.fillColor(colors.primary)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("ORDER DETAILS", 50, currentY);

      currentY += 30;

      const rowHeight = 30;

      // Use content area widths based on page margin
      const tableLeft = 50;
      const tableWidth = 495; // A4 width (595) - 50 margin left - 50 margin right = 495
      const tableTop = currentY;

      // TABLE HEADER BG
      doc.rect(tableLeft, tableTop, tableWidth, rowHeight).fill(colors.primary);

      doc.fillColor("white").fontSize(11).font("Helvetica-Bold");

      // Column widths that sum <= tableWidth
      // Adjust these numbers if you need different proportions, but keep total <= tableWidth
      const colWidths = {
        no: 30,
        name: 220,
        qty: 40,
        price: 60,
        discount: 60,
        total: 85
      };
      // sanity: make sure sum <= tableWidth
      const sumWidths = Object.values(colWidths).reduce((a, b) => a + b, 0);
      if (sumWidths > tableWidth) {
        // fallback: scale proportionally
        const scale = tableWidth / sumWidths;
        Object.keys(colWidths).forEach(k => colWidths[k] = Math.floor(colWidths[k] * scale));
      }

      // compute X positions for each column (add small padding inside cell)
      const paddingInsideCell = 6;
      const columns = {};
      let xCursor = tableLeft;
      Object.keys(colWidths).forEach((key) => {
        columns[key] = {
          x: xCursor + paddingInsideCell,
          width: colWidths[key] - paddingInsideCell * 2, // available width for text
          align: (key === "qty") ? "center" : (key === "name" ? "left" : "right")
        };
        xCursor += colWidths[key];
      });

      // HEADER TEXTS
      doc.text("#", columns.no.x, tableTop + 8, { width: columns.no.width, align: "left" });
      doc.text("Product Name", columns.name.x, tableTop + 8, { width: columns.name.width, align: "left" });
      doc.text("Qty", columns.qty.x, tableTop + 8, { width: columns.qty.width, align: "center" });
      doc.text("Unit Price", columns.price.x, tableTop + 8, { width: columns.price.width, align: "right" });
      doc.text("Discount", columns.discount.x, tableTop + 8, { width: columns.discount.width, align: "right" });
      doc.text("Total", columns.total.x, tableTop + 8, { width: columns.total.width, align: "right" });

      currentY = tableTop + rowHeight;

      // TABLE ROWS
      let subtotal = 0;

      order.orderedItems.forEach((item, index) => {
        const salePrice = calculateSalePrice(item.product);
        console.log("saleProce sssssssssss",salePrice)
        const itemTotal = salePrice * item.quantity;
        subtotal += itemTotal;

        const bgColor = index % 2 === 0 ? "white" : colors.secondary;

        addBox(tableLeft, currentY, tableWidth, rowHeight, bgColor);

        doc.fillColor(colors.text).fontSize(10).font("Helvetica");

        // No
        doc.text(String(index + 1), columns.no.x, currentY + 10, {
          width: columns.no.width,
          align: "left"
        });

        // Product name (wrap if long)
        doc.text(
          item.product.productName,
          columns.name.x,
          currentY + 10,
          {
            width: columns.name.width,
            align: "left"
          }
        );

        // Quantity
        doc.text(
          String(item.quantity),
          columns.qty.x,
          currentY + 10,
          {
            width: columns.qty.width,
            align: "center"
          }
        );
console.log("sale pproce is testing",item.itemTotal)
        // Unit price
        doc.text(
          `₹${salePrice.toLocaleString()}`,
          columns.price.x,
          currentY + 10,
          {
            width: columns.price.width,
            align: "right"
          }
        );

        // Discount (order level discount repeated per row like original logic)
        const productOffer = item.product.productOffer || 0;
        const categoryOffer = item.product.category?.categoryOffer || 0;
        const appliedOffer = Math.max(productOffer, categoryOffer);
        doc.text(
          `₹${appliedOffer}%`,
          columns.discount.x,
          currentY + 10,
          {
            width: columns.discount.width,
            align: "right"
          }
        );

        // Total (itemTotal - order.discount)
        doc.text(
          `₹${itemTotal.toLocaleString()}`,
          columns.total.x,
          currentY + 10,
          {
            width: columns.total.width,
            align: "right"
          }
        );

        currentY += rowHeight;
      });

      // Outer Border around table
      doc.strokeColor(colors.border)
        .rect(tableLeft, tableTop, tableWidth, currentY - tableTop)
        .stroke();

      currentY += 20;

      // TOTALS BOX (keeps same look)
      const totalsX = 300;
      const totalsWidth = 245;

      addBox(totalsX, currentY, totalsWidth, 100, colors.secondary);

      doc.fillColor(colors.text)
        .fontSize(11)
        .font("Helvetica")
        .text("Subtotal:", totalsX + 20, currentY + 20);

      doc.text("Discount:", totalsX + 20, currentY + 40);

      doc.text(
        `₹${subtotal.toLocaleString()}`,
        totalsX + 150,
        currentY + 20,
        { width: 70, align: "right" }
      );

      doc.text(
        `₹${order.discount.toLocaleString()}`,
        totalsX + 150,
        currentY + 40,
        { width: 70, align: "right" }
      );

      addLine(totalsX + 20, currentY + 60, totalsX + 220, currentY + 60, colors.primary);

      doc.fillColor(colors.primary)
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("GRAND TOTAL:", totalsX + 20, currentY + 70);

      doc.text(
        `₹${order.totalPrice.toLocaleString()}`,
        totalsX + 150,
        currentY + 70,
        { width: 70, align: "right" }
      );

      currentY += 120;

      // PAYMENT INFO
      doc.fillColor(colors.primary)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("PAYMENT INFORMATION", 50, currentY);

      currentY += 20;

      addBox(50, currentY, 495, 60, colors.secondary);

      doc.fillColor(colors.text)
        .fontSize(11)
        .font("Helvetica")
        .text(`Payment Method : ${order.paymentMethod}`, 70, currentY + 15);

      doc.fillColor(colors.success)
        .font("Helvetica-Bold")
        .text(`Status: ${order.status}`, 70, currentY + 35);

      currentY += 70;

      // THANK YOU BOX
      addBox(50, currentY, 495, 80, colors.primary);

      doc.fillColor("white")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("THANK YOU FOR YOUR BUSINESS!", 10, currentY + 20, {
          align: "center",
          width: 495,
        });

      doc.fontSize(11)
        .font("Helvetica")
        .text(
          "We appreciate your trust in our services. For any queries, contact us at hourlywatches@gmail.com",
          50,
          currentY + 50,
          { align: "center", width: 495 }
        );

      currentY += 90;

      doc.fillColor(colors.lightText)
        .fontSize(9)
        .text(`Generated on ${new Date().toDateString()}`, 50, currentY, {
          align: "center",
          width: 495,
        });

      doc.end();
    }
  } catch (error) {
    console.log("Error in invoice:", error);
  }
};

module.exports = { invoice };

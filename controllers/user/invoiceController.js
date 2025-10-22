const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const invoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log("invoice order id is ", orderId);
    const order = await Order.findOne({ orderId: orderId })
      .populate("orderedItems.product")
      .populate("userId");

    if (!order) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Order is not Found" });
    }
    if (order.status === "Delivered") {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
      });

      const filename = `invoice-${orderId}.pdf`;
      // Fix typo: filenanme -> filename
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.setHeader("Content-Type", "application/pdf");

      doc.pipe(res);

      // Color palette for professional look
      const colors = {
        primary: "#2563eb", // Blue
        secondary: "#f1f5f9", // Light blue-gray
        success: "#10b981", // Green
        text: "#1f2937", // Dark gray
        lightText: "#6b7280", // Medium gray
        border: "#e5e7eb", // Light border
      };

      // Helper functions for better design
      function addBox(
        x,
        y,
        width,
        height,
        fillColor = null,
        strokeColor = colors.border
      ) {
        if (fillColor) {
          doc.rect(x, y, width, height).fillColor(fillColor).fill();
        }
        doc.rect(x, y, width, height).strokeColor(strokeColor).stroke();
      }

      function addLine(x1, y1, x2, y2, color = colors.border) {
        doc
          .strokeColor(color)
          .lineWidth(1)
          .moveTo(x1, y1)
          .lineTo(x2, y2)
          .stroke();
      }

      let currentY = 50;

      // ====================
      // HEADER SECTION
      // ====================

      // Company header with background
      addBox(50, currentY, 495, 80, colors.primary);

      // Company name and details
      doc
        .fillColor("white")
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("HOURLY WATCHES", 70, currentY + 15);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text("OLASSA , KOTTAYAM ", 70, currentY + 45)
        .text(
          "Phone: 8137980901| Email: hourlywatches@gmail.com",
          70,
          currentY + 60
        );

      currentY += 100;

      // ====================
      // INVOICE TITLE & INFO
      // ====================

      // Large Invoice title
      doc
        .fillColor(colors.text)
        .fontSize(32)
        .font("Helvetica-Bold")
        .text("INVOICE", 50, currentY);

      // Invoice info box on the right
      addBox(350, currentY, 195, 70, colors.secondary);

      doc
        .fillColor(colors.text)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Invoice ID:", 370, currentY + 15)
        .font("Helvetica")
        .text(`#${order._id.toString().toUpperCase()}`, 370, currentY + 30);

      doc
        .font("Helvetica-Bold")
        .text("Date:", 370, currentY + 45)
        .font("Helvetica")
        .text(order.createdOn.toDateString(), 370, currentY + 60);

      currentY += 90;

      // ====================
      // CUSTOMER DETAILS
      // ====================

      // Section header
      doc
        .fillColor(colors.primary)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("CUSTOMER DETAILS", 50, currentY);

      currentY += 25;

      // Customer info box
      addBox(50, currentY, 300, 85, colors.secondary);

      doc
        .fillColor(colors.text)
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(`Name: ${order.userId.name}`, 70, currentY + 20);

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(colors.lightText)
        .text(`Email: ${order.userId.email}`, 70, currentY + 40, {
          width: 260,
        });
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(colors.lightText)
        .text(
          `Address: ${order.address.addressType},${order.address.name},${order.address.city},${order.address.landMark},${order.address.state}.${order.address.pincode}`,
          70,
          currentY + 60,
          { width: 260 }
        );

      currentY += 130;

      // ====================
      // ORDER DETAILS TABLE
      // ====================

      // Section header
      doc
        .fillColor(colors.primary)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("ORDER DETAILS", 50, currentY);

      currentY += 30;

      // Table setup
      // const tableTop = currentY;
      // const tableWidth = 495;
      // const rowHeight = 35;

      // Table header
      const rowHeight = 30;
      const tableWidth = 500;
      const tableTop = doc.y + 20;

      // Draw header background box
      doc.rect(50, tableTop, tableWidth, rowHeight).fill(colors.primary); // fill background color

      // Reset fill color for text
      doc.fillColor("white").fontSize(11).font("Helvetica-Bold");

      // Header texts
      doc.text("#", 60, tableTop + 8, { width: 30, align: "left" });
      doc.text("Product Name", 100, tableTop + 8, {
        width: 200,
        align: "left",
      });
      doc.text("Qty", 320, tableTop + 8, { width: 50, align: "center" });
      doc.text("Unit Price", 380, tableTop + 8, { width: 80, align: "right" });
      doc.text("Total", 470, tableTop + 8, { width: 80, align: "right" });

      // Move Y position for next row
      currentY = tableTop + rowHeight;

      // Table rows
      let subtotal = 0;
      order.orderedItems.forEach((item, index) => {
        const itemTotal = item.product.salePrice * item.quantity;
        subtotal += itemTotal;

        // Alternate row colors
        const bgColor = index % 2 === 0 ? "white" : colors.secondary;
        addBox(50, currentY, tableWidth, rowHeight, bgColor, colors.border);

        doc
          .fillColor(colors.text)
          .fontSize(10)
          .font("Helvetica")
          .text((index + 1).toString(), 65, currentY + 12)
          .text(item.product.productName, 100, currentY + 12, { width: 200 })
          .text(item.quantity.toString(), 320, currentY + 12, {
            align: "center",
          })
          .text(
            `₹${item.product.salePrice.toLocaleString()}`,
            380,
            currentY + 12,
            { align: "right", width: 70 }
          )
          .text(`₹${itemTotal.toLocaleString()}`, 470, currentY + 12, {
            align: "right",
            width: 70,
          });

        currentY += rowHeight;
      });

      // Table border
      doc
        .strokeColor(colors.border)
        .rect(50, tableTop, tableWidth, currentY - tableTop)
        .stroke();

      currentY += 20;

      // ====================
      // TOTALS SECTION
      // ====================

      // Total calculations box
      const totalsX = 300;
      const totalsWidth = 245;

      addBox(
        totalsX,
        currentY,
        totalsWidth,
        100,
        colors.secondary,
        colors.border
      );

      // Subtotal
      doc
        .fillColor(colors.text)
        .fontSize(11)
        .font("Helvetica")
        .text("Subtotal:", totalsX + 20, currentY + 20)
        .text(`₹${subtotal.toLocaleString()}`, totalsX + 150, currentY + 20, {
          align: "right",
          width: 70,
        });

      // Tax (if applicable - you can modify this)
      // const tax = subtotal * 0.18; // 18% GST
      // doc.text('*including all taxes', totalsX + 20, currentY + 40)
      //    .text(`₹${tax.toLocaleString()}`, totalsX + 150, currentY + 40, { align: 'right', width: 70 });

      // Divider line
      addLine(
        totalsX + 20,
        currentY + 60,
        totalsX + 220,
        currentY + 60,
        colors.primary
      );

      // Grand Total
      doc
        .fillColor(colors.primary)
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("GRAND TOTAL:", totalsX + 20, currentY + 70)
        .text(
          `₹${order.totalPrice.toLocaleString()}`,
          totalsX + 150,
          currentY + 70,
          { align: "right", width: 70 }
        );

      currentY += 120;

      // ====================
      // PAYMENT INFO
      // ====================

      doc
        .fillColor(colors.primary)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("PAYMENT INFORMATION", 50, currentY);

      currentY += 20;

      addBox(50, currentY, 495, 60, colors.secondary);

      doc
        .fillColor(colors.text)
        .fontSize(11)
        .font("Helvetica")
        .text(`Payment Method : ${order.paymentMethod}`, 70, currentY + 15)
        .fillColor(colors.success)
        .font("Helvetica-Bold")
        .text(`Status: ${order.status}`, 70, currentY + 35);

      currentY += 70;

      // ====================
      // THANK YOU SECTION
      // ====================

      // Thank you box with nice styling
      addBox(50, currentY, 495, 80, colors.primary);

      doc
        .fillColor("white")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("THANK YOU FOR YOUR BUSINESS!", 10, currentY + 20, {
          align: "center",
          width: 495,
        });

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          "We appreciate your trust in our services. For any queries, contact us at hourlywatches@gmail.com",
          50,
          currentY + 50,
          {
            align: "center",
            width: 495,
          }
        );

      // Footer
      currentY += 86;
      doc
        .fillColor(colors.lightText)
        .fontSize(9)
        .text(`Generated on ${new Date().toDateString()}`, 50, currentY, {
          align: "center",
          width: 495,
        });

      doc.end();
    }
  } catch (error) {
    console.log("error in the invoice", error);
  }
};
module.exports = {
  invoice,
};

import html from "html-template-tag";


function PurchaseInvoiceTemplate(InvoiceData) {
  let [InvoiceDate, InvoiceTime] = InvoiceData.DateTime.split("T");
  InvoiceTime = InvoiceTime.split(":");
  let AMPM = InvoiceTime[0] >= 12 ? "مساءً" : "صباحا";
  InvoiceTime = `${InvoiceTime[0] % 12}:${InvoiceTime[1]} ${AMPM}`;
  var Template = html`
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          direction: rtl;
          margin: 0;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .invoice-container {
          background-color: #fff;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .invoice-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .invoice-header h1 {
          margin: 0;
        }
        .invoice-details {
          display: grid;
          grid-template-columns: 50% 50%;
          margin-bottom: 20px;
        }
        .invoice-details p {
          margin: 5px 0;
        }
      </style> 
    <body>
      <div class="Invoice-header">
        <h1>فاتورة شراء</h1>
      </div>
      <div class="invoice-container">
        <div class="invoice-details">
          <p>رقم الفاتورة: ${InvoiceData.Invoice_ID}</p>
          <p>تاريخ الفاتورة: ${InvoiceDate}</p>
          <p>وقت التسجيل: ${InvoiceTime}</p>
          <p>اسم البائع: ${InvoiceData.Seller_Name}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px;">اسم المنتج</th>
              <th style="border: 1px solid #ddd; padding: 8px;">العلامة التجارية</th>
              <th style="border: 1px solid #ddd; padding: 8px;">بلد الصنع</th>
              <th style="border: 1px solid #ddd; padding: 8px;">كود المنتج</th>
              <th style="border: 1px solid #ddd; padding: 8px;">الكمية</th>
              <th style="border: 1px solid #ddd; padding: 8px;">سعر الوحدة</th>
              <th style="border: 1px solid #ddd; padding: 8px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            ${InvoiceData.Items.map((item) => 
              `<tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Product_Name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Trademark}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Manufacture_Country}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Product_ID}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Quantity} ${item.Quantity_Unit}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Unit_Price}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Quantity * item.Unit_Price}</td>
              </tr>`
            )}
          </tbody>
        </table>
        <div class="invoice-total">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">المبلغ الكلي</th>
                <th style="border: 1px solid #ddd; padding: 8px;">المدفوع</th>
                <th style="border: 1px solid #ddd; padding: 8px;">المخصوم من الحساب</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${InvoiceData.Total_Price}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${InvoiceData.Paid}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${InvoiceData.Deducted_From_Account}</td>
              </tr>
            </tbody>
          </table>
        </div>
    </body>
  </html>`;
  return Template;
}
export default PurchaseInvoiceTemplate;
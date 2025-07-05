import html from "html-template-tag";


function TransitionDocumentTemplate(DocumentData) {
  let [DocumentDate, DocumentTime] = DocumentData.DateTime.split("T");
  DocumentTime = DocumentTime.split(":");
  let AMPM = DocumentTime[0] >= 12 ? "مساءً" : "صباحا";
  DocumentTime = `${DocumentTime[0] % 12}:${DocumentTime[1]} ${AMPM}`;
  var Template = html`
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          direction: rtl;
          margin: 0;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .document-container {
          background-color: #fff;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .document-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .document-header h1 {
          margin: 0;
        }
        .document-details {
          display: grid;
          grid-template-columns: 50% 50%;
          margin-bottom: 20px;
        }
        .document-details p {
          margin: 5px 0;
        }
      </style> 
    <body>
      <div class="document-header">
        <h1>مستند تحويل</h1>
      </div>
      <div class="document-container">
        <div class="document-details">
          <p>رقم المستند: ${DocumentData.Document_ID}</p>
          <p>تاريخ المستند: ${DocumentDate}</p>
          <p>وقت التسجيل: ${DocumentTime}</p>
          <p>المخزن المصدر: ${DocumentData.Source_Store_Name}</p>
          <p>المخزن الهدف: ${DocumentData.Destination_Store_Name}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px;">اسم المنتج</th>
              <th style="border: 1px solid #ddd; padding: 8px;">العلامة التجارية</th>
              <th style="border: 1px solid #ddd; padding: 8px;">بلد الصنع</th>
              <th style="border: 1px solid #ddd; padding: 8px;">كود المنتج</th>
              <th style="border: 1px solid #ddd; padding: 8px;">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${DocumentData.Items.map((item) => 
              `<tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Product_Name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Trademark}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Manufacture_Country}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Product_ID}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.Quantity} ${item.Quantity_Unit}</td>
              </tr>`
            )}
          </tbody>
        </table>
    </body>
  </html>`;
  return Template;
}
export default TransitionDocumentTemplate;
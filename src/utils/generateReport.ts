import fs from 'fs';
import path from 'path';

const generateHTMLReport = (data: any[], average: number) => {
  const reportPath = path.join(__dirname, 'custom-report.html');
  
  // Create HTML content with the average exchange rate
  const htmlContent = `
    <html>
      <head>
        <title>Custom Report</title>
      </head>
      <body>
        <h1>API Test Report</h1>
        <table border="1">
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: any) => `
              <tr>
                <td>${item.date}</td>
                <td>${item.value}</td>
                <td>${item.currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <h2>Average Exchange Rate</h2>
        <p><strong>Average Exchange Rate:</strong> ${average.toFixed(4)} ${data[0].currency}</p>
      </body>
    </html>
  `;

  fs.writeFileSync(reportPath, htmlContent);
};

export default generateHTMLReport;

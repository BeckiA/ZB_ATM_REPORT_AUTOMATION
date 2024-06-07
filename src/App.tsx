import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import * as XLSX from 'xlsx';

interface ATMStatus {
  ATM: string;
  Status: string;
}

const App: React.FC = () => {
  const [results, setResults] = useState<ATMStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailTableHtml, setEmailTableHtml] = useState('');

  useEffect(() => {
    fetch('/atm_data.xlsx')
      .then(response => response.arrayBuffer())
      .then(data => {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as Array<Array<string>>;

        const [headers, ...rows] = jsonData;

        const filteredRows = rows.filter(row => row.every(cell => cell !== undefined && cell !== null && cell !== ''));

        const atmList = filteredRows.map(row => ({
          ATM: row[headers.indexOf('ATM')],
          IP: row[headers.indexOf('IP')],
        }));

        checkAtmStatuses(atmList);
      });
  }, []);

  const checkAtmStatus = async (atmName: string, atmIp: string): Promise<ATMStatus> => {
    try {
      const response = await axios.get('http://localhost:5000/ping', {
        params: { atmIp }
      });
      const { atmReply, modemReply } = response.data;

      if (atmReply && modemReply) {
        return { ATM: atmName, Status: 'Both replies' };
      } else if (modemReply) {
        return { ATM: atmName, Status: 'Only ADSL reply' };
      } else {
        return { ATM: atmName, Status: 'Line or Power Issue' };
      }
    } catch (error) {
      console.error(error);
      return { ATM: atmName, Status: 'Error' };
    }
  };

  const checkAtmStatuses = async (atmList: { ATM: string; IP: string }[]) => {
    setLoading(true);
    const results: ATMStatus[] = [];

    for (const atm of atmList) {
      const atmStatus = await checkAtmStatus(atm.ATM, atm.IP);
      results.push(atmStatus);
    }

    setResults(results);
    setLoading(false);
  };

  const getCurrentFormattedDate = () => {
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[now.getMonth()];
    const day = now.getDate();
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year}_${hours}-${minutes}`;
  };

  const downloadTxt = () => {
    const filteredResults = results.filter(result => result.Status !== 'Both replies' && result.Status !== 'Error');
    const categorizedResults = filteredResults.reduce(
      (acc: { [key: string]: string[] }, result) => {
        if (!acc[result.Status]) {
          acc[result.Status] = [];
        }
        acc[result.Status].push(result.ATM);
        return acc;
      },
      {} as { [key: string]: string[] }
    );

    let content = '';
    for (const [status, atms] of Object.entries(categorizedResults)) {
      content += `${status}:\n${atms.join(', ')}\n\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const currentDate = getCurrentFormattedDate();
    saveAs(blob, `ATM_Status_${currentDate}.txt`);
  };

  const generateDocxDocument = (results: ATMStatus[]): Document => {
    const filteredResults = results.filter(result => result.Status !== 'Both replies' && result.Status !== 'Error');
    const categorizedResults = filteredResults.reduce(
      (acc, result) => {
        if (!acc[result.Status]) {
          acc[result.Status] = [];
        }
        acc[result.Status].push(result);
        return acc;
      },
      {} as { [key: string]: ATMStatus[] }
    );

    const sections = Object.keys(categorizedResults).map(status => {
      const atmNames = categorizedResults[status].map(result => result.ATM).join(', ');

      return {
        properties: {},
        children: [
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph(status)],
                  }),
                  new TableCell({
                    children: [new Paragraph(atmNames)],
                  }),
                ],
              }),
            ],
          }),
        ],
      };
    });

    return new Document({
      sections: [
        {
          children: sections.flatMap(section => section.children),
        },
      ],
    });
  };

  const downloadWord = async (results: ATMStatus[]) => {
    const doc = generateDocxDocument(results);

    try {
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const currentDate = getCurrentFormattedDate();
      saveAs(blob, `ATM_Status_${currentDate}.docx`);
    } catch (error) {
      console.error('Error generating Word document:', error);
    }
  };

  const sortedResults = [...results]
    .filter(result => result.Status !== 'Error')
    .sort((a, b) => {
      const statusOrder: { [key: string]: number } = {
        'Line or Power Issue': 0,
        'Only ADSL reply': 1,
        'Both replies': 2,
      };

      return (statusOrder[a.Status] ?? 3) - (statusOrder[b.Status] ?? 3);
    });

  const getColorClass = (status: string) => {
    switch (status) {
      case 'Line or Power Issue':
        return 'bg-red-200 text-red-800';
      case 'Only ADSL reply':
        return 'bg-yellow-200 text-yellow-800';
      case 'Both replies':
        return 'bg-green-200 text-green-800';
      default:
        return '';
    }
  };

  const filteredResults = sortedResults.filter(result => 
    result.ATM.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateEmailTable = (results: ATMStatus[]) => {
    const tableHeader = `
      <tr>
        <th>No</th>
        <th>ATM Name</th>
        <th>Current ATM Status</th>
      </tr>
    `;

    const tableRows = results.map((result, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${result.ATM}</td>
        <td>${result.Status}</td>
      </tr>
    `).join('');

    return `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        ${tableHeader}
        ${tableRows}
      </table>
    `;
  };

  const copyToClipboard = (htmlContent: string) => {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlContent;
    document.body.appendChild(tempElement);

    if (document.createRange && window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(tempElement);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);

        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Unable to copy', err);
        }

        selection.removeAllRanges();
      }
    }

    document.body.removeChild(tempElement);
  };

  const openInEmail = (results: ATMStatus[]) => {
    const emailBody = generateEmailTable(results);
    setEmailTableHtml(emailBody);
    copyToClipboard(emailBody);
    alert('HTML table copied to clipboard. You can now paste it into your email body.');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ATM Status Checker</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <input 
            type="text" 
            placeholder="Search ATM" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="mb-4 p-2 border border-gray-300 rounded"
          />
          <div className="mb-4">
            <button 
              onClick={downloadTxt} 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
              disabled={!filteredResults.length}
            >
              Download TXT
            </button>
            <button 
              onClick={() => downloadWord(filteredResults)}  
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
              disabled={!filteredResults.length}
            >
              Download Word
            </button>
            <button
              onClick={() => openInEmail(filteredResults)}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              disabled={!filteredResults.length}
            >
              Open in Email
            </button>
          </div>
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-gray-200 border-b border-gray-300">No</th>
                <th className="py-2 px-4 bg-gray-200 border-b border-gray-300">ATM Name</th>
                <th className="py-2 px-4 bg-gray-200 border-b border-gray-300">Current ATM Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, index) => (
                <tr key={index} className={`${getColorClass(result.Status)} hover:bg-gray-100`}>
                  <td className="py-2 px-4 border-b border-gray-300">{index + 1}</td>
                  <td className="py-2 px-4 border-b border-gray-300">{result.ATM}</td>
                  <td className="py-2 px-4 border-b border-gray-300">{result.Status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div dangerouslySetInnerHTML={{ __html: emailTableHtml }} style={{ display: 'none' }} />
        </>
      )}
    </div>
  );
};

export default App;

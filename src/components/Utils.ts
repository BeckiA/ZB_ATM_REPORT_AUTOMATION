import axios from 'axios';
import { Document, Paragraph, Table, TableCell, TableRow } from 'docx';
import { ATMStatus } from './types';

export const checkAtmStatus = async (atmName: string, atmIp: string): Promise<ATMStatus> => {
  try {
    const response = await axios.get('http://localhost:5000/ping', {
      params: { atmIp }
    });
    const { atmReply, modemReply, is4G } = response.data;

    if (is4G) {
      if (atmReply) {
        return { ATM: atmName, Status: '4G ATM reachable' };
      } else {
        return { ATM: atmName, Status: '4G ATM not reachable' };
      }
    } else {
      if (atmReply && modemReply) {
        return { ATM: atmName, Status: 'Both replies' };
      } else if (modemReply) {
        return { ATM: atmName, Status: 'Only ADSL reply' };
      } else {
        return { ATM: atmName, Status: 'Line or Power Issue' };
      }
    }
  } catch (error) {
    console.error(error);
    return { ATM: atmName, Status: 'Error' };
  }
};

export const getCurrentFormattedDate = () => {
  const now = new Date();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year}_${hours}-${minutes}`;
};

export const generateEmailTable = (results: ATMStatus[]) => {
  const tableRows = results
    .filter(result => result.Status !== 'Both replies')
    .map((result) => `
      <tr>
        <td style="width: 55%; border: 1px solid black;">${result.ATM}</td>
        <td style="width: 45%; border: 1px solid black;">${result.Status}</td>
      </tr>
    `).join('');

  return `
    <table style="border-collapse: collapse; width: 50%; border: 1px solid black;">
      ${tableRows}
    </table>
  `;
};

export const copyToClipboard = (htmlContent: string) => {
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

export const generateDocxDocument = (results: ATMStatus[]): Document => {
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

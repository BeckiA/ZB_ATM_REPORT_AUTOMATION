import React from 'react';
import { saveAs } from 'file-saver';
import { Packer } from 'docx';
import { ATMStatus } from './types';
import { copyToClipboard, generateDocxDocument, generateEmailTable, getCurrentFormattedDate } from './Utils';

interface ActionsProps {
  results: ATMStatus[];
  setEmailTableHtml: (html: string) => void;
}

const Actions: React.FC<ActionsProps> = ({ results, setEmailTableHtml }) => {
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

  const downloadWord = async () => {
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

  const openInEmail = () => {
    const emailBody = generateEmailTable(results);
    setEmailTableHtml(emailBody);
    copyToClipboard(emailBody);
    alert('HTML table copied to clipboard. You can now paste it into your email body.');
  };

  return (
    <div className="mb-4 flex justify-end">
      <button 
        onClick={downloadTxt} 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        disabled={!results.length}
      >
        Download TXT
      </button>
      <button 
        onClick={downloadWord}  
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
        disabled={!results.length}
      >
        Download Word
      </button>
      <button
        onClick={openInEmail}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        disabled={!results.length}
      >
        Open in Email
      </button>
    </div>
  );
};

export default Actions;

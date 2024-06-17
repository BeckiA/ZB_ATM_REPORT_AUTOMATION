import React from 'react';
import { ATMStatus } from './types';

interface ATMTableProps {
  results: ATMStatus[];
  currentATM?: string;
}

const getColorClass = (status: string) => {
  switch (status) {
    case 'Line or Power Issue':
      return 'bg-red-200 text-red-800';
    case 'Only ADSL reply':
      return 'bg-yellow-200 text-yellow-800';
    case 'Both replies':
      return 'bg-green-200 text-green-800';
    case '4G ATM reachable':
      return 'bg-blue-200 text-blue-800';
    case '4G ATM not reachable':
      return 'bg-purple-200 text-purple-800';
    default:
      return '';
  }
};

const ATMTable: React.FC<ATMTableProps> = ({ results, currentATM }) => {
  return (
    <table className="min-w-full bg-white border border-gray-300">
      <thead>
        <tr>
          <th className="py-2 px-4 bg-gray-200 border-b border-gray-300">No</th>
          <th className="py-2 px-4 bg-gray-200 border-b border-gray-300">ATM Name</th>
          <th className="py-2 px-4 bg-gray-200 border-b border-gray-300">Current ATM Status</th>
        </tr>
      </thead>
      <tbody>
        {results.map((result, index) => (
          <tr 
            key={index} 
            className={`${getColorClass(result.Status)} ${currentATM === result.ATM ? 'font-bold' : ''} hover:bg-gray-100`}
          >
            <td className="py-2 px-4 border-b border-gray-300">{index + 1}</td>
            <td className="py-2 px-4 border-b border-gray-300">{result.ATM}</td>
            <td className="py-2 px-4 border-b border-gray-300">{result.Status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ATMTable;
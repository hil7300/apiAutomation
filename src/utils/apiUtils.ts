import { request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../config/config';
import path from 'path';
import fs from 'fs';
import readlineSync from 'readline-sync';

let apiContext: APIRequestContext;

export const initApiContext = async () => {
  apiContext = await playwrightRequest.newContext();
};

export const fetchExchangeRates = async (baseCurrency: string, targetCurrency: string, queryParams: string = '') => {
  const url = `${BASE_URL}/FX${baseCurrency}${targetCurrency}/json${queryParams ? `?${queryParams}` : ''}`;
  const response = await apiContext.get(url);
  if (!response.ok()) {
    throw new Error(`Failed to fetch data (Status: ${response.status()} - ${response.statusText()})`);
  }
  return response.json(); // Directly parse JSON
};


// Function to write report to a file
export const generateCSVReport = async (reportData: any[], average: number, baseCurrency: string, targetCurrency: string) => {
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }
  const reportPath = path.join(reportsDir, 'forex_report.csv');
  let reportContent = 'Date,Value and Currency\n';
  reportData.forEach(({ date, value, currency }) => {
    reportContent += `${date}, ${value} ${currency}\n`;
  });
  reportContent += `\nAverage Exchange Rate: ${average.toFixed(4)} ${baseCurrency} to ${targetCurrency}`;
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Report generated at: ${reportPath}`);
};

// Utility function to ask the user for input
export const askForInput = (query: string) => readlineSync.question(query);

// Function to get user inputs
export const getUserInputs = async () => {
  const baseCurrency = askForInput('Enter the base currency (e.g., CAD, AUD, BRL, CNY, EUR, MXN): ');
  const targetCurrency = askForInput('Enter the target currency (e.g., CAD, AUD, BRL, CNY, EUR, MXN): ');
  const recentWeeks = askForInput('Enter the number of recent weeks to fetch (e.g., 5, 10, 15): ');
  return { baseCurrency, targetCurrency, recentWeeks };
};

export const closeApiContext = async () => {
  await apiContext.dispose();
};
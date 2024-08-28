import { test, expect } from '@playwright/test';
import { fetchExchangeRates, initApiContext } from '../utils/apiUtils';
import generateHTMLReport from '../utils/generateReport';
import path from 'path';
import fs from 'fs';

const currenciesList = [
    { base: 'CAD', target: 'AUD', weeks: '10' }
];

test.beforeAll(async () => {
    await initApiContext();
});
test.describe('Forex API Tests', () => {
    currenciesList.forEach(({ base, target, weeks }) => {
        test(`should fetch the most recent exchange rates for ${base} to ${target}`, async () => {
            try {
                const data = await fetchExchangeRates(base, target, `recent_weeks=${weeks}`);

                // Log the parsed data to understand its structure
                console.log(JSON.stringify(data, null, 2));

                const reportData = data.observations.map((obs: any) => ({
                    date: obs.d,
                    value: obs[`FX${base}${target}`]?.v || 'N/A',
                    currency: `${base} to ${target}`
                }));

                // Calculate the average exchange rate
                const values = data.observations.map((obs: any) => parseFloat(obs[`FX${base}${target}`]?.v || '0'));
                const total = values.reduce((sum: number, value: number) => sum + value, 0);
                const average = total / values.length;

                expect(average).toBeGreaterThan(0);

                // Prepare and save the report
                const reportsDir = path.join(__dirname, '../reports');
                if (!fs.existsSync(reportsDir)) {
                    fs.mkdirSync(reportsDir);
                }

                const reportPath = path.join(reportsDir, `forex_report_${base}_${target}.csv`);
                let reportContent = 'Date,Value and Currency\n';
                reportData.forEach((item: { date: any; value: any; currency: any; }) => {
                    reportContent += `${item.date}, ${item.value} ${item.currency}\n`;
                });
                reportContent += `\nAverage Exchange Rate: ${average.toFixed(4)} ${base} to ${target}`;
                fs.writeFileSync(reportPath, reportContent);

                console.log(`Report generated at: ${reportPath}`);

                // Positive assertions
                expect(data).toBeDefined();
                expect(data).toHaveProperty('observations');
                expect(data.observations).toBeInstanceOf(Array);
                expect(data.observations.length).toBeGreaterThan(0);

                data.observations.forEach((obs: any) => {
                    // Check that each observation has a date
                    expect(obs).toHaveProperty('d');
                    expect(typeof obs.d).toBe('string');
                    expect(obs.d).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Validate date format YYYY-MM-DD

                    // Check that each observation has an exchange rate value
                    const currencyPairKey = `FX${base}${target}`;
                    expect(obs).toHaveProperty(currencyPairKey);
                    expect(obs[currencyPairKey]).toHaveProperty('v');
                    expect(typeof obs[currencyPairKey].v).toBe('string'); // or 'number' if it's a number

                    // Optionally, validate the value format (e.g., is it a number?)
                    expect(!isNaN(parseFloat(obs[currencyPairKey].v))).toBe(true);
                });
            } catch (error) {
                console.error(`Error fetching exchange rates for ${base} to ${target}:`, error);
                throw error; // Re-throw to ensure test failure on error
            }
        });
    });

    // Error handling tests
    test('should handle invalid currency pairs gracefully', async () => {
        try {
            const data = await fetchExchangeRates('CAD', 'ZZZ', 'recent_weeks=10');
            console.log(JSON.stringify(data, null, 2));
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('Invalid currency');
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    test('should handle invalid query parameters gracefully', async () => {
        try {
            const data = await fetchExchangeRates('CAD', 'AUD', 'recent_weeks=invalid');
            console.log(JSON.stringify(data, null, 2));
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('Invalid query parameter');
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    test('should handle HTTP 404 Not Found response', async () => {
        try {
            const response = await fetchExchangeRates('CAD', 'AUD', 'non_existent_param');
            expect(response.status()).toBe(404); // Ensure status code is 404
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(responseBody.error).toContain('Not Found');
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    test('should handle HTTP 500 Internal Server Error response', async () => {
        try {
            const response = await fetchExchangeRates('CAD', 'AUD', 'server_error_param');
            expect(response.status()).toBe(500); // Ensure status code is 500
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(responseBody.error).toContain('Internal Server Error');
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    test('should handle HTTP 400 Bad Request response', async () => {
        try {
            const response = await fetchExchangeRates('CAD', 'AUD', 'bad_request_param');
            expect(response.status()).toBe(400); // Ensure status code is 400
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(responseBody.error).toContain('Bad Request');
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });
});
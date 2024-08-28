import { test, expect } from '@playwright/test';
import { fetchExchangeRates, initApiContext, closeApiContext, getUserInputs, generateCSVReport } from '../utils/apiUtils';
import generateHTMLReport from '../utils/generateReport';
import path from 'path';
import fs from 'fs';
import readlineSync from 'readline-sync';

// Initialize the API context before all tests
test.beforeAll(async () => {
    await initApiContext();
});

// Clean up the API context after all tests
test.afterAll(async () => {
    await closeApiContext();
});

test.describe('Forex API Tests', async () => {
    // Get user inputs for base currency, target currency, and recent weeks
    const { baseCurrency, targetCurrency, recentWeeks } = await getUserInputs();

    // Test to fetch the most recent exchange rates for the specified currency pair
    test(`should fetch the most recent exchange rates for ${baseCurrency} to ${targetCurrency}`, async () => {
        try {
            const queryParams = `recent_weeks=${recentWeeks}`;
            // Fetch the exchange rates from the API
            const data = await fetchExchangeRates(baseCurrency, targetCurrency, queryParams);

            // Log the fetched data for debugging purposes
            // console.log('Fetched Data:', JSON.stringify(data, null, 2));

            // Calculate the average exchange rate
            const values = data.observations.map((obs: any) => parseFloat(obs[`FX${baseCurrency}${targetCurrency}`].v));
            const total = values.reduce((sum: any, value: any) => sum + value, 0);
            const average = total / values.length;

            // Assert that the average is greater than 0
            expect(average).toBeGreaterThan(0);
            console.log(`Average exchange rate: ${average.toFixed(4)} ${baseCurrency} to ${targetCurrency}`);

            // Prepare the report data and generating an HTML Report
            const reportData = data.observations.map((obs: any) => ({
                date: obs.d,
                value: obs[`FX${baseCurrency}${targetCurrency}`].v,
                currency: `${baseCurrency} to ${targetCurrency}`
            }));
            await generateHTMLReport(reportData, average);

            // Write the report to a CSV file
            await generateCSVReport(reportData, average, baseCurrency, targetCurrency);

            // Assertions to verify the response structure and data
            expect(data).toBeDefined();
            expect(data).toHaveProperty('observations');
            expect(data.observations).toBeInstanceOf(Array);
            expect(data.observations.length).toBeGreaterThan(0);

            // Validate each observation's structure and content
            data.observations.forEach((obs: any) => {
                // Ensure each observation has a date in the correct format
                expect(obs).toHaveProperty('d');
                expect(typeof obs.d).toBe('string');
                expect(obs.d).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD

                // Ensure each observation has an exchange rate value for the currency pair
                const currencyPairKey = `FX${baseCurrency}${targetCurrency}`;
                expect(obs).toHaveProperty(currencyPairKey);
                expect(obs[currencyPairKey]).toHaveProperty('v');
                expect(typeof obs[currencyPairKey].v).toBe('string'); // or 'number' if it's a number

                // Validate that the value is a number
                expect(!isNaN(parseFloat(obs[currencyPairKey].v))).toBe(true);
            });
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            throw error; // Re-throw to ensure test failure on error
        }
    });

    // Test to handle invalid currency pairs gracefully
    test('should handle invalid currency pairs gracefully', async () => {
        try {
            const data = await fetchExchangeRates(baseCurrency, 'ZZZ', `recent_weeks=${recentWeeks}`);
            // console.log(JSON.stringify(data, null, 2));

            // Assert that the response contains an error property with a relevant message
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('Invalid currency');
        } catch (error: unknown) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    // Test to handle invalid query parameters gracefully
    test('should handle invalid query parameters gracefully', async () => {
        try {
            const data = await fetchExchangeRates(baseCurrency, targetCurrency, 'recent_weeks=invalid');
            // console.log(JSON.stringify(data, null, 2));

            // Assert that the response contains an error property with a relevant message
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('Invalid query parameter');
        } catch (error: unknown) {
            if (error instanceof Error) {
                // If an error is thrown, ensure it's handled correctly
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    // Test to handle HTTP 404 Not Found response
    test('should handle HTTP 404 Not Found response', async () => {
        try {
            // Simulate an endpoint that does not exist
            const response = await fetchExchangeRates(baseCurrency, targetCurrency, 'non_existent_param');

            // Assert that the response contains an error property with a relevant message
            expect(response.status()).toBe(404); // Ensure status code is 404
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(responseBody.error).toContain('Not Found');
        } catch (error: unknown) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    // Test to handle HTTP 500 Internal Server Error response
    test('should handle HTTP 500 Internal Server Error response', async () => {
        try {
            // Simulate a server error
            const response = await fetchExchangeRates(baseCurrency, targetCurrency, 'server_error_param');

            // Assert that the response contains an error property with a relevant message
            expect(response.status()).toBe(500); // Ensure status code is 500
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(responseBody.error).toContain('Internal Server Error');
        } catch (error: unknown) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });

    // Test to handle HTTP 400 Bad Request response
    test('should handle HTTP 400 Bad Request response', async () => {
        try {
            // Simulate a bad request
            const response = await fetchExchangeRates(baseCurrency, targetCurrency, 'bad_request_param');

            // Assert that the response contains an error property with a relevant message
            expect(response.status()).toBe(400); // Ensure status code is 400
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(responseBody.error).toContain('Bad Request');
        } catch (error: unknown) {
            if (error instanceof Error) {
                expect(error.message).toContain('Failed to fetch data');
            }
        }
    });
});

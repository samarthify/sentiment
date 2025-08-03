// Remove PapaParse import if no longer needed elsewhere
// import Papa from 'papaparse';
import { supabase } from '../supabaseClient.ts'; // Import supabase client

// Define API endpoint URL (Best practice: use environment variable)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Use env var or default
const COMPARISON_DATA_ENDPOINT = `${API_BASE_URL}/comparison-data`;

class ComparisonService {
  // Removed loadCSVData method
  /*
  async loadCSVData(filePath) {
    try {
      console.log(`Attempting to load data from ${filePath}`);
      const response = await fetch(`./${filePath}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      console.log('CSV data loaded, length:', csvText.length);
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            console.log(`Papa parse complete for ${filePath}, rows:`, results.data.length);
            if (results.errors && results.errors.length > 0) {
              console.warn('Parser errors:', results.errors);
            }
            resolve(results.data);
          },
          error: (error) => {
            console.error('Papa parse error:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error(`Error loading data from ${filePath}:`, error);
      throw error;
    }
  }
  */

  async compareDatasets(accessToken) {
    try {
      // const oldDataFile = 'processed_data_old.csv'; // Removed
      // const newDataFile = 'processed_data.csv';   // Removed
      
      // const [oldData, newData] = await Promise.all([ // Removed
      //   this.loadCSVData(oldDataFile),
      //   this.loadCSVData(newDataFile)
      // ]);

      console.log(`Fetching comparison data from ${COMPARISON_DATA_ENDPOINT}`);
      
      // Add headers, including Authorization if accessToken is provided
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(COMPARISON_DATA_ENDPOINT, { headers }); // Pass headers

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        // Check for 401/403 specifically
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication required: ${errorData.detail || 'Please log in.'}`);
        }
        throw new Error(`Failed to fetch comparison data: ${response.status} - ${errorData.message || errorData.detail || 'Unknown error'}`);
      }

      const result = await response.json();

      if (result.status !== 'success' || !result.latest_data || !result.previous_data) {
        throw new Error(`API did not return valid comparison data: ${result.message || 'Missing data fields'}`);
      }

      console.log(`Received comparison data: ${result.latest_data.length} latest records, ${result.previous_data.length} previous records.`);

      // Pass the data arrays directly to the report generator
      return this.generateComparisonReport(result.previous_data, result.latest_data);

    } catch (error) {
      console.error('Error comparing datasets:', error);
      // Rethrow or handle the error appropriately for the UI
      throw error;
    }
  }

  generateComparisonReport(oldData, newData) {
    // Basic statistics
    const oldCount = oldData.length;
    const newCount = newData.length;
    const countDifference = newCount - oldCount;
    const percentChange = oldCount > 0 ? (countDifference / oldCount * 100).toFixed(2) : 'N/A';

    // Example check:
    if (oldData.length > 0 && typeof oldData[0].sentiment_score === 'undefined') {
        console.warn("Field 'sentiment_score' might be missing or named differently in API response for old data.");
    }
     if (newData.length > 0 && typeof newData[0].sentiment_score === 'undefined') {
        console.warn("Field 'sentiment_score' might be missing or named differently in API response for new data.");
    }


    // Sentiment analysis comparison
    const oldSentiment = this.calculateAverageSentiment(oldData);
    const newSentiment = this.calculateAverageSentiment(newData);
    const sentimentDifference = newSentiment && oldSentiment ? (newSentiment - oldSentiment).toFixed(4) : 'N/A'; // Handle potential null/NaN

    // Platform distribution comparison
    const oldPlatformDistribution = this.calculatePlatformDistribution(oldData);
    const newPlatformDistribution = this.calculatePlatformDistribution(newData);
    const platformComparison = this.comparePlatformDistributions(oldPlatformDistribution, newPlatformDistribution);

    // Country distribution comparison
    const oldCountryDistribution = this.calculateCountryDistribution(oldData);
    const newCountryDistribution = this.calculateCountryDistribution(newData);
    const countryComparison = this.compareCountryDistributions(oldCountryDistribution, newCountryDistribution);

    // Sentiment distribution comparison
    const oldSentimentDistribution = this.calculateSentimentDistribution(oldData);
    const newSentimentDistribution = this.calculateSentimentDistribution(newData);

    // Find new entries
    const newEntries = this.findNewEntries(oldData, newData);

    return {
      datasetInfo: {
        oldDatasetCount: oldCount,
        newDatasetCount: newCount,
        countDifference,
        percentChange
      },
      sentimentComparison: {
        oldAverageSentiment: oldSentiment,
        newAverageSentiment: newSentiment,
        difference: sentimentDifference,
        trend: sentimentDifference === 'N/A' ? 'N/A' : (parseFloat(sentimentDifference) > 0 ? 'Improved' : parseFloat(sentimentDifference) < 0 ? 'Declined' : 'Unchanged')
      },
      platformComparison: platformComparison,
      countryComparison: countryComparison,
      sentimentDistribution: {
        old: oldSentimentDistribution,
        new: newSentimentDistribution
      },
      newEntries: newEntries.slice(0, 100) // Limit to 100 for performance
    };
  }

  // --- Helper methods --- 

  calculateAverageSentiment(data) {
      if (!data || data.length === 0) return 0;

      // Check the first row for expected fields if data exists
      if (data.length > 0) {
          const firstRow = data[0];
          if (typeof firstRow.sentiment_label === 'undefined' && typeof firstRow.sentiment_score === 'undefined') {
              console.warn("Cannot calculate average sentiment: 'sentiment_label' and 'sentiment_score' fields are missing.");
              return 0; // Return 0 or null/NaN as appropriate
          }
      }

      const sentimentMap = {
        'positive': 1,
        'neutral': 0,
        'negative': -1
      };

      let scoreSum = 0;
      let validEntries = 0;

      data.forEach(row => {
        let score = NaN;
        // Prefer label if available and valid
        if (row.sentiment_label) {
          const label = String(row.sentiment_label).toLowerCase(); // Ensure string
          if (sentimentMap[label] !== undefined) {
            score = sentimentMap[label];
          }
        }
        // Fallback to score if label wasn't valid or present
        if (isNaN(score) && row.sentiment_score !== null && row.sentiment_score !== undefined) {
           const parsedScore = parseFloat(row.sentiment_score);
           // Use score directly if it's a number (assuming it's already scaled appropriately, e.g., -1 to 1 or 0 to 1)
           // If your score is not already mapped like the labels, you might need mapping here too.
           if (!isNaN(parsedScore)) {
               score = parsedScore; // Use the score directly
           }
        }

        if (!isNaN(score)) {
            scoreSum += score;
            validEntries++;
        }
      });

      return validEntries > 0 ? (scoreSum / validEntries).toFixed(4) : 0; // Avoid division by zero
  }

   calculatePlatformDistribution(data) {
       if (!data || data.length === 0) return {};
       // Check for 'platform' field
       if (data.length > 0 && typeof data[0].platform === 'undefined') {
           console.warn("Field 'platform' missing, cannot calculate platform distribution.");
           return {};
       }
        const distribution = {};
        data.forEach(row => {
          const platform = row.platform || 'Unknown';
          distribution[platform] = (distribution[platform] || 0) + 1;
        });
        return distribution;
   }

    comparePlatformDistributions(oldDistribution, newDistribution) {
         const allPlatforms = [...new Set([...Object.keys(oldDistribution), ...Object.keys(newDistribution)])];
         return allPlatforms.map(platform => {
             const oldCount = oldDistribution[platform] || 0;
             const newCount = newDistribution[platform] || 0;
             const difference = newCount - oldCount;
             const percentChange = oldCount > 0 ? (difference / oldCount * 100).toFixed(2) : (newCount > 0 ? 'New' : 'N/A'); // Indicate 'New' if old count was 0
             return { platform, oldCount, newCount, difference, percentChange };
         }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    }

    calculateCountryDistribution(data) {
        if (!data || data.length === 0) return {};
        // Check for 'country' field
        if (data.length > 0 && typeof data[0].country === 'undefined') {
            // Attempt fallback to 'location' if 'country' is missing
            if (typeof data[0].location !== 'undefined') {
                 console.warn("Field 'country' missing, falling back to 'location' for country distribution.");
                 const distribution = {};
                 data.forEach(row => {
                     const location = row.location || 'Unknown';
                     distribution[location] = (distribution[location] || 0) + 1;
                 });
                 return distribution;
            } else {
                console.warn("Fields 'country' and 'location' missing, cannot calculate country distribution.");
                return {};
            }
        }
         const distribution = {};
         data.forEach(row => {
             const country = row.country || 'Unknown'; // Assuming 'country' field exists
             distribution[country] = (distribution[country] || 0) + 1;
         });
         return distribution;
    }

     compareCountryDistributions(oldDistribution, newDistribution) {
         const allCountries = [...new Set([...Object.keys(oldDistribution), ...Object.keys(newDistribution)])];
         return allCountries.map(country => {
             const oldCount = oldDistribution[country] || 0;
             const newCount = newDistribution[country] || 0;
             const difference = newCount - oldCount;
              const percentChange = oldCount > 0 ? (difference / oldCount * 100).toFixed(2) : (newCount > 0 ? 'New' : 'N/A'); // Indicate 'New' if old count was 0
             return { country, oldCount, newCount, difference, percentChange };
         }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
     }

    calculateSentimentDistribution(data) {
        if (!data || data.length === 0) return { positive: { count: 0, percentage: '0.00' }, neutral: { count: 0, percentage: '0.00' }, negative: { count: 0, percentage: '0.00' } };

        // Check fields
         if (data.length > 0) {
            const firstRow = data[0];
            if (typeof firstRow.sentiment_label === 'undefined' && typeof firstRow.sentiment_score === 'undefined') {
                console.warn("Cannot calculate sentiment distribution: 'sentiment_label' and 'sentiment_score' fields are missing.");
                return { positive: { count: 0, percentage: '0.00' }, neutral: { count: 0, percentage: '0.00' }, negative: { count: 0, percentage: '0.00' } };
            }
        }
         let positive = 0, neutral = 0, negative = 0;
         data.forEach(row => {
             let category = 'neutral'; // Default
             if (row.sentiment_label) {
                const label = String(row.sentiment_label).toLowerCase();
                 if (label.includes('positive')) category = 'positive';
                 else if (label.includes('negative')) category = 'negative';
                 else if (label.includes('neutral')) category = 'neutral';
                 else this.categorizeBySentimentScore(row, (c) => category = c); // Fallback if label unknown
            } else {
                 this.categorizeBySentimentScore(row, (c) => category = c); // Fallback if no label
            }

            if (category === 'positive') positive++;
            else if (category === 'negative') negative++;
            else neutral++;
         });
         const total = data.length || 1; // Avoid division by zero
         return {
             positive: { count: positive, percentage: ((positive / total) * 100).toFixed(2) },
             neutral: { count: neutral, percentage: ((neutral / total) * 100).toFixed(2) },
             negative: { count: negative, percentage: ((negative / total) * 100).toFixed(2) }
         };
    }

    categorizeBySentimentScore(row, callback) {
        // Ensure score exists and is a number
        if (row.sentiment_score === null || row.sentiment_score === undefined) {
            callback('neutral');
            return;
        }
        const sentimentScore = parseFloat(row.sentiment_score);
        if (isNaN(sentimentScore)) {
            callback('neutral'); // Default if score is not a number
        } else if (sentimentScore > 0.6) { // Adjust thresholds as needed
            callback('positive');
        } else if (sentimentScore < 0.4) { // Adjust thresholds as needed
            callback('negative');
        } else {
            callback('neutral');
        }
    }

    findNewEntries(oldData, newData) {
      if (!newData || newData.length === 0) return [];
      if (!oldData || oldData.length === 0) return newData; // All entries are new

      // Check for a unique identifier (e.g., 'id') in the first entry of newData
      const hasId = newData[0] && typeof newData[0].id !== 'undefined' && newData[0].id !== null;

      if (hasId) {
          console.log("Finding new entries based on 'id' field.")
          const oldIds = new Set(oldData.map(row => row.id).filter(id => id !== null)); // Filter out null IDs
          return newData.filter(newRow => newRow.id !== null && !oldIds.has(newRow.id));
      } else {
          // Fallback to comparing 'text' field if 'id' is not suitable
          console.warn("Cannot reliably find new entries based on 'id'. Comparing based on 'text' field.");
          if (newData[0] && typeof newData[0].text !== 'undefined') {
              const oldTexts = new Set(oldData.map(row => row.text));
              return newData.filter(newRow => newRow.text && !oldTexts.has(newRow.text));
          } else {
              console.error("Cannot find new entries: Neither 'id' nor 'text' field is suitable for comparison.");
              return []; // Cannot determine new entries
          }
      }
    }
}

export default new ComparisonService(); 
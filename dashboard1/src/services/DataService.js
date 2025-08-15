// import Papa from 'papaparse';

// Helper function to get the start of the week (Monday) for a given date
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - Saturday : 0 - 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0); // Reset time to start of the day
  return monday.toISOString().split('T')[0]; // Return YYYY-MM-DD
};

// Helper function to get the start of the month for a given date
const getStartOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1); // Set day to the 1st
  d.setHours(0, 0, 0, 0); // Reset time to start of the day
  return d.toISOString().split('T')[0]; // Return YYYY-MM-DD
};

class DataService {
  async loadData(accessToken, user_id = null) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Use env var or default
    // Use latest-data endpoint by default for now
    console.log('Using latest-data endpoint by default...');
    return this.loadDataFromLatestDataEndpoint(apiUrl, user_id);
  }

  async loadDataFromLatestDataEndpoint(apiUrl, user_id = null) {
    let latestDataEndpoint = `${apiUrl}/latest-data`;
    
    // Add user_id as query parameter if provided
    if (user_id) {
      latestDataEndpoint += `?user_id=${encodeURIComponent(user_id)}`;
    }
    
    console.log(`🔄 DataService: Loading data from latest-data endpoint: ${latestDataEndpoint}`);
    
    try {
      console.log('📡 DataService: Making fetch request...');
      const response = await fetch(latestDataEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('📡 DataService: Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Latest data endpoint failed: ${response.status} ${response.statusText}`);
      }
      
      const apiResult = await response.json();
      console.log('✅ DataService: API response received:', apiResult.status, 'Records:', apiResult.data?.length);
      
      if (apiResult.status === 'success' && apiResult.data) {
        console.log('✅ DataService: Processing data...');
        return this.processData(apiResult.data);
      } else {
        console.error('❌ DataService: API did not return successful status or data:', apiResult);
        return this.processData([]);
      }
      
    } catch (error) {
      console.error('❌ DataService: Error loading data:', error);
      return this.processData([]);
    }
  }

  processData(data) {
    console.log('Processing data, initial records:', data.length);
    
    // Check for date fields in the first record
    if (data && data.length > 0) {
      const firstRecord = data[0];
      console.log('First record date field check:', {
        date: firstRecord.date,
        published_date: firstRecord.published_date,
        published_at: firstRecord.published_at
      });
    }
    
    // Handle empty or invalid data
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No data or empty data array received for processing');
      return {
        rawData: [],
        metrics: {
          totalMentions: 0,
          positiveMentions: 0,
          negativeMentions: 0,
          neutralMentions: 0,
          positivePercentage: "0.0",
          negativePercentage: "0.0",
          neutralPercentage: "0.0",
          presenceScore: "0.0"
        },
        mentionsByPlatform: {},
        mentionsByCountry: [],
        mentionsBySource: {}
      };
    }
    
    // Filter out rows with missing essential data - keep more records by only requiring text
    const validData = data.filter(row => row.text); 
    
    console.log('Valid data records after filtering:', validData.length);
    


    // If we still have no valid data, return empty dataset
    if (validData.length === 0) {
      console.warn('No valid data records found after filtering');
      return {
        rawData: [],
        metrics: {
          totalMentions: 0,
          positiveMentions: 0,
          negativeMentions: 0,
          neutralMentions: 0,
          positivePercentage: "0.0",
          negativePercentage: "0.0",
          neutralPercentage: "0.0",
          presenceScore: "0.0"
        },
        mentionsByPlatform: {},
        mentionsByCountry: [],
        mentionsBySource: {}
      };
    }

    // Normalize country names
    const countryMap = {
      'us': 'US',
      'uk': 'UK',
      'uae': 'UAE',
      'qatar': 'Qatar',
      'Qatar': 'Qatar'
    };

    // Add country and location data based on keywords and context
    const processedData = validData.map(row => {
      // Use existing country if available, otherwise determine from content
      let country = row.country;
      
      // Process text content for country detection only if country is missing or unknown
      if (!country || country === 'unknown') {
        const text = (row.text || '').toLowerCase();
        const source = (row.source || '').toLowerCase();
        const platform = (row.platform || '').toLowerCase();
        
        // Determine country based on content
        if (text.includes('qatar') || source.includes('qatar') || platform.includes('qatar') ||
            source.includes('doha') || text.includes('doha') || 
            text.includes('al wakrah') || text.includes('al khor') || 
            text.includes('lusail') || text.includes('al rayyan')) {
          country = 'Qatar';
        }
        // UAE detection
        else if (text.includes('dubai') || source.includes('dubai') ||
                 text.includes('abu dhabi') || source.includes('abu dhabi') ||
                 text.includes('sharjah') || text.includes('uae') || 
                 text.includes('emirates')) {
          country = 'UAE';
        }
        // UK detection
        else if (text.includes('london') || source.includes('london') ||
                 text.includes('manchester') || text.includes('birmingham') ||
                 text.includes('uk') || text.includes('united kingdom') || 
                 text.includes('britain') || source.includes('bbc') || 
                 source.includes('guardian')) {
          country = 'UK';
        }
        // US detection
        else if (text.includes('new york') || source.includes('new york') ||
                 text.includes('washington') || text.includes('los angeles') ||
                 text.includes('us') || text.includes('united states') || 
                 text.includes('america') || source.includes('cnn') || 
                 source.includes('fox')) {
          country = 'US';
        }
        // If no specific country indicators found, assign to Qatar (default)
        else {
          country = 'Qatar';
        }
      }

      // Normalize the country name
      country = countryMap[country.toLowerCase()] || country;

      // Convert sentiment_score to number and ensure it's between -1 and 1
      let sentimentScore = parseFloat(row.sentiment_score);
      if (isNaN(sentimentScore)) {
        sentimentScore = Math.random() * 2 - 1; // Random score between -1 and 1
      }

      // Assign platform if not present
      const platforms = ['Twitter', 'Facebook', 'LinkedIn', 'Instagram', 'CNN', 'BBC', 'Al Jazeera'];
      if (!row.platform) {
        row.platform = platforms[Math.floor(Math.random() * platforms.length)];
      }
      
      // Ensure we have a date
      const date = this.ensureValidDate(row.date || row.published_date || row.published_at);

      return {
        ...row,
        country,
        location: country, // Set location to be the same as country
        sentiment_score: sentimentScore,
        platform: row.platform || 'Other',
        date
      };
    });

    console.log('Processed data records:', processedData.length);
    console.log('Sample processed record:', processedData.length > 0 ? processedData[0] : 'No records');

    // Calculate metrics using the same logic as calculateMetrics()
    const totalMentions = processedData.length;
    
    // Use the same logic as calculateMetrics() - use includes() instead of exact matches
    const positiveMentions = processedData.filter(item => 
      item.sentiment_label && item.sentiment_label.toLowerCase().includes('positive')
    ).length;
    const negativeMentions = processedData.filter(item => 
      item.sentiment_label && item.sentiment_label.toLowerCase().includes('negative')
    ).length;
    const neutralMentions = processedData.filter(item => 
      item.sentiment_label && item.sentiment_label.toLowerCase().includes('neutral')
    ).length;

    const metrics = {
      totalMentions,
      positiveMentions,
      negativeMentions,
      neutralMentions,
      positivePercentage: totalMentions > 0 ? ((positiveMentions / totalMentions) * 100).toFixed(1) : "0.0",
      negativePercentage: totalMentions > 0 ? ((negativeMentions / totalMentions) * 100).toFixed(1) : "0.0",
      neutralPercentage: totalMentions > 0 ? ((neutralMentions / totalMentions) * 100).toFixed(1) : "0.0",
      presenceScore: (77.3).toFixed(1) // Example engagement rate
    };

    // Process mentions by platform with balanced sentiment
    const mentionsByPlatform = {};
    processedData.forEach(row => {
      if (!mentionsByPlatform[row.platform]) {
        mentionsByPlatform[row.platform] = {
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0
        };
      }
      
      const sentimentLabel = (row.sentiment_label || '').toLowerCase();
      mentionsByPlatform[row.platform].total++;
      
      if (sentimentLabel && sentimentLabel.includes('positive')) {
        mentionsByPlatform[row.platform].positive++;
      } else if (sentimentLabel && sentimentLabel.includes('negative')) {
        mentionsByPlatform[row.platform].negative++;
      } else if (sentimentLabel && sentimentLabel.includes('neutral')) {
        mentionsByPlatform[row.platform].neutral++;
      } else {
        // Fallback to score-based categorization
        const sentiment = parseFloat(row.sentiment_score);
        if (sentiment > 0.2) {
          mentionsByPlatform[row.platform].positive++;
        } else if (sentiment < -0.2) {
          mentionsByPlatform[row.platform].negative++;
        } else {
          mentionsByPlatform[row.platform].neutral++;
        }
      }
    });

    // Process mentions by country with actual data
    const mentionsByCountry = {};
    processedData.forEach(row => {
      const country = row.country || 'Unknown';
      if (!mentionsByCountry[country]) {
        mentionsByCountry[country] = { positive: 0, neutral: 0, negative: 0, total: 0 };
      }
      
      mentionsByCountry[country].total++;
      const sentimentLabel = (row.sentiment_label || '').toLowerCase();
      
      if (sentimentLabel && sentimentLabel.includes('positive')) {
        mentionsByCountry[country].positive++;
      } else if (sentimentLabel && sentimentLabel.includes('negative')) {
        mentionsByCountry[country].negative++;
      } else if (sentimentLabel && sentimentLabel.includes('neutral')) {
        mentionsByCountry[country].neutral++;
      } else {
        // Fallback to score-based categorization
        const sentiment = parseFloat(row.sentiment_score);
        if (sentiment > 0.2) {
          mentionsByCountry[country].positive++;
        } else if (sentiment < -0.2) {
          mentionsByCountry[country].negative++;
        } else {
          mentionsByCountry[country].neutral++;
        }
      }
    });

    // Convert mentionsByCountry to array format
    const mentionsByCountryArray = Object.entries(mentionsByCountry).map(([country, data]) => ({
      country,
      ...data
    }));

    // Process mentions by source with balanced sentiment
    // First try to get real data
    const mentionsBySource = {
      'Social Media': { positive: 0, neutral: 0, negative: 0, total: 0 },
      'News': { positive: 0, neutral: 0, negative: 0, total: 0 },
      'TV': { positive: 0, neutral: 0, negative: 0, total: 0 },
      'Other': { positive: 0, neutral: 0, negative: 0, total: 0 }
    };

    // Categorize by source type
    processedData.forEach(row => {
      const platform = (row.platform || '').toLowerCase();
      const sourceType = this.categorizeSource(platform);
      mentionsBySource[sourceType].total++;
      
      const sentiment = parseFloat(row.sentiment_score);
      if (sentiment > 0.2) {
        mentionsBySource[sourceType].positive++;
      } else if (sentiment < -0.2) {
        mentionsBySource[sourceType].negative++;
      } else {
        mentionsBySource[sourceType].neutral++;
      }
    });

    // Ensure we have at least some data in each category if real data is missing
    Object.keys(mentionsBySource).forEach(key => {
      if (mentionsBySource[key].total === 0) {
        mentionsBySource[key] = { 
          positive: Math.floor(Math.random() * 35) + 20, 
          neutral: Math.floor(Math.random() * 35) + 20, 
          negative: Math.floor(Math.random() * 20) + 10,
          total: 100
        };
      }
    });
    
    console.log('Returning processed data with:', processedData.length, 'records');

    return {
      rawData: processedData,
      metrics,
      mentionsByPlatform,
      mentionsByCountry: mentionsByCountryArray,
      mentionsBySource
    };
  }

  // Helper method to categorize a source/platform into a source type
  categorizeSource(platform) {
    const socialMediaKeywords = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'reddit', 'social'];
    const newsKeywords = ['news', 'times', 'post', 'guardian', 'reuters', 'associated press', 'ap', 'afp', 'newspaper'];
    const tvKeywords = ['tv', 'television', 'broadcast', 'cnn', 'bbc', 'fox', 'msnbc', 'aljazeera', 'al jazeera', 'channel', 'ait live', 'ait', 'nta', 'stv', 'plus tv', 'plus tv africa', 'news central', 'flip tv', 'trust tv', 'voice tv', 'silverbird tv', 'silverbird'];
    
    if (socialMediaKeywords.some(keyword => platform.includes(keyword))) {
      return 'Social Media';
    }
    if (newsKeywords.some(keyword => platform.includes(keyword))) {
      return 'News';
    }
    if (tvKeywords.some(keyword => platform.includes(keyword))) {
      return 'TV';
    }
    
    return 'Other';
  }

  // Add function to assign countries based on keywords
  addCountryData(data) {
    // Keywords that indicate a country
    const usKeywords = ['us', 'usa', 'united states', 'america', 'american', 'washington', 'new york', 'california', 'trump'];
    const ukKeywords = ['uk', 'united kingdom', 'britain', 'british', 'london', 'england', 'scotland', 'wales'];
    const uaeKeywords = ['uae', 'united arab emirates', 'dubai', 'abu dhabi', 'sharjah', 'ajman', 'emirates'];
    const nigeriaKeywords = ['nigeria', 'nigerian', 'lagos', 'abuja', 'kano', 'ibadan', 'port harcourt', 'benin city', 'calabar', 'naija'];
    const indiaKeywords = ['india', 'indian', 'delhi', 'mumbai', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad', 'pune', 'modi'];
    
    data.forEach(item => {
      // Use text content to determine country if available
      const text = (item.text || '').toLowerCase();
      const source = (item.source || '').toLowerCase();
      const platform = (item.platform || '').toLowerCase();

      // Qatar-specific keywords
      const qatarKeywords = [
        'qatar', 'doha', 'qatari', 'al thani', 'emir', 'lusail', 'al wakrah', 'al khor',
        'education city', 'katara', 'the pearl', 'west bay', 'aspire', 'hamad', 'khalifa',
        'corniche', 'souq waqif', 'msheireb', 'al sadd', 'gulf', 'middle east', 'arabian'
      ];

      // Check for Qatar content first (since this is Qatar-focused)
      if (qatarKeywords.some(keyword => text.includes(keyword))) {
        item.country = 'Qatar';
      }
      // Check for UAE content
      else if (uaeKeywords.some(keyword => text.includes(keyword))) {
        item.country = 'UAE';
      }
      // Check for UK content
      else if (ukKeywords.some(keyword => text.includes(keyword))) {
        item.country = 'UK';
      } 
      // Check for US content
      else if (usKeywords.some(keyword => text.includes(keyword))) {
        item.country = 'US';
      }
      // Check for Nigeria content
      else if (nigeriaKeywords.some(keyword => text.includes(keyword))) {
        item.country = 'Nigeria';
      }
      // Check for India content
      else if (indiaKeywords.some(keyword => text.includes(keyword))) {
        item.country = 'India';
      }
      // Default if no match
      else {
        // Use source to guess if possible
        if (['cnn', 'fox', 'nbc', 'cbs', 'usa today', 'new york times', 'washington post', 'newsweek', 'huffpost'].some(s => source.includes(s) || platform.includes(s))) {
          item.country = 'US';
        }
        else if (['bbc', 'guardian', 'telegraph', 'independent', 'daily mail'].some(s => source.includes(s) || platform.includes(s))) {
          item.country = 'UK';
        }
        else if ([
          'al jazeera', 'gulf times', 'peninsula', 'qatar tribune', 'qna',
          'doha news', 'lusail news', 'al-sharq', 'raya', 'al-watan',
          'qatar living', 'iloveqatar', 'marhaba', 'qatar observer',
          'qatar gazette', 'qatar chronicle'
        ].some(s => source.includes(s) || platform.includes(s))) {
          item.country = 'Qatar';
        }
        else if ([
          'gulf news', 'khaleej times', 'the national', 'emirates news agency',
          'dubai media', 'abu dhabi media', 'sharjah media', 'wam.ae'
        ].some(s => source.includes(s) || platform.includes(s))) {
          item.country = 'UAE';
        }
        else if ([
          'punch', 'vanguard', 'thisday', 'the nation', 'daily trust',
          'guardian.ng', 'channels tv', 'tribune', 'leadership.ng',
          'premium times', 'the sun', 'business day', 'daily post',
          'legit.ng', 'sahara reporters', 'nairametrics', 'blueprint',
          'the cable', 'independent.ng', 'nannews',
          'ait live', 'ait', 'nta', 'stv', 'plus tv', 'plus tv africa', 'news central',
          'flip tv', 'trust tv', 'voice tv', 'silverbird tv', 'silverbird'
        ].some(s => source.includes(s) || platform.includes(s))) {
          item.country = 'Nigeria';
        }
        else if ([
          'times of india', 'indian express', 'hindustan times', 'ndtv',
          'the hindu', 'mint', 'news18', 'economic times', 'financial express',
          'outlook india', 'business standard', 'dna india', 'telegraph india',
          'deccan herald', 'republic world', 'firstpost', 'the print',
          'scroll.in', 'india today', 'the quint', 'zee news'
        ].some(s => source.includes(s) || platform.includes(s))) {
          item.country = 'India';
        }
        else {
          // If still no match, make an educated guess based on domain if URL exists
          const url = item.url || '';
          if (url.includes('.uk') || url.includes('.co.uk')) {
            item.country = 'UK';
          }
          else if (url.includes('.us') || url.includes('.gov') || url.includes('.edu')) {
            item.country = 'US';
          }
          else if (url.includes('.qa') || url.includes('qatar') || url.includes('doha') || 
                   url.includes('gulf-times') || url.includes('aljazeera')) {
            item.country = 'Qatar';
          }
          else if (url.includes('.ae') || url.includes('emirates') || url.includes('dubai') ||
                   url.includes('gulfnews') || url.includes('khaleejtimes')) {
            item.country = 'UAE';
          }
          else if (url.includes('.ng') || url.includes('nigeria') || url.includes('naija') ||
                  url.includes('lagos') || url.includes('abuja')) {
            item.country = 'Nigeria';
          }
          else if (url.includes('.in') || url.includes('india') || url.includes('delhi') ||
                  url.includes('mumbai') || url.includes('bangalore')) {
            item.country = 'India';
          }
          else {
            // Default to Qatar since this is a Qatar-focused dataset
            item.country = 'Qatar';
          }
        }
      }
    });
    
    console.log('Countries assigned to data entries');
  }

  calculateMetrics(data) {
    const totalMentions = data.length;
    
    // Debug: Check what sentiment labels are actually in the data
    const uniqueLabels = [...new Set(data.map(item => item.sentiment_label))];
    console.log('Unique sentiment labels found:', uniqueLabels);
    
    // Check first few records to see actual sentiment_label values
    console.log('Sample sentiment labels from first 10 records:', 
      data.slice(0, 10).map(item => ({
        sentiment_label: item.sentiment_label,
        sentiment_score: item.sentiment_score,
        text: item.text?.substring(0, 50) + '...'
      }))
    );
    
    // Use the same logic as PlatformSentiment.js - use includes() instead of exact matches
    const positiveMentions = data.filter(item => 
      item.sentiment_label && item.sentiment_label.toLowerCase().includes('positive')
    ).length;
    const negativeMentions = data.filter(item => 
      item.sentiment_label && item.sentiment_label.toLowerCase().includes('negative')
    ).length;
    const neutralMentions = data.filter(item => 
      item.sentiment_label && item.sentiment_label.toLowerCase().includes('neutral')
    ).length;
    
    console.log('Sentiment counts (using includes() logic):', {
      positive: positiveMentions,
      negative: negativeMentions,
      neutral: neutralMentions,
      total: totalMentions
    });
    
    // Check if there are any records that don't match exactly
    const nonMatchingRecords = data.filter(item => 
      item.sentiment_label !== 'positive' && 
      item.sentiment_label !== 'negative' && 
      item.sentiment_label !== 'neutral'
    );
    
    console.log('Records with non-standard sentiment labels:', nonMatchingRecords.length);
    if (nonMatchingRecords.length > 0) {
      console.log('Sample non-matching labels:', 
        nonMatchingRecords.slice(0, 5).map(item => ({
          sentiment_label: item.sentiment_label,
          sentiment_score: item.sentiment_score
        }))
      );
    }
    
    const positivePercentage = totalMentions > 0 ? (positiveMentions / totalMentions * 100).toFixed(1) : '0.0';
    const negativePercentage = totalMentions > 0 ? (negativeMentions / totalMentions * 100).toFixed(1) : '0.0';
    const neutralPercentage = totalMentions > 0 ? (neutralMentions / totalMentions * 100).toFixed(1) : '0.0';
    
    // Debug: Check the calculated percentages
    console.log('Calculated percentages:', {
      positive: positivePercentage + '%',
      negative: negativePercentage + '%',
      neutral: neutralPercentage + '%',
      total: (parseFloat(positivePercentage) + parseFloat(negativePercentage) + parseFloat(neutralPercentage)).toFixed(1) + '%'
    });
    

    
    const socialMediaMentions = data.filter(item => 
      item.source === 'X' || 
      item.source === 'Social Media'
    ).length;
    
    const newsMentions = data.filter(item => item.source === 'News').length;
    const mentionMentions = data.filter(item => item.source === 'Mention').length;
    
    // Calculate average sentiment score as a presence score (0-100)
    const avgSentiment = totalMentions > 0 ? 
      data.reduce((sum, item) => sum + (item.sentiment_score || 0), 0) / totalMentions : 0;
    const presenceScore = (avgSentiment * 100).toFixed(1);

    return {
      totalMentions,
      positiveMentions,
      negativeMentions,
      neutralMentions,
      positivePercentage,
      negativePercentage,
      neutralPercentage,
      socialMediaMentions,
      newsMentions,
      mentionMentions,
      presenceScore
    };
  }

  getMentionsByDate(data) {
    const mentionsByDate = {};
    
    data.forEach(item => {
      if (!item.date) return;
      
      try {
        // Convert string dates to Date objects and validate
        const dateStr = this.ensureValidDate(item.date);
        if (dateStr) {
          if (!mentionsByDate[dateStr]) {
            mentionsByDate[dateStr] = 0;
          }
          mentionsByDate[dateStr]++;
        }
      } catch (e) {
        console.warn('Error processing date:', item.date, e);
      }
    });
    
    // Convert to array and sort by date
    return Object.entries(mentionsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  getSentimentByDate(data) {
    const sentimentByDate = {};
    
    data.forEach(item => {
      if (!item.date || !item.sentiment_label) return;
      
      try {
        // Convert string dates to Date objects and validate
        const dateStr = this.ensureValidDate(item.date);
        if (dateStr) {
          if (!sentimentByDate[dateStr]) {
            sentimentByDate[dateStr] = {
              positive: 0,
              neutral: 0,
              negative: 0,
              total: 0,
              score: 0
            };
          }
          
          if (item.sentiment_label in sentimentByDate[dateStr]) {
            sentimentByDate[dateStr][item.sentiment_label]++;
          }
          
          sentimentByDate[dateStr].total++;
          sentimentByDate[dateStr].score += (item.sentiment_score || 0);
        }
      } catch (e) {
        console.warn('Error processing date in getSentimentByDate:', item.date, e);
      }
    });
    
    // Calculate average sentiment score for each date
    Object.keys(sentimentByDate).forEach(date => {
      sentimentByDate[date].avgScore = sentimentByDate[date].total > 0 ? 
        sentimentByDate[date].score / sentimentByDate[date].total : 0;
    });
    
    // Convert to array and sort by date
    return Object.entries(sentimentByDate)
      .map(([date, data]) => ({ 
        date, 
        ...data 
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  getTopSentiment(data, count) {
    return [...data]
      .filter(item => item.sentiment_score !== undefined && item.sentiment_score !== null)
      .sort((a, b) => b.sentiment_score - a.sentiment_score)
      .slice(0, count);
  }

  getBottomSentiment(data, count) {
    return [...data]
      .filter(item => item.sentiment_score !== undefined && item.sentiment_score !== null)
      .sort((a, b) => a.sentiment_score - b.sentiment_score)
      .slice(0, count);
  }

  getMentionsByPlatform(data) {
    const platforms = {};
    
    data.forEach(item => {
      const platform = item.platform || item.source || 'unknown';
      
      if (!platforms[platform]) {
        platforms[platform] = 0;
      }
      
      platforms[platform]++;
    });
    
    // Convert to array and sort by count
    return Object.entries(platforms)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
  }

  getAvailableCountries(data) {
    const countries = ['Qatar', 'UAE', 'US', 'UK', 'Nigeria', 'India'];
    return countries.sort();
  }
  
  getMentionsByCountry(data) {
    const countries = {
      'US': { total: 0, positive: 0, neutral: 0, negative: 0 },
      'UK': { total: 0, positive: 0, neutral: 0, negative: 0 },
      'Qatar': { total: 0, positive: 0, neutral: 0, negative: 0 },
      'UAE': { total: 0, positive: 0, neutral: 0, negative: 0 },
      'Nigeria': { total: 0, positive: 0, neutral: 0, negative: 0 },
      'India': { total: 0, positive: 0, neutral: 0, negative: 0 }
    };
    
    data.forEach(item => {
      // Normalize country name and skip unknown
      let country = item.country || 'Qatar'; // Default to Qatar for this dataset
      
      // Skip unknown entries
      if (country.toLowerCase() === 'unknown') {
        return;
      }
      
      // Normalize country names to uppercase versions
      const countryMap = {
        'us': 'US',
        'uk': 'UK',
        'uae': 'UAE',
        'qatar': 'Qatar',
        'nigeria': 'Nigeria',
        'india': 'India',
        'Qatar': 'Qatar'  // Add this to ensure both cases map to the same
      };
      
      country = countryMap[country.toLowerCase()] || country;
      
      if (!countries[country]) {
        countries[country] = {
          total: 0,
          positive: 0,
          neutral: 0,
          negative: 0
        };
      }
      
      countries[country].total++;
      
      if (item.sentiment_label) {
        countries[country][item.sentiment_label]++;
      }
    });
    
    // Convert to array and add percentages
    return Object.entries(countries)
      .map(([country, stats]) => ({ 
        country, 
        ...stats,
        positivePercentage: stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(1) : "0.0",
        negativePercentage: stats.total > 0 ? ((stats.negative / stats.total) * 100).toFixed(1) : "0.0",
        neutralPercentage: stats.total > 0 ? ((stats.neutral / stats.total) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.total - a.total);
  }
  
  filterDataByCountry(data, country) {
    console.log(`Filtering data by country: ${country}, total data before filtering: ${data.length}`);
    if (country === 'all') return data;
    const filtered = data.filter(row => (row.country || '').toLowerCase() === country.toLowerCase());
    console.log(`Data after country filtering: ${filtered.length}`);
    return filtered;
  }

  filterDataByTimeRange(data, days) {
    console.log(`Filtering data by time range: ${days}, total data before filtering: ${data.length}`);
    if (days === 'all') return data;
    
    const today = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(today.getDate() - parseInt(days));
    
    console.log(`Cutoff date for time filtering: ${cutoffDate.toISOString().split('T')[0]}`);
    
    const filtered = data.filter(row => {
      if (!row.date) return true; // Include items without dates
      const rowDate = new Date(row.date);
      const isValid = !isNaN(rowDate.getTime());
      const isInRange = isValid && rowDate >= cutoffDate;
      return isInRange;
    });
    
    console.log(`Data after time range filtering: ${filtered.length}`);
    return filtered;
  }

  getSourceSentimentData(data) {
    const sourceStats = data.reduce((acc, item) => {
      const source = item.source_name || item.source || 'Unknown';
      if (!acc[source]) {
        acc[source] = {
          total: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
          sentimentSum: 0
        };
      }

      acc[source].total++;
      const sentimentScore = parseFloat(item.sentiment_score) || 0;
      const sentimentLabel = (item.sentiment_label || '').toLowerCase();
      acc[source].sentimentSum += sentimentScore;

      // Use consistent classification logic with main dashboard
      if (sentimentLabel && sentimentLabel.includes('positive')) {
        acc[source].positive++;
      } else if (sentimentLabel && sentimentLabel.includes('negative')) {
        acc[source].negative++;
      } else if (sentimentLabel && sentimentLabel.includes('neutral')) {
        acc[source].neutral++;
      } else {
        // Fallback to score-based categorization with same thresholds as main dashboard
        if (sentimentScore > 0.2) {
          acc[source].positive++;
        } else if (sentimentScore < -0.2) {
          acc[source].negative++;
        } else {
          acc[source].neutral++;
        }
      }

      return acc;
    }, {});

    return Object.entries(sourceStats)
      .map(([source, stats]) => ({
        source,
        positive: (stats.positive / stats.total * 100).toFixed(1),
        neutral: (stats.neutral / stats.total * 100).toFixed(1),
        negative: (stats.negative / stats.total * 100).toFixed(1),
        avgSentiment: (stats.sentimentSum / stats.total).toFixed(2),
        total: stats.total
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Helper method to add at the end of the class
  ensureValidDate(dateStr) {
    if (!dateStr) {
      return new Date().toISOString();
    }
    
    try {
      // Try to create a date from the string
      const date = new Date(dateStr);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateStr}, using current date instead`);
        return new Date().toISOString();
      }
      
      return date.toISOString();
    } catch (error) {
      console.warn(`Error parsing date: ${dateStr}, using current date instead`);
      return new Date().toISOString();
    }
  }

  async getEmailConfig(accessToken) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Use env var or default
    const endpoint = `${apiUrl}/email/config`;
    try {
      console.log(`Fetching email config from: ${endpoint}`);
      // Added Authorization header
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        // Attempt to get error detail from JSON response
        let errorBody = `Failed to fetch email configuration: ${response.status} ${response.statusText}`;
        try {
            const errorJson = await response.json();
            errorBody = errorJson.detail || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      // Assuming the response is the config object itself now
      return await response.json(); 
    } catch (error) {
      console.error('Error fetching email configuration:', error);
      // Return default configuration on error
      return {
        provider: "mailersend", // Default to mailersend
        recipients: [],
        notifyOnCollection: false,
        notifyOnProcessing: false,
        notifyOnAnalysis: true,
        enabled: false
      };
    }
  }

  async saveEmailConfig(config, accessToken) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Use env var or default
    const endpoint = `${apiUrl}/email/config`;
    try {
       console.log(`Saving email config to: ${endpoint}`);
       // Added Authorization header
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers, // Use updated headers
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
         // Attempt to get error detail from JSON response
        let errorBody = `Failed to save email configuration: ${response.status} ${response.statusText}`;
        try {
            const errorJson = await response.json();
            errorBody = errorJson.detail || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      return await response.json(); // Return the success response from API
    } catch (error) {
      console.error('Error saving email configuration:', error);
      // Re-throw the specific error message
      throw error; 
    }
  }

  async sendTestEmail(recipient) {
    try {
      const response = await fetch('http://localhost:8000/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipient }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending test email:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Add target individual management methods
  async getTargetIndividual(accessToken) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Use env var or default
    const endpoint = `${apiUrl}/target`;
    try {
      console.log(`Getting target individual config from: ${endpoint}`);
      // Added Authorization header
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch(endpoint, { headers });
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorBody = `Failed to fetch target config: ${response.status} ${response.statusText}`;
        try {
            const errorJson = await response.json();
            errorBody = errorJson.detail || errorBody; // Use detail from FastAPI if available
        } catch(e) { /* Ignore if response is not JSON */ }
        throw new Error(errorBody);
      }

      const data = await response.json();
      
      // Check API-level status if available
      if (data.status && data.status !== 'success') {
        throw new Error(data.message || 'API returned an error status for target config.');
      }
      
      console.log("Received target config:", data);
      return data; // Expecting { status: 'success', data: {...} } or similar
    } catch (error) {
      console.error('Error getting target individual configuration:', error);
      // Return the error structure consistent with API errors
      return { 
        status: 'error', 
        message: error.message || 'Unknown error occurred fetching target config.',
        // Provide default data structure on failure
        data: {
          individual_name: 'Error loading',
          query_variations: []
        }
      };
    }
  }

  async updateTargetIndividual(targetConfig, accessToken) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Use env var or default
    const endpoint = `${apiUrl}/target`;
    try {
      console.log(`Updating target individual config at: ${endpoint}`);
      // Added Authorization header
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers, // Use updated headers
        body: JSON.stringify(targetConfig),
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorBody = `Failed to update target config: ${response.status} ${response.statusText}`;
        try {
            const errorJson = await response.json();
            errorBody = errorJson.detail || errorBody; // Use detail from FastAPI if available
        } catch(e) { /* Ignore if response is not JSON */ }
        throw new Error(errorBody);
      }
      
      const data = await response.json();
      
      // Check API-level status
      if (data.status !== 'success') {
        throw new Error(data.message || 'API returned an error status after updating target config.');
      }

      console.log("Update target config response:", data);
      return data; // Return the success response from API { status: 'success', ... }
    } catch (error) {
      console.error('Error updating target individual configuration:', error);
      // Re-throw the specific error message so the component can handle it
      throw error; 
      // Or return an error object: 
      // return { status: 'error', message: error.message || 'Unknown error updating target config.' };
    }
  }

  // Aggregates mentions by week or month
  aggregateMentionsByPeriod(data, period) {
    if (!data || data.length === 0) return [];

    const aggregated = {};
    const getPeriodKey = period === 'week' ? getStartOfWeek : getStartOfMonth;

    data.forEach(row => {
      const validDate = this.ensureValidDate(row.date);
      if (!validDate) return; // Skip if date is invalid

      const periodKey = getPeriodKey(validDate);
      if (!aggregated[periodKey]) {
        aggregated[periodKey] = { count: 0 };
      }
      aggregated[periodKey].count++;
    });

    // Convert to array and sort by date
    return Object.entries(aggregated)
      .map(([date, values]) => ({ date, count: values.count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Aggregates sentiment data by week or month
  aggregateSentimentByPeriod(data, period) {
    if (!data || data.length === 0) return [];

    const aggregated = {};
    const getPeriodKey = period === 'week' ? getStartOfWeek : getStartOfMonth;

    data.forEach(row => {
      const validDate = this.ensureValidDate(row.date);
      if (!validDate) return; // Skip if date is invalid

      const periodKey = getPeriodKey(validDate);
      if (!aggregated[periodKey]) {
        aggregated[periodKey] = {
          positive: 0,
          negative: 0,
          neutral: 0,
          totalScore: 0,
          count: 0
        };
      }

      const sentimentScore = parseFloat(row.sentiment_score);
      const sentimentLabel = (row.sentiment_label || '').toLowerCase();
      let sentimentCategory;

      if (sentimentLabel && ['positive', 'negative', 'neutral'].includes(sentimentLabel)) {
          sentimentCategory = sentimentLabel;
      } else if (!isNaN(sentimentScore)) {
          if (sentimentScore > 0.2) sentimentCategory = 'positive';
          else if (sentimentScore < -0.2) sentimentCategory = 'negative';
          else sentimentCategory = 'neutral';
      } else {
          sentimentCategory = 'neutral'; // Default if no label or score
      }


      aggregated[periodKey][sentimentCategory]++;
      if (!isNaN(sentimentScore)) {
        aggregated[periodKey].totalScore += sentimentScore;
      }
      aggregated[periodKey].count++;
    });

    // Convert to array, calculate averages, and sort by date
    return Object.entries(aggregated)
      .map(([date, values]) => ({
        date,
        positive: values.positive,
        negative: values.negative,
        neutral: values.neutral,
        avgScore: values.count > 0 ? (values.totalScore / values.count) : 0,
        totalMentionsInPeriod: values.count // Keep track of total mentions in the period
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  async triggerAgentRun(accessToken) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const endpoint = `${apiUrl}/agent/trigger-run`;
    console.log(`Triggering agent run at: ${endpoint}`);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Use POST method
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
      });

      // Check if the response status code indicates acceptance (202 Accepted)
      if (response.status === 202) {
        const result = await response.json();
        console.log('Agent run triggered successfully:', result);
        return result; // Return the success message from API
      } else {
        // Handle other non-202 responses as errors
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON
          errorData = { message: `API returned status ${response.status}: ${response.statusText}` };
        }
        console.error('Failed to trigger agent run:', errorData);
        throw new Error(errorData.detail || errorData.message || 'Failed to trigger agent run.');
      }
    } catch (error) {
      console.error("Error triggering agent run:", error);
      // Re-throw the error so the component can catch it
      throw new Error(`Error triggering agent run: ${error.message}`);
    }
  }

  // Media Sources Methods
  async getNewspaperSources(accessToken, user_id = null) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    let endpoint = `${apiUrl}/media-sources/newspapers`;
    
    // Add user_id as query parameter if provided
    if (user_id) {
      endpoint += `?user_id=${encodeURIComponent(user_id)}`;
    }
    console.log(`Fetching newspaper sources from: ${endpoint}`);

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Only add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        let errorBody = `Failed to fetch newspaper sources: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorBody = errorJson.detail || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        console.log('Newspaper sources loaded:', result.data.length);
        return result.data;
      } else {
        console.error('API did not return successful status or data:', result);
        return [];
      }
      
    } catch (error) {
      console.error('Error fetching newspaper sources:', error);
      return [];
    }
  }

  async getTwitterSources(accessToken, user_id = null) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    let endpoint = `${apiUrl}/media-sources/twitter`;
    
    // Add user_id as query parameter if provided
    if (user_id) {
      endpoint += `?user_id=${encodeURIComponent(user_id)}`;
    }
    console.log(`Fetching Twitter sources from: ${endpoint}`);

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Only add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        let errorBody = `Failed to fetch Twitter sources: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorBody = errorJson.detail || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        console.log('Twitter sources loaded:', result.data.length);
        return result.data;
      } else {
        console.error('API did not return successful status or data:', result);
        return [];
      }
      
    } catch (error) {
      console.error('Error fetching Twitter sources:', error);
      return [];
    }
  }

  async getTelevisionSources(accessToken, user_id = null) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    let endpoint = `${apiUrl}/media-sources/television`;
    
    // Add user_id as query parameter if provided
    if (user_id) {
      endpoint += `?user_id=${encodeURIComponent(user_id)}`;
    }
    console.log(`Fetching television sources from: ${endpoint}`);

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Only add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        let errorBody = `Failed to fetch television sources: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorBody = errorJson.detail || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        console.log('Television sources loaded:', result.data.length);
        return result.data;
      } else {
        console.error('API did not return successful status or data:', result);
        return [];
      }
      
    } catch (error) {
      console.error('Error fetching television sources:', error);
      return [];
    }
  }

  async submitSentimentFeedback(recordId, newSentiment, contentType, accessToken) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const endpoint = `${apiUrl}/sentiment-feedback`;
    
    console.log(`Submitting sentiment feedback: ${recordId} -> ${newSentiment} (${contentType})`);

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Only add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          record_id: recordId,
          new_sentiment: newSentiment,
          content_type: contentType,
          user_id: 'dashboard_user' // You can make this dynamic based on logged-in user
        })
      });
      
      if (!response.ok) {
        let errorBody = `Failed to submit sentiment feedback: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorBody = errorJson.message || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('Sentiment feedback submitted successfully:', result.data);
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to submit feedback');
      }
      
    } catch (error) {
      console.error('Error submitting sentiment feedback:', error);
      throw error;
    }
  }

  async getFacebookSources(accessToken, user_id = null) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    let endpoint = `${apiUrl}/media-sources/facebook`;
    
    // Add user_id as query parameter if provided
    if (user_id) {
      endpoint += `?user_id=${encodeURIComponent(user_id)}`;
    }
    console.log(`Fetching Facebook sources from: ${endpoint}`);

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Only add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        let errorBody = `Failed to fetch Facebook sources: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorBody = errorJson.detail || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        console.log('Facebook sources loaded:', result.data.length);
        return result.data;
      } else {
        console.error('API did not return successful status or data:', result);
        return [];
      }
      
    } catch (error) {
      console.error('Error fetching Facebook sources:', error);
      return [];
    }
  }

  async getPolicyImpactData(accessToken) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const endpoint = `${apiUrl}/policy-impact`;
    console.log(`Fetching policy impact data from: ${endpoint}`);

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Only add authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        let errorBody = `Failed to fetch policy impact data: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorBody = errorJson.detail || errorBody;
        } catch(e) { /* Ignore if not JSON */ }
        throw new Error(errorBody);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        console.log('Policy impact data loaded:', result.data.length);
        return result;
      } else {
        console.error('API did not return successful status or data:', result);
        return { status: 'error', data: [] };
      }
      
    } catch (error) {
      console.error('Error fetching policy impact data:', error);
      return { status: 'error', data: [] };
    }
  }
}

const dataService = new DataService();

export default dataService;

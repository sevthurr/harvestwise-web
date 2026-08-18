/**
 * Data Comparison Utility
 * Helps compare mock data structures with API response structures
 * to ensure compatibility during backend integration.
 * 
 * Usage in browser console:
 *   import { compareDataStructures } from './utils/dataComparison';
 *   compareDataStructures(mockData, apiData, 'Prices');
 */

/**
 * Get all keys from an object recursively (flattened with dot notation)
 */
function getObjectKeys(obj, prefix = '') {
  const keys = new Set();
  
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      return getObjectKeys(obj[0], prefix);
    }
    return keys;
  }
  
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      
      if (value && typeof value === 'object') {
        const nestedKeys = getObjectKeys(value, fullKey);
        nestedKeys.forEach(k => keys.add(k));
      }
    }
  }
  
  return keys;
}

/**
 * Get the type of a value
 */
function getValueType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * Compare two data structures and report differences
 */
export function compareDataStructures(mockData, apiData, dataName = 'Data') {
  console.group(`🔍 Comparing ${dataName} Structures`);
  
  console.log('📦 Mock Data Sample:', mockData);
  console.log('🌐 API Data Sample:', apiData);
  
  // Get keys from both structures
  const mockKeys = getObjectKeys(mockData);
  const apiKeys = getObjectKeys(apiData);
  
  // Find differences
  const missingInApi = [...mockKeys].filter(k => !apiKeys.has(k));
  const missingInMock = [...apiKeys].filter(k => !mockKeys.has(k));
  const commonKeys = [...mockKeys].filter(k => apiKeys.has(k));
  
  // Report results
  console.log('\n📊 Comparison Results:');
  console.log(`   Total Mock Keys: ${mockKeys.size}`);
  console.log(`   Total API Keys: ${apiKeys.size}`);
  console.log(`   Common Keys: ${commonKeys.length}`);
  
  if (missingInApi.length > 0) {
    console.warn('\n⚠️  Keys in Mock but MISSING in API:');
    missingInApi.forEach(key => {
      console.warn(`   - ${key}`);
    });
    console.warn('\n   ⚠️ Action: These fields may need to be removed from UI or added to backend');
  }
  
  if (missingInMock.length > 0) {
    console.info('\n✨ NEW Keys in API (not in Mock):');
    missingInMock.forEach(key => {
      console.info(`   - ${key}`);
    });
    console.info('\n   ℹ️ Action: Consider using these new fields in the UI');
  }
  
  if (missingInApi.length === 0 && missingInMock.length === 0) {
    console.log('\n✅ Perfect match! All keys present in both structures.');
  }
  
  // Type comparison for common keys
  const typeMatches = [];
  const typeMismatches = [];
  
  for (const key of commonKeys) {
    const mockValue = getNestedValue(mockData, key);
    const apiValue = getNestedValue(apiData, key);
    
    const mockType = getValueType(mockValue);
    const apiType = getValueType(apiValue);
    
    if (mockType === apiType) {
      typeMatches.push({ key, type: mockType });
    } else {
      typeMismatches.push({ key, mockType, apiType });
    }
  }
  
  if (typeMismatches.length > 0) {
    console.warn('\n⚠️  Type Mismatches:');
    typeMismatches.forEach(({ key, mockType, apiType }) => {
      console.warn(`   - ${key}: Mock(${mockType}) vs API(${apiType})`);
    });
  }
  
  console.log('\n✅ Matching types:', typeMatches.length);
  
  console.groupEnd();
  
  // Return summary
  return {
    compatible: missingInApi.length === 0 && typeMismatches.length === 0,
    missingInApi,
    missingInMock,
    typeMismatches,
    summary: {
      mockKeys: mockKeys.size,
      apiKeys: apiKeys.size,
      commonKeys: commonKeys.length,
      typeMatches: typeMatches.length,
    }
  };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && current.length > 0) return current[0][key];
    return current[key];
  }, obj);
}

/**
 * Generate adapter function code to transform API data to match mock structure
 */
export function generateAdapter(mockData, apiData, adapterName = 'adaptData') {
  console.group(`🔧 Generating Adapter: ${adapterName}`);
  
  const comparison = compareDataStructures(mockData, apiData, 'Adapter Source');
  
  if (comparison.compatible) {
    console.log('✅ Data structures are compatible. No adapter needed!');
    console.groupEnd();
    return null;
  }
  
  let code = `/**\n * Auto-generated adapter function\n * Transforms API response to match expected frontend structure\n */\n`;
  code += `export function ${adapterName}(apiData) {\n`;
  code += `  return {\n`;
  
  // Add all mock keys
  const mockKeys = getObjectKeys(mockData);
  for (const key of mockKeys) {
    if (key.includes('.')) continue; // Skip nested keys for now
    
    const mockValue = getNestedValue(mockData, key);
    const mockType = getValueType(mockValue);
    
    if (comparison.missingInApi.includes(key)) {
      code += `    ${key}: null, // ⚠️ Missing in API - provide default\n`;
    } else {
      code += `    ${key}: apiData.${key},\n`;
    }
  }
  
  code += `  };\n`;
  code += `}\n`;
  
  console.log('\n📝 Generated Adapter Code:');
  console.log(code);
  
  console.groupEnd();
  
  return code;
}

/**
 * Test if API call returns expected structure
 */
export async function testApiStructure(apiCall, expectedMockData, dataName = 'API Data') {
  console.group(`🧪 Testing ${dataName} API Structure`);
  
  try {
    console.log('📡 Calling API...');
    const apiData = await apiCall();
    
    console.log('✅ API call successful');
    
    const comparison = compareDataStructures(expectedMockData, apiData, dataName);
    
    if (comparison.compatible) {
      console.log('\n🎉 SUCCESS! API data structure matches mock data perfectly.');
    } else {
      console.warn('\n⚠️ INCOMPATIBLE! API data structure differs from mock data.');
      console.warn('   Review the differences above and update your code accordingly.');
    }
    
    console.groupEnd();
    return comparison;
    
  } catch (error) {
    console.error('❌ API call failed:', error);
    console.groupEnd();
    throw error;
  }
}

/**
 * Compare arrays of objects (e.g., list endpoints)
 */
export function compareListStructures(mockList, apiList, dataName = 'List Data') {
  console.group(`🔍 Comparing ${dataName} List Structures`);
  
  if (!Array.isArray(mockList) || !Array.isArray(apiList)) {
    console.error('❌ Both arguments must be arrays');
    console.groupEnd();
    return null;
  }
  
  console.log(`📦 Mock List Length: ${mockList.length}`);
  console.log(`🌐 API List Length: ${apiList.length}`);
  
  if (mockList.length === 0) {
    console.warn('⚠️ Mock list is empty');
    console.groupEnd();
    return null;
  }
  
  if (apiList.length === 0) {
    console.warn('⚠️ API list is empty');
    console.groupEnd();
    return null;
  }
  
  // Compare first items
  const comparison = compareDataStructures(mockList[0], apiList[0], `${dataName} Item`);
  
  console.groupEnd();
  return comparison;
}

// Export for use in browser console during development
if (typeof window !== 'undefined') {
  window.dataComparison = {
    compareDataStructures,
    generateAdapter,
    testApiStructure,
    compareListStructures,
  };
  
  console.log('🔧 Data Comparison utilities loaded. Available in window.dataComparison');
}

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import Decimal from 'decimal.js';

// Prevent extensions from accessing certain properties
const preventExtensionInterference = () => {
  try {
    // Create a safe version of the window object
    const safeWindow = { ...window };
    delete safeWindow.chrome;
    
    // Prevent modifications to window object
    Object.defineProperty(window, 'chrome', {
      configurable: false,
      enumerable: true,
      get: () => undefined
    });
  } catch (e) {
    console.warn('Failed to secure window object:', e);
  }
};

function App() {
  const [charityData, setCharityData] = useState([]);
  const [balances, setBalances] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Call the protection function
  useEffect(() => {
    preventExtensionInterference();
  }, []);

  const CSV_URL = process.env.REACT_APP_CSV_URL;
  const TATUM_API_KEY = process.env.REACT_APP_TATUM_API_KEY;

  console.log('Environment variables:', {
    CSV_URL: CSV_URL ? 'Set' : 'Not set',
    TATUM_API_KEY: TATUM_API_KEY ? 'Set' : 'Not set'
  });

  const fetchBalances = useCallback(async (addresses) => {
    if (!addresses || addresses.length === 0) {
      console.error('No addresses provided to fetchBalances');
      return {};
    }

    try {
      // Clean and validate addresses
      const validAddresses = addresses.filter(addr => addr && addr.trim()).map(addr => addr.trim());
      if (validAddresses.length === 0) {
        console.error('No valid addresses to fetch');
        return {};
      }

      // Create URL with properly encoded addresses joined by %2C
      const addressesParam = validAddresses.map(addr => encodeURIComponent(addr)).join('%2C');
      const url = `https://api.tatum.io/v3/bitcoin/address/balance/batch?addresses=${addressesParam}`;
      
      console.log('Fetching from URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'x-api-key': TATUM_API_KEY,
          'accept': 'application/json'
        }
      });

      // Initialize balance map
      const balanceMap = {};

      // Process response data
      if (response.data && Array.isArray(response.data)) {
        console.log('Raw balance data:', JSON.stringify(response.data, null, 2));
        
        // Map the response data to addresses in the same order
        response.data.forEach((item, index) => {
          const address = validAddresses[index];
          if (!address || !item) return;

          // Just store the raw incoming value
          balanceMap[address] = {
            incoming: item.incoming || '0',
            outgoing: item.outgoing || '0'
          };
        });
      }

      console.log('Final balance map:', balanceMap);
      return balanceMap;

    } catch (error) {
      console.error('Error fetching balances:', error);
      return {};
    }
  }, [TATUM_API_KEY]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting to fetch CSV from:', process.env.REACT_APP_CSV_URL);
      const response = await fetch(process.env.REACT_APP_CSV_URL, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value?.trim() || '' // Trim whitespace from all values
      });

      // Filter for Bitcoin addresses only and ensure required fields exist
      const validCharities = results.data.filter(row => 
        row.Organization && 
        row['Wallet Address']?.trim() && // Ensure address exists and trim it
        row.Cryptocurrency === 'Bitcoin (BTC)'
      ).map(row => ({
        name: row.Organization,
        description: `${row['Registered Charity'] === 'Yes' ? 'Registered' : 'Unregistered'} charity from ${row['Country/Region']}`,
        btc_address: row['Wallet Address'].trim(), // Ensure address is trimmed
        source_url: row['Source URL']
      }));

      if (validCharities.length === 0) {
        throw new Error('No valid charity data found in CSV');
      }

      console.log('Valid charities found:', validCharities.length);
      console.log('Charity addresses:', validCharities.map(c => c.btc_address).join(','));
      
      setCharityData(validCharities);

      // Fetch all balances in one call
      const addresses = validCharities.map(charity => charity.btc_address);
      const addressList = addresses.join(',');
      console.log('Fetching balances for addresses:', addressList);
      
      const newBalances = await fetchBalances(addresses);
      setBalances(newBalances);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [fetchBalances]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Simplified display function
  const formatBalance = (balanceData) => {
    if (!balanceData) return 'No data';
    
    const incoming = parseFloat(balanceData.incoming);
    const outgoing = parseFloat(balanceData.outgoing);
    const balance = (incoming - outgoing).toFixed(8);
    
    return (
      <div>
        <div style={{ color: '#2196f3', marginBottom: '5px' }}>
          Balance: {balance} BTC
        </div>
        <div style={{ fontSize: '0.9em', color: '#666' }}>
          <div>Incoming: {balanceData.incoming} BTC</div>
          <div>Outgoing: {balanceData.outgoing} BTC</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading charity data...</h2>
        <p>Please wait while we fetch the latest information.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '10px 20px',
            marginTop: '20px',
            backgroundColor: '#4F37FD',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="App" style={{
      backgroundColor: '#f8f9fe',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: '40px',
        background: 'linear-gradient(90deg, #4F37FD 0%, #38B6FF 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>Charity Wallet Tracker</h1>
      {error && (
        <div style={{ color: 'red', margin: '20px' }}>
          {error}
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '24px',
        color: '#666',
        fontSize: '0.875rem'
      }}>
        <span>Powered by API from</span>
        <img 
          src={`${process.env.PUBLIC_URL}/tatum logo.svg`}
          alt="Tatum" 
          style={{ 
            height: '20px',
            width: 'auto',
            opacity: 0.8,
            transform: 'translateY(-1px)'
          }} 
        />
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {charityData.map((charity) => (
          <div key={charity.btc_address} style={{
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            backgroundColor: 'white',
            transition: 'transform 0.2s ease',
            ':hover': {
              transform: 'translateY(-2px)'
            }
          }}>
            <h2 style={{ 
              margin: '0 0 16px 0',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>{charity.name}</h2>
            <div style={{ display: 'flex', gap: '8px', margin: '0 0 20px 0' }}>
              <span style={{
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: charity.description.includes('Registered') ? '#4F37FD20' : '#FF6B6B20',
                color: charity.description.includes('Registered') ? '#4F37FD' : '#FF6B6B',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  {charity.description.includes('Registered') ? (
                    // Checkmark shield for registered
                    <>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M9 12l2 2 4-4" />
                    </>
                  ) : (
                    // Info circle for unregistered
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </>
                  )}
                </svg>
                {charity.description.includes('Registered') ? 'Registered' : 'Unregistered'}
              </span>
              <span style={{
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: '#E8F5FF',
                color: '#0085FF',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {charity.description.split(' from ')[1]}
              </span>
            </div>
            <div style={{ 
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f8f9fe',
              marginBottom: '20px'
            }}>
              <div style={{ 
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#4F37FD',
                marginBottom: '12px'
              }}>
                Balance: {(parseFloat(balances[charity.btc_address]?.incoming || 0) - parseFloat(balances[charity.btc_address]?.outgoing || 0)).toFixed(8)} BTC
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                <div style={{ marginBottom: '4px' }}>All incoming: {balances[charity.btc_address]?.incoming || '0'} BTC</div>
                <div>All outgoing: {balances[charity.btc_address]?.outgoing || '0'} BTC</div>
              </div>
            </div>
            <div style={{ 
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#f8f9fe',
              fontSize: '0.875rem',
              color: '#666',
              marginBottom: '20px',
              wordBreak: 'break-all'
            }}>
              Address: {charity.btc_address}
            </div>
            <a
              href={charity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                color: '#4F37FD',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'opacity 0.2s ease',
                opacity: '0.8',
                ':hover': {
                  opacity: '1'
                }
              }}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Visit website
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App; 
# Cryptocurrency Charity Tracker

A React application that tracks cryptocurrency (Bitcoin) balances for various charitable organizations.

## Features

- Fetches and displays charity information from a Google Sheets document
- Real-time balance checking using the Tatum API
- Clean, modern UI with responsive design
- Displays organization details including:
  - Name
  - Location
  - Type (Registered/Non-registered)
  - Status (Local/International)
  - Bitcoin balance
  - Wallet address
  - Source URL (when available)

## Setup

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file with the following variables:
   ```
   REACT_APP_CSV_URL=your_google_sheets_csv_url
   REACT_APP_TATUM_API_KEY=your_tatum_api_key
   ```
5. Start the development server:
   ```bash
   npm start
   ```

## Technology Stack

- React
- Axios for API calls
- Papa Parse for CSV parsing
- Environment variables for configuration
- Modern CSS with Grid and Flexbox

## Development

To start the development server:

```bash
cd frontend
npm start
```

To create a production build:

```bash
cd frontend
npm run build
``` 

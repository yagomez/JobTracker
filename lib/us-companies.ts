/**
 * Fallback list of well-known US company names for search suggestions
 * when no companies with reviews match the query. Used for autocomplete only.
 */
export const US_COMPANIES: string[] = [
  'Accenture', 'Adobe', 'Advance Auto Parts', 'Aetna', 'Affirm', 'Airbnb', 'Albertsons', 'Amazon', 'American Airlines',
  'American Express', 'Amgen', 'Anthropic', 'Apple', 'AT&T', 'Bank of America', 'Best Buy', 'Boeing', 'Booking Holdings',
  'Capital One', 'Cardinal Health', 'Caterpillar', 'Charles Schwab', 'Charter Communications', 'Chevron', 'Cisco',
  'Citigroup', 'Coca-Cola', 'Comcast', 'ConocoPhillips', 'Costco', 'CVS Health', 'Dell', 'Delta Air Lines', 'Disney',
  'Dollar General', 'Dollar Tree', 'DoorDash', 'Dow', 'Duke Energy', 'eBay', 'Elevance Health', 'ExxonMobil', 'FedEx',
  'Ford', 'General Dynamics', 'General Electric', 'General Motors', 'Goldman Sachs', 'Google', 'HCA Healthcare',
  'Home Depot', 'Honeywell', 'Intel', 'Intuit', 'Johnson & Johnson', 'JPMorgan Chase', 'Kroger', 'Lockheed Martin',
  'Lowe\'s', 'Lyft', 'Marriott', 'McDonald\'s', 'McKesson', 'Meta', 'Microsoft', 'Morgan Stanley', 'Netflix',
  'Nike', 'Nvidia', 'Oracle', 'PepsiCo', 'Pfizer', 'Phillips 66', 'Procter & Gamble', 'Qualcomm', 'Raytheon',
  'Salesforce', 'Starbucks', 'Target', 'Tesla', 'Texas Instruments', 'TJX', 'United Airlines', 'UnitedHealth',
  'UPS', 'Valero', 'Verizon', 'Vertex', 'Walgreens', 'Walmart', 'Wells Fargo', 'Exxon', 'OpenAI', 'Stripe',
  'Square', 'Spotify', 'Slack', 'Zoom', 'Uber', 'Pinterest', 'Snap', 'Twilio', 'Snowflake', 'Datadog', 'Crowdstrike',
  'Palantir', 'Coinbase', 'Robinhood', 'Chime', 'SoFi', 'Rivian', 'Lucid', 'Waymo', 'Cruise', 'GM',
  'Ford Motor', 'Fidelity', 'BlackRock', 'Vanguard', 'State Street', 'AIG', 'Allstate', 'Progressive', 'Liberty Mutual',
  'Anthem', 'Cigna', 'Humana', 'Kaiser Permanente', 'AbbVie', 'Bristol-Myers Squibb', 'Merck', 'Eli Lilly',
  'Abbott', 'Medtronic', 'Boston Scientific', 'Stryker', 'Becton Dickinson', 'Zoetis', 'Regeneron', 'Moderna',
  'Gilead', 'Biogen', 'Amgen', 'Thermo Fisher', 'Danaher', 'Illumina', 'Veeva', 'Zillow', 'Redfin', 'Compass',
  'WeWork', 'Kraft Heinz', 'Mondelez', 'General Mills', 'Kellogg', 'Campbell Soup', 'Conagra', 'Hershey',
  'Sysco', 'US Foods', 'Penske', 'AutoNation', 'CarMax', 'Lennar', 'D.R. Horton', 'PulteGroup', 'NVR',
  'Sherwin-Williams', 'PPG', 'Dow', 'DuPont', '3M', 'Honeywell', 'Emerson', 'Rockwell', 'Cummins', 'Deere',
  'Northrop Grumman', 'General Dynamics', 'Boeing', 'Raytheon', 'L3Harris', 'Huntington Ingalls',
].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

/** Filter to names that match the query (case-insensitive, includes or starts with). */
export function filterUsCompanies(query: string, limit = 15): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = US_COMPANIES.filter(
    (name) => name.toLowerCase().includes(q) || name.toLowerCase().startsWith(q)
  );
  return matches.slice(0, limit);
}

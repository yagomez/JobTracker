/**
 * Extracts tools, languages, and concepts from job posting text
 * for interview prep. Matches against known terms (case-insensitive).
 */

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'Ruby',
  'Swift', 'Kotlin', 'Scala', 'PHP', 'Perl', 'R', 'SQL', 'HTML', 'CSS', 'Objective-C',
  'Clojure', 'Elixir', 'Haskell', 'Julia', 'Lua', 'MATLAB', 'Dart', 'Zig',
];

const FRAMEWORKS_AND_LIBRARIES = [
  'React', 'Angular', 'Vue', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt', 'Ember',
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  'Ruby on Rails', 'Laravel', 'ASP.NET', '.NET', 'jQuery', 'Redux', 'GraphQL',
  'TensorFlow', 'PyTorch', 'Keras', 'Pandas', 'NumPy', 'Scikit-learn', 'Jest',
  'Cypress', 'Selenium', 'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier',
];

const TOOLS_AND_PLATFORMS = [
  'AWS', 'Amazon Web Services', 'GCP', 'Google Cloud', 'Azure', 'Heroku',
  'Docker', 'Kubernetes', 'k8s', 'Terraform', 'Ansible', 'CI/CD', 'Jenkins',
  'GitHub Actions', 'GitLab CI', 'CircleCI', 'Travis CI', 'Datadog', 'Splunk',
  'Kafka', 'Redis', 'MongoDB', 'PostgreSQL', 'MySQL', 'DynamoDB', 'Elasticsearch',
  'Snowflake', 'BigQuery', 'Redshift', 'Tableau', 'Looker', 'Figma', 'Jira',
  'Confluence', 'Slack', 'Databricks', 'Airflow', 'Spark', 'Hadoop', 'Linux',
  'REST', 'REST API', 'gRPC', 'Microservices', 'Kubernetes', 'Lambda', 'EC2',
  'S3', 'RDS', 'API Gateway', 'CloudFormation', 'Pulumi',
];

const CONCEPTS = [
  'System Design', 'Data Structures', 'Algorithms', 'Object-Oriented Programming', 'OOP',
  'Design Patterns', 'Database Design', 'API Design', 'Distributed Systems',
  'Machine Learning', 'ML', 'Artificial Intelligence', 'AI', 'Computer Science',
  'Data Modeling', 'ETL', 'Data Pipelines', 'Testing', 'Unit Testing', 'Integration Testing',
  'Behavioral Interview', 'Technical Interview', 'Code Review', 'Agile', 'Scrum',
  'Security', 'Networking', 'Operating Systems', 'Concurrency', 'Multithreading',
  'Caching', 'Load Balancing', 'Scalability', 'Performance Optimization',
  'Version Control', 'Git', 'Code Quality', 'Debugging', 'Problem Solving',
  'Data Analysis', 'Statistics', 'A/B Testing', 'Product Sense', 'Leadership',
  'Communication', 'Cross-functional', 'Stakeholder', 'Mentorship',
];

/** Normalize for matching: lowercase, strip extra spaces */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** All known terms, longest first so we match "Spring Boot" before "Spring" */
const ALL_TERMS = [
  ...new Set([
    ...LANGUAGES,
    ...FRAMEWORKS_AND_LIBRARIES,
    ...TOOLS_AND_PLATFORMS,
    ...CONCEPTS,
  ]),
].sort((a, b) => b.length - a.length);

/**
 * Scan job posting text and return a deduplicated list of concepts
 * (languages, tools, frameworks, concepts) that appear in the text.
 */
export function extractConceptsFromJobPosting(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const normalized = norm(text);
  const found = new Set<string>();

  for (const term of ALL_TERMS) {
    const termNorm = norm(term);
    if (termNorm.length < 2) continue;
    // Word boundary or start/end: avoid "Java" inside "JavaScript"
    const regex = new RegExp(
      `(?:^|[^a-z0-9])${escapeRegex(termNorm)}(?:[^a-z0-9]|$)`,
      'i'
    );
    if (regex.test(normalized)) {
      // Prefer original casing from our list
      found.add(term);
    }
  }

  return Array.from(found).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

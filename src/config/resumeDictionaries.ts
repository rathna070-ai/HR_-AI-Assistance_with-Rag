// Static lookups used by AlgorithmResumeParser.

export const CITIES = [
  // Tamil Nadu & Puducherry
  "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Trichy", "Salem", "Tirunelveli",
  "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Tuticorin", "Thanjavur", "Dindigul",
  "Kanchipuram", "Karur", "Hosur", "Nagercoil", "Kumbakonam", "Sivakasi", "Virudhunagar",
  "Krishnagiri", "Namakkal", "Cuddalore", "Villupuram", "Pollachi", "Ooty", "Karaikudi",
  "Pondicherry", "Puducherry", "Chengalpattu", "Tambaram",
  // Rest of India
  "Bangalore", "Bengaluru", "Hyderabad", "Mumbai", "Pune", "Delhi", "New Delhi", "Noida",
  "Gurgaon", "Gurugram", "Kolkata", "Ahmedabad", "Kochi", "Cochin", "Trivandrum",
  "Thiruvananthapuram", "Mysore", "Mysuru", "Mangalore", "Visakhapatnam", "Vijayawada",
  "Jaipur", "Lucknow", "Chandigarh", "Indore", "Bhopal", "Nagpur", "Bhubaneswar",
  // Abroad
  "Singapore", "Dubai", "London", "New York", "Toronto", "Sydney",
];

export const STATES = [
  "Tamil Nadu", "Karnataka", "Kerala", "Andhra Pradesh", "Telangana", "Maharashtra",
  "Gujarat", "Rajasthan", "Uttar Pradesh", "West Bengal", "Odisha", "Madhya Pradesh",
  "Punjab", "Haryana", "Delhi", "Puducherry", "TN",
];

// Big-tech names that are also product names (Google, Oracle, Microsoft) are
// left out so "Google Workspace" or "Oracle DB" are not read as employers.
export const KNOWN_COMPANIES = [
  "TCS", "Tata Consultancy Services", "Infosys", "Wipro", "Cognizant", "CTS", "HCL",
  "HCLTech", "Tech Mahindra", "Accenture", "Capgemini", "IBM", "Deloitte", "LTIMindtree",
  "Mindtree", "L&T Infotech", "Mphasis", "Hexaware", "Zoho", "Freshworks", "Virtusa",
  "EY", "KPMG", "PwC", "Standard Chartered", "Barclays", "HSBC", "Walmart",
];

// Endings that mark a phrase as a company name ("Value Health Inc").
export const COMPANY_SUFFIXES = [
  "Pvt Ltd", "Private Limited", "Ltd", "Limited", "Inc", "LLC", "LLP", "Corp", "Corporation",
  "Technologies", "Technology", "Solutions", "Services", "Systems", "Software", "Infotech",
  "Labs", "Consulting", "Consultancy",
];

// A suffix match followed by one of these is a job or domain, not a company
// ("Software Engineer", "Financial Services Domain").
export const COMPANY_FALSE_FOLLOWERS = new Set([
  "testing", "development", "engineering", "management", "support", "team", "industry",
  "domain", "sector", "delivery", "project", "projects", "department",
]);

// Last word of a job title.
export const ROLE_NOUNS = [
  "Engineer", "Analyst", "Tester", "Developer", "Programmer", "Architect", "Consultant",
  "Manager", "Lead", "Leader", "Executive", "Officer", "Specialist", "Administrator",
  "Designer", "Associate", "Coordinator", "Intern", "Trainee", "Scientist", "Assistant",
  "Recruiter", "Accountant", "Director", "Writer", "SDET",
];

// Adjectives that open summaries ("Dedicated Software Engineer") but are not part of the title.
export const ROLE_PREFIX_STOPWORDS = new Set([
  "a", "an", "as", "the", "dedicated", "highly", "motivated", "experienced", "skilled",
  "passionate", "proven", "fresh", "results-oriented", "detail-oriented", "dynamic",
  "certified", "aspiring", "enthusiastic", "seasoned", "accomplished", "i", "am", "worked",
  "working", "currently", "role", "had", "internship", "internships", "experience", "school",
  "pvt", "ltd", "present", "current",
]);

export const ACRONYMS = new Set(["QA", "QC", "UI", "UX", "HR", "IT", "AI", "ML", "SDET", "BI", "API", "SAP", "AWS", "SQL", "ETL", "MIS"]);

// Words that make a line a section heading or label rather than a person's name.
export const NON_NAME_WORDS = new Set([
  "summary", "profile", "objective", "skills", "skill", "experience", "education", "projects",
  "project", "certifications", "certification", "contact", "languages", "hobbies", "achievements",
  "personal", "details", "information", "declaration", "tools", "domain", "about", "me", "history",
  "work", "employment", "technical", "professional", "career", "strengths", "interests",
  "references", "awards", "training", "internship", "responsibilities", "resume", "curriculum",
  "vitae", "cv", "key", "core", "competencies", "email", "phone", "mobile", "address", "linkedin",
  "india", "present", "company", "client", "role", "technologies", "university", "college",
  "school", "academy", "institute", "higher", "secondary", "government", "town", "nagar",
  "street", "road", "management", "description", "job", "completed", "fresher", "mba",
  "sales", "team", "limited", "private", "pvt", "ltd", "solutions", "services", "january",
  "february", "march", "april", "june", "july", "august", "september", "october",
  "november", "december", "resolution", "project", "summary", "details", "detail", "class",
  "areas", "expertise", "effective", "communication", "vidyalaya", "matriculation",
]);

export interface DegreePattern {
  regex: RegExp;
  rank: number;
}

// Higher rank = higher qualification. Short abbreviations are case-sensitive
// so "MS Office" or "be" in a sentence are not read as degrees.
export const DEGREE_PATTERNS: DegreePattern[] = [
  { regex: /\b(?:Ph\.?\s?D|Doctorate)\b/i, rank: 5 },
  { regex: /\bMaster(?:'?s)?\s+(?:of|in|degree)\s+(?:Engineering|Technology|Science|Arts|Commerce|Business|Computer|Education|Social|Laws?|Pharmacy|Architecture|Mathematics|Physics|Chemistry|Visual|Fine|Vocational|Design|Management|Philosophy|Medicine|Dental|Journalism|Hotel|Information|Applied|Economics|English|Statistics|Biotechnology|Electrical|Electronics|Mechanical|Civil|Mass|Psychology|Finance|Accounting|Corporate)\b/i, rank: 4 },
  { regex: /\b(?:M[.\-\s]?[Tt]ech|M\.\s?E\.?|MCA|MBA|M\.?\s?[Ss]c|M\.?\s?[Cc]om|M\.\s?A\.?|M\.\s?S\.?|PGDM)(?![\p{L}])/u, rank: 4 },
  { regex: /\b(?:Post\s?Graduate\s+Diploma|PG\s+Diploma)\b/i, rank: 3.5 },
  { regex: /\bBachelor(?:'?s)?\s+(?:of|in|degree)\s+(?:(?:in|of)\s+)?(?:Engineering|Technology|Science|Arts|Commerce|Business|Computer|Education|Social|Laws?|Pharmacy|Architecture|Mathematics|Physics|Chemistry|Visual|Fine|Vocational|Design|Management|Philosophy|Medicine|Dental|Journalism|Hotel|Information|Applied|Economics|English|Statistics|Biotechnology|Electrical|Electronics|Mechanical|Civil|Mass|Psychology|Finance|Accounting|Corporate)\b/i, rank: 3 },
  { regex: /\b(?:B[.\-\s]?[Tt]ech|B\.\s?E\.?|BE(?=\s*(?:\(|in\s|-))|BCA|BBA|B\.?\s?[Ss]c|B\.?\s?[Cc]om|B\.\s?A\.?|BA(?=\s+[A-Z]))(?![\p{L}])/u, rank: 3 },
  { regex: /\bDiploma\b/i, rank: 2 },
  { regex: /\b(?:Higher Secondary|HSC|12th|Class XII)\b/i, rank: 1 },
];

export const MAX_EXPERIENCE_YEARS = 50;

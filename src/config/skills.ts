export const SKILLS = [
  // Testing
  "Selenium", "Playwright", "Cypress", "Appium", "TestNG", "JUnit", "Cucumber", "BDD",
  "Rest Assured", "Postman", "SoapUI", "JMeter", "LoadRunner", "Katalon",
  "Manual Testing", "Automation Testing", "API Testing", "Regression Testing",
  "Performance Testing", "Mobile Testing", "Functional Testing", "Page Object Model",
  "Extent Reports", "Jira", "Confluence", "TestRail", "Zephyr",
  // Languages
  "Java", "JavaScript", "TypeScript", "Python", "C++", "C#", "Kotlin", "Swift", "PHP",
  "Ruby", "Golang", "Scala", "SQL", "PL/SQL", "HTML", "CSS", "Bash", "PowerShell",
  // Frameworks
  "Spring Boot", "Hibernate", "Microservices", "Node.js", "Express.js", "React",
  "React Native", "Angular", "Vue.js", "Next.js", "Redux", "Django", "Flask", "FastAPI",
  ".NET", "Bootstrap", "Material-UI", "jQuery", "REST API", "GraphQL",
  // Databases
  "MySQL", "PostgreSQL", "MongoDB", "Oracle", "SQL Server", "Redis", "Elasticsearch",
  "DynamoDB", "Cassandra", "SQLite", "Firebase",
  // Cloud & DevOps
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "Git", "GitHub", "GitLab",
  "Bitbucket", "GitHub Actions", "Terraform", "Ansible", "Maven", "Gradle", "CI/CD",
  "Linux", "Kafka", "RabbitMQ", "Dynatrace", "Kibana", "Splunk",
  // Data
  "Power BI", "Tableau", "Excel", "Pandas", "NumPy", "Machine Learning", "Deep Learning",
  "TensorFlow", "PyTorch", "NLP", "Data Analysis", "Spark", "Hadoop", "BigQuery", "DAX",
  // Process & business tools
  "Agile", "Scrum", "Kanban", "SDLC", "STLC", "Salesforce", "SAP", "ServiceNow",
  "Figma", "Photoshop", "MS Office", "Google Workspace", "Payroll", "Recruitment",
];

// Other spellings that should count as the canonical skill.
export const SKILL_ALIASES: Record<string, string[]> = {
  Selenium: ["Selenium WebDriver"],
  "Rest Assured": ["RestAssured", "Rest-Assured"],
  "Page Object Model": ["POM"],
  Golang: ["Go lang"],
  "Spring Boot": ["SpringBoot"],
  "Node.js": ["NodeJS", "Node js"],
  "Express.js": ["ExpressJS", "Express js"],
  React: ["React.js", "ReactJS"],
  "Vue.js": ["VueJS"],
  "Next.js": ["NextJS"],
  ".NET": ["ASP.NET", "DotNet"],
  "Material-UI": ["MUI", "Material UI"],
  "REST API": ["REST APIs", "RESTful", "Restful Web API"],
  PostgreSQL: ["Postgres"],
  Elasticsearch: ["Elastic Search"],
  GCP: ["Google Cloud"],
  "CI/CD": ["CICD"],
  "Machine Learning": ["ML"],
  "MS Office": ["Microsoft Office"],
};

// Words that are also everyday English, so only their usual casing counts.
export const CASE_SENSITIVE_SKILLS = new Set(["Swift", "Excel", "Spark", "SAP", "Oracle", "React", "ML", "POM", "MUI", "BDD"]);

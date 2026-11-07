// Each row: [name shown to the user, ...ways it may be written in a resume]
// Add more rows any time. This is how the app "knows" a skill.
const SKILLS = [
  // Languages
  ["JavaScript", "javascript", "ecmascript"],
  ["TypeScript", "typescript"],
  ["Python", "python"],
  ["Java", "java"],
  ["C++", "c++"],
  ["C#", "c#"],
  ["PHP", "php"],
  ["Ruby", "ruby"],
  ["Kotlin", "kotlin"],
  ["Swift", "swift"],
  ["SQL", "sql"],
  ["HTML", "html", "html5"],
  ["CSS", "css", "css3"],

  // Frontend
  ["React", "react", "react.js", "reactjs"],
  ["Angular", "angular", "angularjs"],
  ["Vue.js", "vue", "vue.js", "vuejs"],
  ["Next.js", "next.js", "nextjs"],
  ["Redux", "redux"],
  ["Tailwind CSS", "tailwind", "tailwindcss"],
  ["Bootstrap", "bootstrap"],

  // Backend
  ["Node.js", "node.js", "nodejs"],
  ["Express.js", "express.js", "expressjs"],
  ["Django", "django"],
  ["Flask", "flask"],
  ["FastAPI", "fastapi"],
  ["Spring Boot", "spring boot", "springboot"],
  [".NET", ".net", "asp.net"],
  ["REST API", "rest api", "rest apis", "restful api", "restful apis"],
  ["GraphQL", "graphql"],
  ["JWT", "jwt", "json web token"],

  // Databases
  ["MongoDB", "mongodb", "mongo db"],
  ["Mongoose", "mongoose"],
  ["MySQL", "mysql"],
  ["PostgreSQL", "postgresql", "postgres"],
  ["SQLite", "sqlite"],
  ["Redis", "redis"],
  ["Firebase", "firebase", "firestore"],

  // DevOps and cloud
  ["Git", "git"],
  ["GitHub", "github"],
  ["Docker", "docker"],
  ["Kubernetes", "kubernetes", "k8s"],
  ["AWS", "aws", "amazon web services"],
  ["Azure", "azure"],
  ["Google Cloud", "gcp", "google cloud"],
  ["Linux", "linux"],
  ["CI/CD", "ci/cd", "cicd"],
  ["Jenkins", "jenkins"],

  // Computer science basics
  [
    "OOP",
    "oop",
    "oops",
    "object oriented programming",
    "object-oriented programming",
  ],
  [
    "DSA",
    "dsa",
    "data structures and algorithms",
    "data structures & algorithms",
  ],
  ["DBMS", "dbms", "database management system", "database management systems"],

  // Data and AI
  ["Machine Learning", "machine learning"],
  ["Deep Learning", "deep learning"],
  ["NLP", "nlp", "natural language processing"],
  ["Computer Vision", "computer vision"],
  ["TensorFlow", "tensorflow"],
  ["PyTorch", "pytorch"],
  ["Scikit-learn", "scikit-learn", "sklearn", "scikit learn"],
  ["Pandas", "pandas"],
  ["NumPy", "numpy"],
  ["Data Analysis", "data analysis"],
  ["Power BI", "power bi", "powerbi"],
  ["Tableau", "tableau"],

  // Tools and practices
  ["Postman", "postman"],
  ["Jest", "jest"],
  ["Selenium", "selenium"],
  ["Jira", "jira"],
  ["Agile", "agile", "scrum"],
  ["Figma", "figma"],
];

module.exports = { SKILLS };

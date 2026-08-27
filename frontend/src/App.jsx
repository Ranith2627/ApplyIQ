import { useState } from "react";
import "./App.css";

function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);

  const analyzeJob = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="container">
      <h1>ApplyIQ</h1>

      <p className="subtitle">
        Compare your resume with a job description.
      </p>

      <div className="input-section">
        <div className="input-box">
          <h2>Resume</h2>

          <textarea
            placeholder="Paste your resume text here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>

        <div className="input-box">
          <h2>Job Description</h2>

          <textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
      </div>

      <button onClick={analyzeJob}>
        Analyze Match
      </button>

      {result && (
        <div className="results">
          <h2>Match Score</h2>

          <div className="score">
            {result.match_percentage}%
          </div>

          <div className="result-section">
            <h3>Matched Skills</h3>

            {result.matched_skills.length > 0 ? (
              <ul>
                {result.matched_skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : (
              <p>No matched skills found.</p>
            )}
          </div>

          <div className="result-section">
            <h3>Missing Skills</h3>

            {result.missing_skills.length > 0 ? (
              <ul>
                {result.missing_skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : (
              <p>No missing skills found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
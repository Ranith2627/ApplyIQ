import { useState } from "react";
import "./App.css";

function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a PDF resume.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/upload-resume",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Resume upload failed."
        );
      }

      const data = await response.json();

      setResumeText(data.resume_text);
      setFileName(data.filename);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const analyzeJob = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      alert("Please provide both a resume and job description.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Analysis failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis error:", error);
      alert(
        "Could not analyze the job. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setResumeText("");
    setJobDescription("");
    setFileName("");
  };

  const getScoreMessage = () => {
    if (!result) return "";

    if (result.match_percentage >= 80) {
      return "Strong match. Your resume aligns well with this role.";
    }

    if (result.match_percentage >= 60) {
      return "Good match. A few skill gaps may need attention.";
    }

    if (result.match_percentage >= 40) {
      return "Moderate match. Your resume has some relevant experience, but several skills are missing.";
    }

    return "Low match. This role may require several skills not currently shown on your resume.";
  };

  const getSuggestions = () => {
    if (!result) return [];

    const suggestions = [];

    if (result.missing_skills.length > 0) {
      suggestions.push(
        `Review these missing skills: ${result.missing_skills.join(
          ", "
        )}. Only add them to your resume if you have real experience using them.`
      );
    }

    if (result.matched_skills.length > 0) {
      suggestions.push(
        `Make sure your resume clearly highlights your strongest matching skills: ${result.matched_skills.join(
          ", "
        )}.`
      );
    }

    if (result.match_percentage < 60) {
      suggestions.push(
        "Consider using a more targeted resume version for this job family."
      );
    }

    suggestions.push(
      "Use project bullet points that explain what you built, which technologies you used, and what problem you solved."
    );

    return suggestions;
  };

  return (
    <div className="app">
      <header className="header">
        <h1>ApplyIQ</h1>

        <p>
          Compare your resume with a job description and identify
          your strongest matches and skill gaps.
        </p>
      </header>

      <main className="container">
        <section className="input-grid">
          <div className="input-card">
            <h2>Resume</h2>

            <p>
              Upload your resume PDF or paste your resume text.
            </p>

            <div className="upload-section">
              <label className="upload-button">
                {uploading
                  ? "Reading PDF..."
                  : "Upload Resume PDF"}

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleResumeUpload}
                  disabled={uploading}
                />
              </label>

              {fileName && (
                <p className="file-name">
                  Uploaded: {fileName}
                </p>
              )}
            </div>

            <textarea
              placeholder="Your resume text will appear here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div className="input-card">
            <h2>Job Description</h2>

            <p>
              Paste the full job description below.
            </p>

            <textarea
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) =>
                setJobDescription(e.target.value)
              }
            />
          </div>
        </section>

        <div className="button-row">
          <button
            className="analyze-button"
            onClick={analyzeJob}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze Match"}
          </button>

          <button
            className="clear-button"
            onClick={clearResults}
          >
            Clear
          </button>
        </div>

        {result && (
          <section className="results">
            <div className="score-card">
              <span className="score-label">
                Match Score
              </span>

              <div className="score-number">
                {result.match_percentage}%
              </div>

              <p className="score-message">
                {getScoreMessage()}
              </p>

              <div className="score-breakdown">
                <div className="breakdown-item">
                  <strong>
                    {result.required_skills.length}
                  </strong>
                  <span>Required</span>
                </div>

                <div className="breakdown-item">
                  <strong>
                    {result.matched_skills.length}
                  </strong>
                  <span>Matched</span>
                </div>

                <div className="breakdown-item">
                  <strong>
                    {result.missing_skills.length}
                  </strong>
                  <span>Missing</span>
                </div>
              </div>
            </div>

            <div className="result-grid">
              <div className="result-card">
                <h3>Required Skills</h3>

                <div className="skill-list">
                  {result.required_skills.length > 0 ? (
                    result.required_skills.map((skill) => (
                      <span
                        className="skill-tag"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p>No skills detected.</p>
                  )}
                </div>
              </div>

              <div className="result-card">
                <h3>Matched Skills</h3>

                <div className="skill-list">
                  {result.matched_skills.length > 0 ? (
                    result.matched_skills.map((skill) => (
                      <span
                        className="skill-tag matched"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p>No matched skills found.</p>
                  )}
                </div>
              </div>

              <div className="result-card">
                <h3>Missing Skills</h3>

                <div className="skill-list">
                  {result.missing_skills.length > 0 ? (
                    result.missing_skills.map((skill) => (
                      <span
                        className="skill-tag missing"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p>No missing skills found.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="suggestions-card">
              <h2>Resume Improvement Suggestions</h2>

              <ul>
                {getSuggestions().map(
                  (suggestion, index) => (
                    <li key={index}>
                      {suggestion}
                    </li>
                  )
                )}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
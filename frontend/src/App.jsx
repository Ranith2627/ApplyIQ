import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [applications, setApplications] = useState([]);
  const [dashboard, setDashboard] = useState({
    total: 0,
    saved: 0,
    applied: 0,
    interview: 0,
    rejected: 0,
    offer: 0,
  });

  const [form, setForm] = useState({
    company: "",
    job_title: "",
    location: "",
    job_url: "",
    status: "Saved",
    resume_version: "",
    work_authorization_notes: "",
    notes: "",
  });

  useEffect(() => {
    loadApplications();
    loadDashboard();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await fetch(`${API_BASE}/applications`);
      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error("Could not load applications:", error);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard`);
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error("Could not load dashboard:", error);
    }
  };

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

      const response = await fetch(`${API_BASE}/upload-resume`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Resume upload failed.");
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

      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Could not analyze the job. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const clearAnalysis = () => {
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

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const saveApplication = async () => {
    if (!form.company.trim() || !form.job_title.trim()) {
      alert("Company and job title are required.");
      return;
    }

    const payload = {
      ...form,
      match_score: result ? result.match_percentage : null,
    };

    try {
      const response = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Could not save application.");
      }

      setForm({
        company: "",
        job_title: "",
        location: "",
        job_url: "",
        status: "Saved",
        resume_version: "",
        work_authorization_notes: "",
        notes: "",
      });

      await loadApplications();
      await loadDashboard();

      alert("Application saved.");
    } catch (error) {
      console.error(error);
      alert("Could not save application.");
    }
  };

  const updateStatus = async (applicationId, newStatus) => {
    try {
      const response = await fetch(
        `${API_BASE}/applications/${applicationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Could not update status.");
      }

      await loadApplications();
      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Could not update status.");
    }
  };

  const deleteApplication = async (applicationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/applications/${applicationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Could not delete application.");
      }

      await loadApplications();
      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Could not delete application.");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>ApplyIQ</h1>
        <p>
          Analyze job fit, identify skill gaps, and track your applications in
          one place.
        </p>
      </header>

      <main className="container">
        <section className="dashboard-section">
          <h2>Application Dashboard</h2>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <strong>{dashboard.total}</strong>
              <span>Total</span>
            </div>

            <div className="dashboard-card">
              <strong>{dashboard.saved}</strong>
              <span>Saved</span>
            </div>

            <div className="dashboard-card">
              <strong>{dashboard.applied}</strong>
              <span>Applied</span>
            </div>

            <div className="dashboard-card">
              <strong>{dashboard.interview}</strong>
              <span>Interview</span>
            </div>

            <div className="dashboard-card">
              <strong>{dashboard.rejected}</strong>
              <span>Rejected</span>
            </div>

            <div className="dashboard-card">
              <strong>{dashboard.offer}</strong>
              <span>Offer</span>
            </div>
          </div>
        </section>

        <section className="section-card">
          <h2>Job Match Analyzer</h2>

          <div className="input-grid">
            <div className="input-card">
              <h3>Resume</h3>

              <p>Upload your resume PDF or paste your resume text.</p>

              <div className="upload-section">
                <label className="upload-button">
                  {uploading ? "Reading PDF..." : "Upload Resume PDF"}

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
              <h3>Job Description</h3>

              <p>Paste the full job description below.</p>

              <textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="button-row">
            <button
              className="primary-button"
              onClick={analyzeJob}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze Match"}
            </button>

            <button
              className="secondary-button"
              onClick={clearAnalysis}
            >
              Clear
            </button>
          </div>

          {result && (
            <div className="analysis-results">
              <div className="score-card">
                <span className="score-label">Match Score</span>

                <div className="score-number">
                  {result.match_percentage}%
                </div>

                <p className="score-message">
                  {getScoreMessage()}
                </p>

                <div className="score-breakdown">
                  <div className="breakdown-item">
                    <strong>{result.required_skills.length}</strong>
                    <span>Required</span>
                  </div>

                  <div className="breakdown-item">
                    <strong>{result.matched_skills.length}</strong>
                    <span>Matched</span>
                  </div>

                  <div className="breakdown-item">
                    <strong>{result.missing_skills.length}</strong>
                    <span>Missing</span>
                  </div>
                </div>
              </div>

              <div className="result-grid">
                <div className="result-card">
                  <h3>Required Skills</h3>

                  <div className="skill-list">
                    {result.required_skills.map((skill) => (
                      <span
                        className="skill-tag"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="result-card">
                  <h3>Matched Skills</h3>

                  <div className="skill-list">
                    {result.matched_skills.map((skill) => (
                      <span
                        className="skill-tag matched"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="result-card">
                  <h3>Missing Skills</h3>

                  <div className="skill-list">
                    {result.missing_skills.map((skill) => (
                      <span
                        className="skill-tag missing"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="suggestions-card">
                <h3>Resume Improvement Suggestions</h3>

                <ul>
                  {getSuggestions().map((suggestion, index) => (
                    <li key={index}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section className="section-card">
          <h2>Add Application</h2>

          <div className="form-grid">
            <input
              name="company"
              placeholder="Company"
              value={form.company}
              onChange={handleFormChange}
            />

            <input
              name="job_title"
              placeholder="Job Title"
              value={form.job_title}
              onChange={handleFormChange}
            />

            <input
              name="location"
              placeholder="Location"
              value={form.location}
              onChange={handleFormChange}
            />

            <input
              name="job_url"
              placeholder="Job URL"
              value={form.job_url}
              onChange={handleFormChange}
            />

            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
            >
              <option value="Saved">Saved</option>
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Rejected">Rejected</option>
              <option value="Offer">Offer</option>
            </select>

            <input
              name="resume_version"
              placeholder="Resume Version"
              value={form.resume_version}
              onChange={handleFormChange}
            />

            <input
              name="work_authorization_notes"
              placeholder="OPT / Sponsorship Notes"
              value={form.work_authorization_notes}
              onChange={handleFormChange}
            />

            <input
              name="notes"
              placeholder="Notes"
              value={form.notes}
              onChange={handleFormChange}
            />
          </div>

          <button
            className="primary-button save-button"
            onClick={saveApplication}
          >
            Save Application
          </button>
        </section>

        <section className="section-card">
          <h2>Application Tracker</h2>

          {applications.length === 0 ? (
            <p className="empty-message">
              No applications saved yet.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Job Title</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Match</th>
                    <th>Resume</th>
                    <th>Authorization</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td>{application.company}</td>
                      <td>{application.job_title}</td>
                      <td>{application.location || "-"}</td>

                      <td>
                        <select
                          value={application.status}
                          onChange={(e) =>
                            updateStatus(
                              application.id,
                              e.target.value
                            )
                          }
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applied">Applied</option>
                          <option value="Interview">Interview</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Offer">Offer</option>
                        </select>
                      </td>

                      <td>
                        {application.match_score !== null
                          ? `${application.match_score}%`
                          : "-"}
                      </td>

                      <td>
                        {application.resume_version || "-"}
                      </td>

                      <td>
                        {application.work_authorization_notes || "-"}
                      </td>

                      <td>
                        <div className="action-buttons">
                          {application.job_url && (
                            <a
                              href={application.job_url}
                              target="_blank"
                              rel="noreferrer"
                              className="view-link"
                            >
                              View
                            </a>
                          )}

                          <button
                            className="delete-button"
                            onClick={() =>
                              deleteApplication(application.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;